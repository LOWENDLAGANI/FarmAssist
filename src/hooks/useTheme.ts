/**
 * useTheme.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for dark/light theme management with localStorage
 * persistence. Reads the user's system preference on first visit,
 * then respects their manual toggle going forward.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "farmassist-theme";

/**
 * Reads the saved theme from localStorage, falling back to the
 * user's system color-scheme preference.
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Applies the theme to the document by toggling the `dark` class
 * on <html> and updating the CSS `color-scheme` meta.
 */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  root.setAttribute("color-scheme", theme);
}

/**
 * Initializes the theme — applies it immediately to prevent flash,
 * then returns the current theme.
 */
function initTheme(): Theme {
  const theme = getInitialTheme();
  applyTheme(theme);
  return theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initTheme);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
