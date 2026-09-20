import { createHash } from "crypto";
import { Document } from "mongodb";
import { displayNameFromUserId } from "@/helpers/identity";
import { UserRanking } from "@/types/stats";

const DEFAULT_SUBJECT = "General";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RankingFacet {
  dailyTotals: {
    _id: string;
    totalPomodoros: number;
    activeDays: number;
    bestDay: number;
    days: Date[];
  }[];
  monthly: { _id: { userId: string; month: number }; total: number }[];
  subjects: { _id: { userId: string; subject: string }; total: number }[];
}

/**
 * One round trip for the whole leaderboard: per-user day totals (which carry
 * the streak and best-day figures), the monthly series, and each user's
 * subject split.
 *
 * Grouping by (user, day) first is what makes "best day" and "active days"
 * correct — a day split across three subjects is three documents but one day.
 */
export function rankingPipeline(startDate: Date, endDate: Date): Document[] {
  return [
    { $match: { date: { $gte: startDate, $lt: endDate } } },
    {
      $facet: {
        dailyTotals: [
          {
            $group: {
              _id: { userId: "$userId", date: "$date" },
              dayTotal: { $sum: "$completedCount" }
            }
          },
          {
            $group: {
              _id: "$_id.userId",
              totalPomodoros: { $sum: "$dayTotal" },
              activeDays: { $sum: 1 },
              bestDay: { $max: "$dayTotal" },
              days: { $push: "$_id.date" }
            }
          }
        ],
        monthly: [
          {
            $group: {
              _id: { userId: "$userId", month: { $month: "$date" } },
              total: { $sum: "$completedCount" }
            }
          }
        ],
        subjects: [
          {
            $group: {
              _id: {
                userId: "$userId",
                subject: { $ifNull: ["$subject", DEFAULT_SUBJECT] }
              },
              total: { $sum: "$completedCount" }
            }
          },
          { $sort: { total: -1 } }
        ]
      }
    }
  ];
}

/**
 * Longest run of consecutive calendar days in `days`.
 *
 * Sessions are stored at UTC midnight, so "consecutive" is exactly one
 * MS_PER_DAY apart. The $group upstream already collapses duplicates, but the
 * guard keeps the function correct on its own terms.
 */
export function longestStreak(days: Date[]): number {
  if (days.length === 0) return 0;

  const sorted = days.map((day) => day.getTime()).sort((a, b) => a - b);
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap === 0) continue;
    current = gap === MS_PER_DAY ? current + 1 : 1;
    if (current > longest) longest = current;
  }

  return longest;
}

/**
 * A stable, non-reversible handle for a user, used as a React key and to pin
 * their series colour. The raw id is an email for most users and never reaches
 * the client.
 */
function opaqueId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

/** Fold the aggregation's three facets into one row per user. */
export function buildRanking(
  facet: RankingFacet,
  currentUserId: string
): UserRanking[] {
  const monthlyByUser = new Map<string, number[]>();
  for (const entry of facet.monthly ?? []) {
    const series = monthlyByUser.get(entry._id.userId) ?? Array(12).fill(0);
    series[entry._id.month - 1] = entry.total;
    monthlyByUser.set(entry._id.userId, series);
  }

  // `subjects` arrives sorted by total descending, so the first hit per user is
  // their top subject.
  const topSubjectByUser = new Map<string, string>();
  for (const entry of facet.subjects ?? []) {
    if (!topSubjectByUser.has(entry._id.userId)) {
      topSubjectByUser.set(entry._id.userId, entry._id.subject);
    }
  }

  // Sort by raw user id — stable whatever the standings do — so each user keeps
  // the same colour slot as the reader re-ranks the board.
  return [...(facet.dailyTotals ?? [])]
    .sort((a, b) => a._id.localeCompare(b._id))
    .map((user, index) => ({
      id: opaqueId(user._id),
      name: displayNameFromUserId(user._id),
      isCurrentUser: user._id === currentUserId,
      colorIndex: index,
      totalPomodoros: user.totalPomodoros,
      activeDays: user.activeDays,
      bestDay: user.bestDay,
      longestStreak: longestStreak(user.days),
      topSubject: topSubjectByUser.get(user._id) ?? null,
      monthlyPomodoros: monthlyByUser.get(user._id) ?? Array(12).fill(0)
    }));
}
