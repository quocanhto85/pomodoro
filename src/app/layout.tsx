import { Inter } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { ReduxProvider } from "@/providers/ReduxProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { DEFAULT_THEME, STORAGE_KEYS, THEMES } from "@/helpers/constants";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pomodoro",
  description: "A Pomodoro Timer to help you stay focused and boost your productivity",
};

// Applies the saved theme before first paint to avoid a flash of the default theme.
// The known-theme list is derived from THEMES so new themes need no change here.
const themeInitScript = `(function(){var d=${JSON.stringify(DEFAULT_THEME)},k=${JSON.stringify(
  Object.keys(THEMES)
)},t=d;try{var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.THEME
)});if(k.indexOf(s)>-1){t=s}}catch(e){}document.documentElement.setAttribute('data-theme',t);})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="classic" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <ReduxProvider>
              {children}
              <Toaster />
            </ReduxProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}