import axios from "axios";

export const pomodoroService = {
  incrementSession: async (subject?: string, count = 1) => {
    try {
      // Resolve the user's IANA timezone here in the browser, where it is always
      // correct. The API runs in UTC on Vercel, so it can't infer this itself.
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await axios.post("/api/pomodoro/incrementPomo", {
        subject: subject || undefined,
        count,
        timeZone,
      });
      return response.data;
    } catch (error) {
      console.error("Error incrementing pomodoro session:", error);
      throw error;
    }
  },

  getDailySessions: async (month: number, year: number) => {
    try {
      const response = await axios.get("/api/pomodoro/sessions", {
        params: {
          month, year
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching pomodoro sessions:", error);
      throw error;
    }
  },

  fetchStats: async (selectedYear: number) => {
    try {
      const response = await axios.post("/api/pomodoro/stats", {
        year: selectedYear
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching pomodoro stats:", error);
      throw error;
    }
  },

  getRanking: async (year: number) => {
    try {
      const response = await axios.get("/api/pomodoro/ranking", {
        params: { year }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching pomodoro ranking:", error);
      throw error;
    }
  },

  getSubjects: async () => {
    try {
      const response = await axios.get("/api/pomodoro/subjects");
      return response.data;
    } catch (error) {
      console.error("Error fetching subjects:", error);
      throw error;
    }
  },

  hideSubjectFromPicker: async (subjectName: string) => {
    try {
      const response = await axios.post("/api/pomodoro/subjects", { subjectName });
      return response.data;
    } catch (error) {
      console.error("Error hiding subject from picker:", error);
      throw error;
    }
  },

  runMigration: async () => {
    try {
      const response = await axios.post("/api/pomodoro/migrate");
      return response.data;
    } catch (error) {
      console.error("Error running migration:", error);
      throw error;
    }
  },
};
