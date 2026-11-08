"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocale } from "next-intl";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/**
 * Runs before hydration (inlined in <head>) so the saved or system theme is applied
 * without a flash. Keep it dependency-free.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})();`;

/** The saved theme, else the system one. Same rule as THEME_INIT_SCRIPT. */
function preferredTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_STORAGE_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage blocked: fall through to the system preference */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  const locale = useLocale();

  // <html> is rendered by the [locale] layout and the server does not know the theme. On a language switch (a client
  // navigation) React re-renders <html> with the server's className, which drops "dark", and the inline init script
  // does not run again. So re-apply the preference after every locale change, in a layout effect: before paint, no flash.
  useLayoutEffect(() => {
    const t = preferredTheme();
    document.documentElement.classList.toggle("dark", t === "dark");
    setThemeState(t);
  }, [locale]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode): theme still applies for this session */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
