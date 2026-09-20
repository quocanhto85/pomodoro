"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { THEMES, ThemeId } from "@/helpers/constants";

// Compact theme switcher for the login screen. Mirrors the in-app theme control
// (Header) so visitors can pick a look before signing in. Short labels keep the
// row from overflowing the corner it is pinned to on small screens.
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1 rounded-lg border border-white/20 bg-white/10 p-1 backdrop-blur-sm">
      <Palette className="ml-1 mr-0.5 h-4 w-4 shrink-0 text-white/70" aria-hidden="true" />
      {(Object.keys(THEMES) as ThemeId[]).map((id) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-pressed={active}
            title={THEMES[id].description}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-white/30 text-white"
                : "text-white/70 hover:bg-white/20 hover:text-white"
            }`}
          >
            {THEMES[id].shortLabel}
          </button>
        );
      })}
    </div>
  );
}
