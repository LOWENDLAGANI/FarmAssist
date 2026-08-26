/**
 * ThemeProvider.tsx
 * ─────────────────────────────────────────────────────────────────
 * React Context provider that wraps the entire dashboard and
 * exposes theme state, device ID, and custom theme controls.
 * When a user is signed in, settings are synced to Firebase.
 *
 * This is the single source of truth for:
 *  • Theme + custom theme (via useTheme + useUserSettings)
 *  • Device ID (via useUserSettings)
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useTheme, applyTheme, type Theme, type CustomThemeConfig, THEMES } from "@/hooks/useTheme";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "./AuthProvider";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  themes: typeof THEMES;
  customTheme: CustomThemeConfig;
  setCustomTheme: (config: CustomThemeConfig) => void;
  applyCustomTheme: () => void;
  /** Synced device ID — same across all devices for this user. */
  deviceId: string;
  /** Update device ID (syncs to Firebase + localStorage). */
  setDeviceId: (id: string) => void;
  /** Synced sidebar collapse preference (icon rail vs wide view). */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Synced dashboard background blur preference (default ON). */
  backgroundBlur: boolean;
  setBackgroundBlurred: (blurred: boolean) => void;
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
  deviceId: "esp32-farm-001",
  setDeviceId: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  backgroundBlur: true,
  setBackgroundBlurred: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.uid ?? "";

  const {
    theme: localTheme,
    setTheme: setThemeLocal,
    toggleTheme: toggleThemeLocal,
    customTheme: localCustomTheme,
    setCustomTheme: setCustomThemeLocal,
    applyCustomTheme: applyCustomThemeLocal,
  } = useTheme();

  // Synced settings from Firebase
  const { settings, isLoaded, saveSetting } = useUserSettings(userId);

  // ── Apply Firebase-synced theme to DOM when it changes ──────
  useEffect(() => {
    if (isLoaded) {
      applyTheme(settings.theme, settings.customTheme);
    }
  }, [settings.theme, settings.customTheme, isLoaded]);

  // ── Expose the Firebase-synced theme (not localStorage one) ─
  const activeTheme = isLoaded ? settings.theme : localTheme;
  const activeCustomTheme = isLoaded ? settings.customTheme : localCustomTheme;

  // ── Theme controls (write to Firebase via useUserSettings) ──
  const setTheme = (t: Theme) => {
    setThemeLocal(t);
    saveSetting("theme", t);
  };

  const toggleTheme = () => {
    const themeOrder: Theme[] = ["midnight", "forest", "sunset", "midnight-blue", "light", "custom"];
    const idx = themeOrder.indexOf(activeTheme);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setThemeLocal(next);
    saveSetting("theme", next);
  };

  const setCustomTheme = (config: CustomThemeConfig) => {
    setCustomThemeLocal(config);
    saveSetting("customTheme", config);
    // If currently on custom theme, apply immediately
    if (activeTheme === "custom") {
      applyTheme("custom", config);
    }
  };

  const applyCustomTheme = () => {
    applyCustomThemeLocal();
    saveSetting("theme", "custom");
  };

  // ── Device ID controls (synced via useUserSettings) ────────
  const setDeviceId = (id: string) => {
    const trimmed = id.trim();
    if (trimmed.length === 0) return;
    // Update localStorage directly
    localStorage.setItem("farmassist-device-id", trimmed);
    // Sync to Firebase
    saveSetting("deviceId", trimmed);
  };

  // ── Sidebar + blur controls (synced via useUserSettings) ───
  const setSidebarCollapsed = (collapsed: boolean) => {
    saveSetting("sidebarCollapsed", collapsed);
  };

  const setBackgroundBlurred = (blurred: boolean) => {
    saveSetting("backgroundBlur", blurred);
  };

  return (
    <ThemeContext.Provider value={{
      theme: activeTheme,
      setTheme,
      toggleTheme,
      themes: THEMES,
      customTheme: activeCustomTheme,
      setCustomTheme,
      applyCustomTheme,
      deviceId: settings.deviceId,
      setDeviceId,
      sidebarCollapsed: settings.sidebarCollapsed,
      setSidebarCollapsed,
      backgroundBlur: settings.backgroundBlur,
      setBackgroundBlurred,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
