/**
 * ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider that wraps the entire dashboard and
 * exposes theme state + toggle to all child components.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTheme, type Theme } from "@/hooks/useTheme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
