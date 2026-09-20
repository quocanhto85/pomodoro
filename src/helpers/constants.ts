export const TIMER_MODES = {
  pomodoro: {
    label: "Pomodoro", time: 25 * 60, color: "bg-pomodoro",
    iconColor: "rgb(186, 73, 73)",
    message: "Time to focus!"
  },
  shortbreak: {
    label: "Short Break", time: 5 * 60, color: "bg-shortbreak",
    iconColor: "rgb(56, 133, 138)",
    message: "Time for a break!"
  },
  longbreak: {
    label: "Long Break", time: 15 * 60, color: "bg-longbreak",
    iconColor: "rgb(57, 112, 151)",
    message: "Time for a break!"
  },
} as const;

export const STORAGE_KEYS = {
  COMPLETED_POMODOROS: "completedPomodoros",
  ACTIVE_SUBJECT: "activeSubject",
  SAVED_SUBJECTS: "savedSubjects",
  FOCUS_DURATION: "focusDuration",
  THEME: "theme",
  STOPWATCH_MODE: "stopwatchMode",
} as const;

// One pomodoro is defined as 25 minutes of focus across the whole app.
export const MINUTES_PER_POMODORO = 25;

// `shortLabel` is used where horizontal room is tight (e.g. the login switcher).
export const THEMES = {
  classic: {
    id: "classic",
    label: "Classic Red",
    shortLabel: "Classic",
    description: "The traditional warm Pomodoro look.",
  },
  cyberpunk: {
    id: "cyberpunk",
    label: "Cyberpunk HUD",
    shortLabel: "Cyber",
    description: "Dark neon interface with glowing HUD controls.",
  },
  kitty: {
    id: "kitty",
    label: "Kitty Pink",
    shortLabel: "Kitty",
    description: "Pastel pink wallpaper with kittens, bows and hearts.",
  },
} as const;

export type ThemeId = keyof typeof THEMES;

export const DEFAULT_THEME: ThemeId = "classic";

export const DEFAULT_SUBJECT = "General";

export const POMODOROS_BEFORE_LONG_BREAK = 4;
export const FOCUS_DURATIONS = {
  TRADITIONAL: 25,
  EXTENDED: 50,
} as const;

export type FocusDuration = typeof FOCUS_DURATIONS[keyof typeof FOCUS_DURATIONS];

export type TimerMode = keyof typeof TIMER_MODES;

export const PAUSED_ICON_COLOR = "#808080";