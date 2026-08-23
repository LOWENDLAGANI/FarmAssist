/**
 * ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider that wraps the entire dashboard and
 * exposes theme state + custom theme controls to all child components.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTheme, type Theme, type CustomThemeConfig, THEMES } from "@/hooks/useTheme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  themes: typeof THEMES;
  customTheme: CustomThemeConfig;
  setCustomTheme: (config: CustomThemeConfig) => void;
  applyCustomTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "midnight",
  setTheme: () => {},
  toggleTheme: () => {},
  themes: THEMES,
  customTheme: {
    name: "My Theme",
    background: "#0a0a1a",
    card: "#121225",
    accent: "#8b5cf6",
    foreground: "#f1f5f9",
    muted: "#1e1e3a",
  },
  setCustomTheme: () => {},
  applyCustomTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, toggleTheme, customTheme, setCustomTheme, applyCustomTheme } = useTheme();

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      themes: THEMES,
      customTheme,
      setCustomTheme,
      applyCustomTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
