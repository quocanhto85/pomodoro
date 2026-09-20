"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Flame, Sparkles, Trophy } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { pomodoroService } from "@/services/api/pomodoro";
import { showErrorToast } from "@/components/common";
import { MINUTES_PER_POMODORO } from "@/helpers/constants";
import {
  RANKING_METRICS,
  RankingMetricId,
  UserRanking,
  getUserColor
} from "@/types/stats";
import { YearPicker } from "./YearPicker";
import { RankingChart } from "./RankingChart";

/** Podium tints. Intrinsic to the medal, so they don't follow the app theme. */
const MEDALS = ["#d9a520", "#9aa6b2", "#c07a3e"];

interface RankedUser extends UserRanking {
  /** Standard competition ranking: a tie for 1st is followed by 3rd. */
  rank: number;
  metricValue: number;
}

function initialOf(name: string): string {
  return [...name][0]?.toUpperCase() ?? "?";
}

export function Ranking() {
  const { theme } = useTheme();
  const isDark = theme === "cyberpunk";

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [metricId, setMetricId] = useState<RankingMetricId>("hours");
  const [users, setUsers] = useState<UserRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRanking = async () => {
      setIsLoading(true);
      try {
        const response = await pomodoroService.getRanking(selectedYear);
        if (!cancelled) setUsers(response.users ?? []);
      } catch (error) {
        console.error("Error fetching ranking:", error);
        if (!cancelled) {
          setUsers([]);
          showErrorToast({
            message: "Unable to load the ranking. Please try again later."
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadRanking();
    // A fast year switch can land its responses out of order; ignore the stale one.
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const metric = RANKING_METRICS.find((m) => m.id === metricId) ?? RANKING_METRICS[0];

  const ranked = useMemo<RankedUser[]>(() => {
    const scored = users
      .map((user) => ({ ...user, metricValue: metric.value(user), rank: 0 }))
      .sort((a, b) => b.metricValue - a.metricValue);

    scored.forEach((user, index) => {
      const previous = scored[index - 1];
      user.rank =
        previous && previous.metricValue === user.metricValue ? previous.rank : index + 1;
    });

    return scored;
  }, [users, metric]);

  const leader = ranked[0];
  const leaderValue = leader?.metricValue ?? 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Loading the leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex justify-center">
        <YearPicker value={selectedYear} onChange={setSelectedYear} />
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Trophy className="w-8 h-8 mx-auto text-gray-400" />
          <p className="text-gray-600 font-medium">
            No pomodoros recorded in {selectedYear} yet.
          </p>
          <p className="text-sm text-gray-500">
            Finish a session and the leaderboard fills itself in.
          </p>
        </div>
      ) : (
        <>
          {/* Each tile names the champion of one metric and re-ranks the board
              below when clicked — the summary and the switcher are one control. */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {RANKING_METRICS.map((candidate) => {
              const values = users.map((user) => candidate.value(user));
              const best = Math.max(...values);
              const winners = users.filter((user) => candidate.value(user) === best);
              const isActive = candidate.id === metricId;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setMetricId(candidate.id)}
                  aria-pressed={isActive}
                  className={`text-left rounded-xl border p-3 transition-all duration-200 ${
                    isActive
                      ? "border-rose-300 bg-rose-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-rose-200 hover:bg-rose-50/40"
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {candidate.label}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="stat-value text-lg sm:text-xl font-bold text-gray-900">
                      {candidate.format(best)}
                    </span>
                    <span className="text-xs text-gray-500">{candidate.unit}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <Crown className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span className="truncate text-xs font-medium text-gray-700">
                      {winners.length === 1 ? winners[0].name : `Tied (${winners.length})`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs sm:text-sm text-gray-500 -mt-1">
            {metric.caption}
          </p>

          <div className="space-y-2 sm:space-y-3">
            {ranked.map((user) => {
              const color = getUserColor(user.colorIndex, isDark);
              const share = leaderValue > 0 ? (user.metricValue / leaderValue) * 100 : 0;
              const gap = leaderValue - user.metricValue;
              const hours = ((user.totalPomodoros * MINUTES_PER_POMODORO) / 60).toFixed(1);

              return (
                <div
                  key={user.id}
                  className={`rounded-xl border p-3 sm:p-4 bg-white transition-shadow ${
                    user.isCurrentUser
                      ? "border-rose-300 shadow-sm"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={
                        user.rank <= 3
                          ? {
                              color: MEDALS[user.rank - 1],
                              backgroundColor: `${MEDALS[user.rank - 1]}24`,
                              boxShadow: `inset 0 0 0 1.5px ${MEDALS[user.rank - 1]}80`
                            }
                          : undefined
                      }
                      aria-label={`Rank ${user.rank}`}
                    >
                      <span className={user.rank <= 3 ? "" : "text-gray-500"}>
                        {user.rank}
                      </span>
                    </span>

                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    >
                      {initialOf(user.name)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate font-semibold text-gray-900">
                          {user.name}
                        </span>
                        {user.rank === 1 && leaderValue > 0 && (
                          <Crown className="w-4 h-4 shrink-0 text-rose-500" aria-label="Leader" />
                        )}
                        {user.isCurrentUser && (
                          <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="stat-value text-base sm:text-lg font-bold text-gray-900">
                        {metric.format(user.metricValue)}
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          {metric.unit}
                        </span>
                      </div>
                      {gap > 0 && (
                        <div className="text-[11px] text-gray-500">
                          {metric.format(gap)} {metric.unit} behind
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-gray-100"
                    role="img"
                    aria-label={`${metric.format(user.metricValue)} ${metric.unit}, ${Math.round(share)}% of the leader`}
                  >
                    <div
                      className="h-full rounded-r-[4px] transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.max(share, user.metricValue > 0 ? 2 : 0)}%`, backgroundColor: color }}
                    />
                  </div>

                  {/* Spacing alone separates these: a dot between them would
                      dangle at the start or end of a line once the row wraps. */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-gray-600">
                    <span>{user.totalPomodoros} pomos</span>
                    <span>{hours} hrs</span>
                    <span>{user.activeDays} active days</span>
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3 h-3 text-gray-400" aria-hidden="true" />
                      {user.longestStreak}-day streak
                    </span>
                    {user.topSubject && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Sparkles className="w-3 h-3 text-gray-400" aria-hidden="true" />
                        {user.topSubject}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {ranked.length === 1 && (
            <p className="text-center text-xs sm:text-sm text-gray-500">
              You&apos;re the only one with sessions in {selectedYear} so far.
            </p>
          )}

          <RankingChart users={users} />
        </>
      )}
    </div>
  );
}
