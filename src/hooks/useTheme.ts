/**
 * useTheme.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for dark/light theme management with localStorage
 * persistence. Reads the user's system preference on first visit,
 * then respects their manual toggle going forward.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useState } from "react";

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

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  const mountedRef = useRef(false);

  // Initialize on mount (client-side only)
  useEffect(() => {
    const initial = getInitialTheme();
    if (mountedRef.current) {
      setThemeState(initial);
    }
    applyTheme(initial);
  }, []);

  // Mark as mounted after first effect runs
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return { theme, setTheme, toggleTheme };
}
