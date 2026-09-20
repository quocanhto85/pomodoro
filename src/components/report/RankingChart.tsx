import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "@/providers/ThemeProvider";
import { MINUTES_PER_POMODORO } from "@/helpers/constants";
import { UserRanking, getUserColor } from "@/types/stats";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/** Chart ink can't inherit the theme through CSS, so it's picked in JS. */
const CHART_INK = {
  light: { text: "#52514e", grid: "rgba(0, 0, 0, 0.06)", tooltipBg: "rgba(17, 17, 17, 0.92)" },
  dark: { text: "#aac9d6", grid: "rgba(255, 255, 255, 0.10)", tooltipBg: "rgba(7, 13, 26, 0.95)" }
};

interface RankingChartProps {
  users: UserRanking[];
}

/**
 * Focus hours per month, one bar group per month and one colour per user.
 *
 * The leaderboard answers "who is ahead"; this answers "how did they get
 * there" — a slow month, a late start, or a steady climb all look different
 * here and identical in a total.
 */
export function RankingChart({ users }: RankingChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "cyberpunk";
  const ink = isDark ? CHART_INK.dark : CHART_INK.light;

  const data = {
    labels: MONTH_LABELS,
    datasets: users.map((user) => ({
      label: user.name,
      data: user.monthlyPomodoros.map((count) =>
        Number(((count * MINUTES_PER_POMODORO) / 60).toFixed(2))
      ),
      backgroundColor: getUserColor(user.colorIndex, isDark),
      hoverBackgroundColor: getUserColor(user.colorIndex, isDark),
      borderRadius: 4,
      // Leaves a hairline of surface between the bars in a group instead of
      // drawing a border around each one.
      barPercentage: 0.88,
      categoryPercentage: 0.7,
      maxBarThickness: 28
    }))
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        // One series needs no legend box — the heading already names them.
        display: users.length > 1,
        position: "top",
        align: "start",
        labels: {
          usePointStyle: true,
          pointStyle: "rectRounded",
          padding: 14,
          boxWidth: 10,
          color: ink.text,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: ink.tooltipBg,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        bodySpacing: 5,
        usePointStyle: true,
        callbacks: {
          label: (item) => {
            const hours = item.parsed.y ?? 0;
            const pomodoros = Math.round((hours * 60) / MINUTES_PER_POMODORO);
            return ` ${item.dataset.label}: ${hours} hrs (${pomodoros} pomos)`;
          }
        }
      }
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        grid: { display: false },
        border: { color: ink.grid },
        ticks: { color: ink.text, font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: ink.grid },
        border: { display: false },
        title: { display: true, text: "Hours", color: ink.text, font: { size: 11 } },
        ticks: { color: ink.text, font: { size: 11 } }
      }
    },
    animation: { duration: 500, easing: "easeOutQuart" }
  };

  return (
    <div className="bg-white rounded-xl p-3 sm:p-5 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Month by month</h3>
      <p className="text-xs text-gray-500 mb-4">
        Where the totals came from. Hover a month for the exact split.
      </p>
      <div className="relative h-56 sm:h-72">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
