/**
 * useTheme.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for theme management with localStorage persistence.
 * Supports multiple built-in themes and user-created custom themes.
 * Reads the user's system preference on first visit, then respects
 * their manual selection going forward.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback, useEffect } from "react";

export type Theme = "midnight" | "forest" | "sunset" | "midnight-blue" | "light" | "custom";

export interface CustomThemeConfig {
  name: string;
  background: string;
  card: string;
  accent: string;
  foreground: string;
  muted: string;
}

const STORAGE_KEY = "farmassist-theme";
const CUSTOM_THEME_KEY = "farmassist-custom-theme";

export const THEMES: { id: Theme; name: string; icon: string; description: string }[] = [
  { id: "midnight", name: "Midnight", icon: "🌙", description: "Deep blue dark theme" },
  { id: "forest", name: "Forest", icon: "🌲", description: "Green nature-inspired" },
  { id: "sunset", name: "Sunset", icon: "🌅", description: "Warm orange tones" },
  { id: "midnight-blue", name: "Midnight Blue", icon: "🔵", description: "Indigo dark theme" },
  { id: "light", name: "Light", icon: "☀️", description: "Clean bright theme" },
  { id: "custom", name: "Custom", icon: "🎨", description: "Create your own" },
];

const DEFAULT_CUSTOM_THEME: CustomThemeConfig = {
  name: "My Theme",
  background: "#0a0a1a",
  card: "#121225",
  accent: "#8b5cf6",
  foreground: "#f1f5f9",
  muted: "#1e1e3a",
};

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

function getInitialCustomTheme(): CustomThemeConfig {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_THEME;
  const stored = localStorage.getItem(CUSTOM_THEME_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_CUSTOM_THEME, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CUSTOM_THEME;
    }
  }
  return DEFAULT_CUSTOM_THEME;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0, 0";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function generateCustomThemeStyles(config: CustomThemeConfig): string {
  const bgRgb = hexToRgb(config.background);
  const cardRgb = hexToRgb(config.card);
  const accentRgb = hexToRgb(config.accent);
  const mutedRgb = hexToRgb(config.muted);

  return `
    --background: ${config.background};
    --foreground: ${config.foreground};
    --card: ${config.card};
    --card-foreground: ${config.foreground};
    --muted: ${config.muted};
    --muted-foreground: #94a3b8;
    --border: rgba(${accentRgb}, 0.15);
    --ring: ${config.accent};
    --accent: ${config.accent};
    --accent-foreground: #ffffff;
    --success: #10b981;
    --warning: #f59e0b;
    --info: #3b82f6;
    --color-background: ${config.background};
    --color-foreground: ${config.foreground};
    --color-card: ${config.card};
    --color-card-foreground: ${config.foreground};
    --color-muted: ${config.muted};
    --color-muted-foreground: #94a3b8;
    --color-border: rgba(${accentRgb}, 0.15);
    --color-ring: ${config.accent};
  `;
}

/**
 * Applies the theme to the document by toggling the appropriate class
 * on <html>, updating CSS variables for custom themes, and updating
 * the CSS `color-scheme` meta.
 */
function applyTheme(theme: Theme, customConfig?: CustomThemeConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  // Remove all theme classes
  root.classList.remove("dark", "light", "forest", "sunset", "midnight-blue", "midnight", "custom");

  // Add the appropriate class
  root.classList.add(theme);

  // Apply custom theme CSS variables if custom theme
  if (theme === "custom" && customConfig) {
    const style = document.documentElement.style;
    const bgRgb = hexToRgb(customConfig.background);
    const cardRgb = hexToRgb(customConfig.card);
    const accentRgb = hexToRgb(customConfig.accent);
    const mutedRgb = hexToRgb(customConfig.muted);

    style.setProperty("--background", customConfig.background);
    style.setProperty("--foreground", customConfig.foreground);
    style.setProperty("--card", customConfig.card);
    style.setProperty("--card-foreground", customConfig.foreground);
    style.setProperty("--muted", customConfig.muted);
    style.setProperty("--muted-foreground", "#94a3b8");
    style.setProperty("--border", `rgba(${accentRgb}, 0.15)`);
    style.setProperty("--ring", customConfig.accent);
    style.setProperty("--accent", customConfig.accent);
    style.setProperty("--accent-foreground", "#ffffff");
    style.setProperty("--color-background", customConfig.background);
    style.setProperty("--color-foreground", customConfig.foreground);
    style.setProperty("--color-card", customConfig.card);
    style.setProperty("--color-card-foreground", customConfig.foreground);
    style.setProperty("--color-muted", customConfig.muted);
    style.setProperty("--color-muted-foreground", "#94a3b8");
    style.setProperty("--color-border", `rgba(${accentRgb}, 0.15)`);
    style.setProperty("--color-ring", customConfig.accent);

    // Also set the data attribute for CSS selector targeting
    root.setAttribute("data-custom-bg", customConfig.background);
    root.setAttribute("data-custom-card", customConfig.card);
    root.setAttribute("data-custom-accent", customConfig.accent);
    root.setAttribute("data-custom-accent-rgb", accentRgb);
  } else {
    // Clear custom properties when not using custom theme
    const style = document.documentElement.style;
    style.removeProperty("--background");
    style.removeProperty("--foreground");
    style.removeProperty("--card");
    style.removeProperty("--card-foreground");
    style.removeProperty("--muted");
    style.removeProperty("--muted-foreground");
    style.removeProperty("--border");
    style.removeProperty("--ring");
    style.removeProperty("--accent");
    style.removeProperty("--accent-foreground");
    style.removeProperty("--color-background");
    style.removeProperty("--color-foreground");
    style.removeProperty("--color-card");
    style.removeProperty("--color-card-foreground");
    style.removeProperty("--color-muted");
    style.removeProperty("--color-muted-foreground");
    style.removeProperty("--color-border");
    style.removeProperty("--color-ring");
    root.removeAttribute("data-custom-bg");
    root.removeAttribute("data-custom-card");
    root.removeAttribute("data-custom-accent");
    root.removeAttribute("data-custom-accent-rgb");
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
  const customConfig = getInitialCustomTheme();
  applyTheme(theme, customConfig);
  return theme;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(initTheme);
  const [customTheme, setCustomThemeState] = useState<CustomThemeConfig>(getInitialCustomTheme);

  // Apply theme on mount for client-side
  useEffect(() => {
    applyTheme(theme, customTheme);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const customConfig = getInitialCustomTheme();
    applyTheme(t, customConfig);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const setCustomTheme = useCallback((config: CustomThemeConfig) => {
    setCustomThemeState(config);
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(config));
    // If currently on custom theme, apply immediately
    setThemeState((current) => {
      if (current === "custom") {
        applyTheme("custom", config);
      }
      return current;
    });
  }, []);

  const applyCustomTheme = useCallback(() => {
    applyTheme("custom", customTheme);
    setThemeState("custom");
    localStorage.setItem(STORAGE_KEY, "custom");
  }, [customTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      // Cycle through themes: midnight -> forest -> sunset -> midnight-blue -> light -> custom -> midnight
      const themeOrder: Theme[] = ["midnight", "forest", "sunset", "midnight-blue", "light", "custom"];
      const currentIndex = themeOrder.indexOf(prev);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const next = themeOrder[nextIndex];
      const customConfig = getInitialCustomTheme();
      applyTheme(next, customConfig);
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    themes: THEMES,
    customTheme,
    setCustomTheme,
    applyCustomTheme,
  };
}
