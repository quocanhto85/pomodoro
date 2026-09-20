import { MINUTES_PER_POMODORO } from "@/helpers/constants";

export interface SubjectRecord {
    subject: string;
    pomodoros: number;
    hours: number;
}

export interface DailyRecord {
    date: string;
    pomodoros: number;
    hours: number;
    subjects: SubjectRecord[];
}

export interface PomodoroSession {
    userId: string;
    date: string;
    month: number;
    year: number;
    completedCount: number;
    subject?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MonthlySubjectData {
    [subject: string]: number[]; // 12-element array of pomodoro counts per month
}

export interface StatsData {
    totalPomodoros: number;
    monthlyPomodoros: number[];
    subjects: string[];
    monthlyBySubject: MonthlySubjectData;
}

// Color palette for subject visualization
export const SUBJECT_COLORS = [
    '#4285F4', // Blue
    '#EA4335', // Red
    '#FBBC05', // Amber
    '#34A853', // Green
    '#FF6D01', // Orange
    '#46BDC6', // Teal
    '#7B1FA2', // Purple
    '#E91E63', // Pink
    '#795548', // Brown
    '#607D8B', // Blue Grey
    '#00BCD4', // Cyan
    '#8BC34A', // Light Green
    '#FF5722', // Deep Orange
    '#3F51B5', // Indigo
    '#9C27B0', // Deep Purple
];

export function getSubjectColor(index: number): string {
    return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

export interface UserRanking {
    /** Opaque, stable handle. The raw user id never reaches the client. */
    id: string;
    name: string;
    isCurrentUser: boolean;
    /** Fixed palette slot, assigned server-side and independent of rank. */
    colorIndex: number;
    totalPomodoros: number;
    activeDays: number;
    bestDay: number;
    longestStreak: number;
    topSubject: string | null;
    monthlyPomodoros: number[]; // 12-element array
}

export interface RankingData {
    year: number;
    users: UserRanking[];
}

export type RankingMetricId =
    | "hours"
    | "activeDays"
    | "bestDay"
    | "longestStreak";

export interface RankingMetric {
    id: RankingMetricId;
    label: string;
    /** What this ranking rewards — shown under the switcher. */
    caption: string;
    value: (user: UserRanking) => number;
    format: (value: number) => string;
    unit: string;
}

/**
 * Four ways to be the best, deliberately.
 *
 * Ranking on volume alone quietly punishes whoever joined later or has less
 * free time, so the board also ranks on turning up, on peak effort, and on
 * persistence. Each metric can crown a different person, which is the point.
 */
export const RANKING_METRICS: RankingMetric[] = [
    {
        id: "hours",
        label: "Focus hours",
        caption: "Total time on the clock. Rewards sheer volume.",
        value: (user) => (user.totalPomodoros * MINUTES_PER_POMODORO) / 60,
        format: (value) => value.toFixed(1),
        unit: "hrs",
    },
    {
        id: "activeDays",
        label: "Active days",
        caption: "Days with at least one pomodoro. Rewards turning up.",
        value: (user) => user.activeDays,
        format: (value) => value.toString(),
        unit: "days",
    },
    {
        id: "bestDay",
        label: "Best day",
        caption: "Most pomodoros in a single day. Rewards peak effort.",
        value: (user) => user.bestDay,
        format: (value) => value.toString(),
        unit: "pomos",
    },
    {
        id: "longestStreak",
        label: "Longest streak",
        caption: "Longest run of consecutive active days. Rewards persistence.",
        value: (user) => user.longestStreak,
        format: (value) => value.toString(),
        unit: "days",
    },
];

/**
 * Categorical palette for user series, in fixed slot order (never cycled by
 * rank). Both columns are the same hues stepped for their surface — the report
 * modal is near-white under Classic and Kitty Pink but near-black under
 * Cyberpunk, and canvas colours can't inherit that from CSS.
 *
 * Validated with the data-viz palette checker against all three surfaces
 * (#ffffff, #fff7fb, #070d1a): lightness band, chroma floor, CVD separation and
 * normal-vision separation all pass. Slots 3 and 4 sit under 3:1 on the light
 * surfaces, which the checker permits only alongside visible labels — the
 * leaderboard rows and the chart's direct value labels are that relief.
 */
export const USER_COLORS = {
    light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
    dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
} as const;

export function getUserColor(colorIndex: number, isDark: boolean): string {
    const palette = isDark ? USER_COLORS.dark : USER_COLORS.light;
    return palette[colorIndex % palette.length];
}
