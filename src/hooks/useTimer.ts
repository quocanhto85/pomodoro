"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TimerMode,
  TIMER_MODES,
  POMODOROS_BEFORE_LONG_BREAK,
  FocusDuration,
  STORAGE_KEYS,
} from "@/helpers/constants";
import { Howl, Howler } from "howler";
import { pomodoroService } from "@/services/api/pomodoro";

// Debug logger
const DEBUG = true;
const log = (...args: unknown[]) => {
  if (DEBUG) {
    console.log(`[Timer ${new Date().toISOString()}]`, ...args);
  }
};

/**
 * Creates a Web Worker from a static file in public/.
 * Web Workers run in a separate thread and are NOT throttled by the browser,
 * unlike setInterval which gets throttled to 1s or even 60s in background tabs.
 */
function createTickWorker(): Worker | null {
  try {
    // Dynamic URL prevents Turbopack from trying to statically analyze the Worker
    const url = ["/timer-worker", ".js"].join("");
    return new globalThis.Worker(url);
  } catch {
    return null;
  }
}

export default function useTimer(activeSubject: string, focusDuration: FocusDuration) {
  const [mode, setMode] = useState<TimerMode>("pomodoro");
  const [timeLeft, setTimeLeft] = useState(focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const completedCountPerFocusSession = focusDuration === 50 ? 2 : 1;
  const focusSessionsPerCycle = POMODOROS_BEFORE_LONG_BREAK / completedCountPerFocusSession;


  const endTimeRef = useRef<number | null>(null);
  const bellSoundRef = useRef<Howl | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use a ref for activeSubject so it doesn't affect callback dependencies
  const activeSubjectRef = useRef(activeSubject);
  useEffect(() => {
    activeSubjectRef.current = activeSubject;
  }, [activeSubject]);

  // Initialize state from localStorage
  useEffect(() => {
    const savedPomodoros = localStorage.getItem(STORAGE_KEYS.COMPLETED_POMODOROS);
    if (savedPomodoros) {
      setCompletedPomodoros(parseInt(savedPomodoros));
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLETED_POMODOROS, completedPomodoros.toString());
  }, [completedPomodoros]);

  const initializeBellSound = useCallback(() => {
    if (!bellSoundRef.current) {
      bellSoundRef.current = new Howl({
        src: ["/bell_sound.wav"],
        volume: 1.0,
      });
    }
  }, []);

  /**
   * iOS Safari keeps the Web Audio context suspended until it is resumed inside
   * a user gesture, and ignores later play() calls until then. The bell only
   * rings once the timer ends, long after any tap, so we unlock audio up front
   * when the user presses Start.
   */
  const unlockAudio = useCallback(() => {
    initializeBellSound();
    const ctx = Howler.ctx;
    if (!ctx) return;
    if (ctx.state !== "running") {
      ctx.resume().catch(() => {});
    }
    // Playing a one-sample silent buffer is what actually unlocks older iOS.
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, 22050);
    source.connect(ctx.destination);
    source.start(0);
  }, [initializeBellSound]);

  const stopTicking = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage("stop");
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const cleanupTimer = useCallback(() => {
    stopTicking();
    endTimeRef.current = null;
  }, [stopTicking]);

  const switchMode = useCallback((newMode: TimerMode) => {
    log("Switching mode", { from: mode, to: newMode });
    cleanupTimer();
    setMode(newMode);
    setTimeLeft(newMode === "pomodoro" ? focusDuration * 60 : TIMER_MODES[newMode].time);
    setIsRunning(false);
  }, [mode, cleanupTimer, focusDuration]);

  useEffect(() => {
    if (mode === "pomodoro") {
      cleanupTimer();
      setIsRunning(false);
      setTimeLeft(focusDuration * 60);
    }
  }, [focusDuration, mode, cleanupTimer]);

  const handleTimerComplete = useCallback(async () => {
    log("Timer completed", { mode, completedPomodoros, subject: activeSubjectRef.current });
    
    if (mode === "pomodoro") {
      try {
        await Promise.all([
          pomodoroService.incrementSession(activeSubjectRef.current, completedCountPerFocusSession),
        ]);
      } catch (error) {
        console.error("Failed to update pomodoro session:", error);
      }

      const newCompletedPomodoros = completedPomodoros + completedCountPerFocusSession;
      setCompletedPomodoros(newCompletedPomodoros);

      const nextMode = newCompletedPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0 
        ? "longbreak" 
        : "shortbreak";
      
      switchMode(nextMode);
    } else {
      switchMode("pomodoro");
    }
  }, [mode, completedPomodoros, switchMode, completedCountPerFocusSession]);

  // The core tick function — called by both the worker and the fallback interval
  const tick = useCallback(() => {
    if (!endTimeRef.current) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));

    if (remaining <= 0) {
      cleanupTimer();
      setTimeLeft(0);
      setIsRunning(false);
      initializeBellSound();
      bellSoundRef.current?.play();
      handleTimerComplete();
    } else {
      setTimeLeft(remaining);
    }
  }, [cleanupTimer, initializeBellSound, handleTimerComplete]);

  // Create the Web Worker once on mount, tear it down on unmount
  useEffect(() => {
    const worker = createTickWorker();
    if (worker) {
      workerRef.current = worker;
    }
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Wire the worker's "tick" messages to our tick function
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const onMessage = (e: MessageEvent) => {
      if (e.data === "tick") tick();
    };
    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [tick]);

  // Handle visibility change to sync timer when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRunning && endTimeRef.current) {
        log("Tab became visible, syncing timer");
        tick();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, tick]);

  // Main timer effect — start/stop the tick source
  useEffect(() => {
    if (isRunning) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + (timeLeft * 1000);
        log("Timer started", {
          mode,
          timeLeft,
          subject: activeSubjectRef.current,
          endTime: new Date(endTimeRef.current).toISOString()
        });
      }

      // Start the Web Worker tick
      if (workerRef.current) {
        workerRef.current.postMessage("start");
      }

      // Fallback setInterval in case the Worker couldn't be created
      fallbackIntervalRef.current = setInterval(tick, 1000);

      return () => stopTicking();
    } else {
      endTimeRef.current = null;
    }
  }, [isRunning, tick, stopTicking, mode]);

  const toggleTimer = useCallback(() => {
    if (!isRunning) {
      log("Timer starting", { mode, timeLeft, subject: activeSubjectRef.current });
      unlockAudio();
      setIsRunning(true);
    } else {
      log("Timer paused", { mode, timeLeft });
      
      if (endTimeRef.current) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
      }
      
      cleanupTimer();
      setIsRunning(false);
    }
  }, [isRunning, timeLeft, mode, cleanupTimer, unlockAudio]);

  const handleSkip = useCallback(() => {
    log("Timer skipped", { mode, timeLeft });
    cleanupTimer();
    
    if (mode === "pomodoro") {
      const nextPomodoros = completedPomodoros + completedCountPerFocusSession;
      setCompletedPomodoros(nextPomodoros);
      
      const nextMode = nextPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0 
        ? "longbreak" 
        : "shortbreak";
      
      switchMode(nextMode);
    } else {
      switchMode("pomodoro");
    }
  }, [mode, timeLeft, cleanupTimer, completedPomodoros, switchMode, completedCountPerFocusSession]);

  const resetCompletedPomodoros = useCallback(() => {
    log("Pomodoro session counter reset");
    setCompletedPomodoros(0);
  }, []);

  return {
    mode,
    timeLeft,
    isRunning,
    completedPomodoros,
    focusSessionsPerCycle,
    completedCountPerFocusSession,
    setMode: switchMode,
    toggleTimer,
    handleSkip,
    resetCompletedPomodoros,
  };
}
