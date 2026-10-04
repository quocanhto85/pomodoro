/**
 * The end-of-session bell.
 *
 * Plays through a single HTML <audio> element rather than the Web Audio API,
 * for two iPhone reasons:
 * - iOS treats Web Audio as "ringer" sound and mutes it whenever the
 *   ring/silent switch is on silent. Media elements play as "media" sound,
 *   which the switch doesn't mute (only the volume buttons do).
 * - iOS only lets an element play without a tap after it has been played once
 *   inside a tap. `unlockBell()` does that on Start, so the element is
 *   allowed to ring 25 minutes later when no tap is involved.
 */

const BELL_SRC = "/bell_sound.mp3";

let bell: HTMLAudioElement | null = null;
let unlocked = false;
let unlockPending = false;

function getBell(): HTMLAudioElement {
  if (!bell) {
    bell = new Audio(BELL_SRC);
    bell.preload = "auto";
  }
  return bell;
}

/**
 * Must be called synchronously inside a tap/click handler. Silently plays and
 * rewinds the bell so iOS marks the element as allowed to play later.
 */
export function unlockBell(): void {
  if (unlocked || unlockPending) return;
  const audio = getBell();
  unlockPending = true;
  audio.muted = true;
  audio
    .play()
    .then(() => {
      unlocked = true;
      // A real playBell() may have taken over while this was in flight.
      if (unlockPending) {
        audio.pause();
        audio.currentTime = 0;
      }
    })
    .catch(() => {})
    .finally(() => {
      if (unlockPending) audio.muted = false;
      unlockPending = false;
    });
}

/** Ring the bell. Rejects (e.g. NotAllowedError) if the browser blocks it. */
export async function playBell(): Promise<void> {
  const audio = getBell();
  unlockPending = false;
  audio.muted = false;
  audio.currentTime = 0;
  await audio.play();
  unlocked = true;
}
