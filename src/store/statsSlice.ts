import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { DailyRecord, PomodoroSession } from "@/types/stats";
import { pomodoroService } from "@/services/api/pomodoro";

interface StatsState {
  dailyStats: DailyRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  dailyStats: [],
  loading: false,
  error: null
};

export const fetchDailyStats = createAsyncThunk(
  "stats/fetchDailyStats", // This is just an action identifier for Redux
  async ({ date, userHandle }: { date: Date; userHandle?: string }) => {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const response = await pomodoroService.getDailySessions(month, year, userHandle);
    
    // Group sessions by date, then aggregate by subject within each date
    const dateMap = new Map<string, {
      pomodoros: number;
      hours: number;
      subjectMap: Map<string, { pomodoros: number; hours: number }>;
    }>();
    
    for (const session of response.data as PomodoroSession[]) {
      const dateKey = new Date(session.date).toISOString().split("T")[0];
      const subject = session.subject || "General";
      const pomodoros = session.completedCount;
      const hours = (pomodoros * 25) / 60;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { pomodoros: 0, hours: 0, subjectMap: new Map() });
      }

      const record = dateMap.get(dateKey)!;
      record.pomodoros += pomodoros;
      record.hours += hours;

      if (pomodoros > 0) {
        const existing = record.subjectMap.get(subject);
        if (existing) {
          existing.pomodoros += pomodoros;
          existing.hours += hours;
        } else {
          record.subjectMap.set(subject, { pomodoros, hours });
        }
      }
    }

    // Convert maps to sorted DailyRecord array
    return Array.from(dateMap.entries())
      .map(([dateKey, { pomodoros, hours, subjectMap }]): DailyRecord => ({
        date: dateKey,
        pomodoros,
        hours,
        subjects: Array.from(subjectMap.entries()).map(([subject, data]) => ({
          subject,
          pomodoros: data.pomodoros,
          hours: data.hours,
        })),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
);

const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailyStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyStats = action.payload;
      })
      .addCase(fetchDailyStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch stats";
      });
  },
});

export default statsSlice.reducer;
