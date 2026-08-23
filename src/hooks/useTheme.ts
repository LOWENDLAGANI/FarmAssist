/**
 * useTheme.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for theme management with localStorage persistence.
 * Supports multiple themes: midnight, forest, sunset, midnight-blue, light.
 * Reads the user's system preference on first visit, then respects
 * their manual selection going forward.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";

export type Theme = "midnight" | "forest" | "sunset" | "midnight-blue" | "light";

const STORAGE_KEY = "farmassist-theme";

export const THEMES: { id: Theme; name: string; icon: string; description: string }[] = [
  { id: "midnight", name: "Midnight", icon: "🌙", description: "Deep blue dark theme" },
  { id: "forest", name: "Forest", icon: "🌲", description: "Green nature-inspired" },
  { id: "sunset", name: "Sunset", icon: "🌅", description: "Warm orange tones" },
  { id: "midnight-blue", name: "Midnight Blue", icon: "🔵", description: "Indigo dark theme" },
  { id: "light", name: "Light", icon: "☀️", description: "Clean bright theme" },
];

/**
 * Reads the saved theme from localStorage, falling back to the
 * user's system color-scheme preference.
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "midnight";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && THEMES.some((t) => t.id === stored)) return stored as Theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "midnight"
    : "light";
}

/**
 * Applies the theme to the document by toggling the appropriate class
 * on <html> and updating the CSS `color-scheme` meta.
 */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("dark", "light", "forest", "sunset", "midnight-blue", "midnight");

  // Add the appropriate class
  if (theme === "light") {
    root.classList.add("light");
  } else {
    root.classList.add(theme);
  }

  // Set color-scheme for proper browser UI theming
  const colorScheme = theme === "light" ? "light" : "dark";
  root.setAttribute("color-scheme", colorScheme);
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
      // Cycle through themes: midnight -> forest -> sunset -> midnight-blue -> light -> midnight
      const themeOrder: Theme[] = ["midnight", "forest", "sunset", "midnight-blue", "light"];
      const currentIndex = themeOrder.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const next = themeOrder[nextIndex];
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme, themes: THEMES };
}
