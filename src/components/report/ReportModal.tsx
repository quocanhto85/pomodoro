import { Dialog, DialogPanel } from "@headlessui/react";
import { Eye, X } from "lucide-react";
import { MonthlyStats } from "./MonthlyStats";
import { DailyStats } from "./DailyStats";
import { ActivitySummary } from "./ActivitiySummary";
import { Ranking } from "./Ranking";
import { YearPicker } from "./YearPicker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { useState, useEffect } from "react";
import { pomodoroService } from "@/services/api/pomodoro";
import { showErrorToast } from "@/components/common";
import { StatsData, MonthlySubjectData, ViewedUser } from "@/types/stats";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabs = [
  { id: "summary", label: "Summary" },
  { id: "detail", label: "Detail" },
  { id: "ranking", label: "Ranking" }
];

/** Keeps it obvious, on every tab it applies to, whose numbers these are. */
function ViewingBanner({ user, onExit }: { user: ViewedUser; onExit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-gray-700">
        <Eye className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
        <span className="truncate">
          Viewing <span className="font-semibold text-gray-900">{user.name}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={onExit}
        className="shrink-0 text-xs font-medium text-rose-600 hover:underline"
      >
        Back to mine
      </button>
    </div>
  );
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [activeTab, setActiveTab] = useState("summary");
  // Set only by an admin opening someone's report from the Ranking tab; the
  // server re-checks admin rights on every request regardless.
  const [viewedUser, setViewedUser] = useState<ViewedUser | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingStates, setLoadingStates] = useState({
    summary: false,
    detail: false,
    ranking: false
  });
  const [statsData, setStatsData] = useState<StatsData>({
    totalPomodoros: 0,
    monthlyPomodoros: Array(12).fill(0),
    subjects: [],
    monthlyBySubject: {}
  });

  const viewedUserHandle = viewedUser?.id;

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoadingStates(prev => ({ ...prev, summary: true }));
      try {
        const response = await pomodoroService.fetchStats(selectedYear, viewedUserHandle);
        if (cancelled) return;
        setStatsData({
          totalPomodoros: response.totalPomodoros,
          monthlyPomodoros: response.monthlyPomodoros,
          subjects: response.subjects || [],
          monthlyBySubject: (response.monthlyBySubject || {}) as MonthlySubjectData
        });
      } catch (error) {
        if (cancelled) return;
        console.error("Error fetching statistics:", error);
        showErrorToast({
          message: "Unable to load statistics. Please try again later."
        });
      } finally {
        if (!cancelled) setLoadingStates(prev => ({ ...prev, summary: false }));
      }
    };
    if (isOpen) {
      loadData();
    }
    // Switching whose report is shown can land responses out of order; a late
    // one must never paint another person's numbers under the wrong name.
    return () => {
      cancelled = true;
    };
  }, [selectedYear, isOpen, viewedUserHandle]);

  const openUserReport = (user: ViewedUser, year: number) => {
    setViewedUser(user);
    setSelectedYear(year);
    setActiveTab("summary");
  };

  // Every open starts on your own Summary, as it did before tabs were controlled.
  const handleClose = () => {
    onClose();
    setActiveTab("summary");
    setViewedUser(null);
  };

  const viewingBanner = viewedUser && (
    <ViewingBanner user={viewedUser} onExit={() => setViewedUser(null)} />
  );

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <DialogPanel className="report-modal w-full max-w-4xl bg-white rounded-xl shadow-xl h-[90vh] overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <div className="flex-none border-b border-gray-200">
              <div className="flex items-center justify-between px-6">
                <TabsList className="border-none">
                  {tabs.map(tab => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="relative px-4 sm:px-8 py-4 font-medium text-gray-600 hover:text-gray-900 transition-colors data-[state=active]:text-rose-600 before:content-[''] before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0.5 before:bg-rose-600 before:opacity-0 data-[state=active]:before:opacity-100 before:transition-opacity"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <button
                  onClick={handleClose}
                  className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0">
              <TabsContent value="summary" className="mt-0 h-full">
                <div className="space-y-4 sm:space-y-6 relative min-h-0">
                  {loadingStates.summary && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                        <p className="text-gray-600 font-medium">Loading statistics...</p>
                      </div>
                    </div>
                  )}

                  {viewingBanner}

                  <div className="flex justify-center mb-4 sm:mb-6">
                    <YearPicker value={selectedYear} onChange={setSelectedYear} />
                  </div>

                  <ActivitySummary totalPomodoros={statsData.totalPomodoros} />
                  <MonthlyStats
                    monthlyPomodoros={statsData.monthlyPomodoros}
                    subjects={statsData.subjects}
                    monthlyBySubject={statsData.monthlyBySubject}
                  />
                </div>
              </TabsContent>

              <TabsContent value="detail" className="space-y-4">
                {viewingBanner}
                <Provider store={store}>
                  <DailyStats userHandle={viewedUserHandle} />
                </Provider>
              </TabsContent>

              <TabsContent value="ranking" className="mt-0">
                <Ranking onViewUser={openUserReport} />
              </TabsContent>
            </div>
          </Tabs>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
