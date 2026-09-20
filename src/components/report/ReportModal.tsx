import { Dialog, DialogPanel } from "@headlessui/react";
import { X } from "lucide-react";
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
import { StatsData, MonthlySubjectData } from "@/types/stats";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tabs = [
  { id: "summary", label: "Summary" },
  { id: "detail", label: "Detail" },
  { id: "ranking", label: "Ranking" }
];

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
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

  useEffect(() => {
    const loadData = async () => {
      setLoadingStates(prev => ({ ...prev, summary: true }));
      try {
        const response = await pomodoroService.fetchStats(selectedYear);
        setStatsData({
          totalPomodoros: response.totalPomodoros,
          monthlyPomodoros: response.monthlyPomodoros,
          subjects: response.subjects || [],
          monthlyBySubject: (response.monthlyBySubject || {}) as MonthlySubjectData
        });
      } catch (error) {
        console.error("Error fetching statistics:", error);
        showErrorToast({
          message: "Unable to load statistics. Please try again later."
        });
      } finally {
        setLoadingStates(prev => ({ ...prev, summary: false }));
      }
    };
    if (isOpen) {
      loadData();
    }
  }, [selectedYear, isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <DialogPanel className="report-modal w-full max-w-4xl bg-white rounded-xl shadow-xl h-[90vh] overflow-hidden flex flex-col">
          <Tabs defaultValue="summary" className="w-full h-full flex flex-col">
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
                  onClick={onClose}
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

              <TabsContent value="detail">
                <Provider store={store}>
                  <DailyStats />
                </Provider>
              </TabsContent>

              <TabsContent value="ranking" className="mt-0">
                <Ranking />
              </TabsContent>
            </div>
          </Tabs>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
