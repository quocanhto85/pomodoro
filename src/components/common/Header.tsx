"use client";

import Button from "./Button";
import { ChartLine, Check, Settings, User, LogOut, Palette } from "lucide-react";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ReportModal } from "@/components/report/ReportModal";
import { useTheme } from "@/providers/ThemeProvider";
import { THEMES, ThemeId } from "@/helpers/constants";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@radix-ui/react-dropdown-menu";

export default function Header() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <header className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 flex justify-between items-center gap-2">
      <div className="flex items-center gap-2 text-white min-w-0">
        <Check className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
        <span className="text-base sm:text-2xl font-bold truncate">
          Pomodoro<span className="hidden sm:inline"> - Boost your productivity</span>
        </span>
      </div>
      <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <Button className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 rounded-lg text-white transition-all duration-300 ease-in-out hover:bg-white/20 hover:shadow-lg hover:scale-105 active:scale-95 backdrop-blur-lg" onClick={() => setIsReportModalOpen(true)}>
          <ChartLine className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:rotate-6" />
          <span className="hidden sm:inline transition-transform duration-300 group-hover:translate-x-0.5">Report</span>
        </Button>
        <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DropdownMenuTrigger asChild>
            <Button className={`group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-white transition-all duration-300 ease-in-out backdrop-blur-lg
                ${isSettingsOpen
                  ? "bg-white/20 shadow-lg scale-105"
                  : "bg-white/10 hover:bg-white/15 hover:shadow-lg hover:scale-105"}
                active:scale-95`}>
              <Settings className={`w-5 h-5 shrink-0 transition-all duration-300 ease-in-out
                  ${isSettingsOpen
                    ? "rotate-180 scale-110"
                    : "group-hover:rotate-90 group-hover:scale-110"}`} />
              <span className={`hidden sm:inline transition-transform duration-300 ${isSettingsOpen ? "translate-x-0.5" : "group-hover:translate-x-0.5"}`}>Setting</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
          <DropdownMenuContent
            className="app-menu z-50 w-56 mt-2 p-1 rounded-lg bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-lg
              data-[state=open]:animate-in data-[state=closed]:animate-out
              data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
              data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
              data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
              data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2
              duration-300 ease-in-out"
            align="end"
            sideOffset={5}
          >
            <div className="flex items-center gap-2 px-3 py-2 text-white">
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 shrink-0 rounded-full"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <User className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {session?.user?.name ?? "Account"}
                </p>
                {session?.user?.email && (
                  <p className="truncate text-xs text-white/60">{session.user.email}</p>
                )}
              </div>
            </div>
            <DropdownMenuSeparator className="my-1 h-px bg-white/20" />
            <div className="flex items-center gap-2 px-3 py-1.5 text-white/70 text-xs font-semibold uppercase tracking-wider">
              <Palette className="h-3.5 w-3.5" />
              <span>Theme</span>
            </div>
            {(Object.keys(THEMES) as ThemeId[]).map((id) => (
              <DropdownMenuItem
                key={id}
                onClick={() => setTheme(id)}
                className="group flex items-center px-3 py-2 text-white rounded-md cursor-pointer outline-none
                  transition-all duration-200 ease-in-out hover:bg-white/20 focus:bg-white/20"
              >
                <span className="flex-1 transition-transform duration-200 group-hover:translate-x-0.5">
                  {THEMES[id].label}
                </span>
                {theme === id && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1 h-px bg-white/20" />
            <DropdownMenuItem
              className="group flex items-center px-3 py-2 text-white rounded-md cursor-pointer outline-none
                transition-all duration-200 ease-in-out hover:bg-white/20 focus:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </header>
  );
}