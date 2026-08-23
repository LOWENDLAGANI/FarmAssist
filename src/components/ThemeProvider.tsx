/**
 * ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider that wraps the entire dashboard and
 * exposes theme state + setTheme + themes list to all child components.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTheme, type Theme, THEMES } from "@/hooks/useTheme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  themes: typeof THEMES;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "midnight",
  setTheme: () => {},
  toggleTheme: () => {},
  themes: THEMES,
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
