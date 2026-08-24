/**
 * useUserSettings.ts
 * ─────────────────────────────────────────────────────────────────
 * Centralized hook that syncs all user preferences to Firebase RTDB
 * under users/{uid}/settings. This is the SINGLE source of truth
 * for synced settings — no other hook should subscribe to this path.
 *
 * Synced settings:
 *  • deviceId    — the paired Rover ID
 *  • theme       — selected theme id
 *  • customTheme — custom theme color config
 *
 * Falls back to localStorage when not authenticated or as offline cache.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onValue, set, type Unsubscribe } from "firebase/database";
import { userSettingsRef } from "@/lib/firebaseConfig";
import type { Theme, CustomThemeConfig } from "@/hooks/useTheme";
import { broadcastDeviceIdChange } from "@/hooks/useDeviceId";

export interface UserSettings {
  deviceId: string;
  theme: Theme;
  customTheme: CustomThemeConfig;
}

const DEFAULT_SETTINGS: UserSettings = {
  deviceId: "esp32-farm-001",
  theme: "midnight",
  customTheme: {
    name: "My Theme",
    background: "#0a0a1a",
    card: "#121225",
    accent: "#8b5cf6",
    foreground: "#f1f5f9",
    muted: "#1e1e3a",
  },
};

/** Check if the user is a guest (demo mode). */
function isGuestUser(userId: string): boolean {
  return userId.startsWith("guest-");
}

/** Read settings from localStorage (synchronous fallback). */
function readLocalStorage(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const deviceId = localStorage.getItem("farmassist-device-id") ?? DEFAULT_SETTINGS.deviceId;

  const storedTheme = localStorage.getItem("farmassist-theme") as Theme | null;
  const theme = storedTheme && ["midnight", "forest", "sunset", "midnight-blue", "light", "custom"].includes(storedTheme)
    ? storedTheme
    : DEFAULT_SETTINGS.theme;

  let customTheme = DEFAULT_SETTINGS.customTheme;
  try {
    const raw = localStorage.getItem("farmassist-custom-theme");
    if (raw) customTheme = { ...DEFAULT_SETTINGS.customTheme, ...JSON.parse(raw) };
  } catch { /* ignore */ }

  return { deviceId, theme, customTheme };
}

/** Write settings to localStorage. */
function writeLocalStorage(settings: UserSettings) {
  localStorage.setItem("farmassist-device-id", settings.deviceId);
  localStorage.setItem("farmassist-theme", settings.theme);
  localStorage.setItem("farmassist-custom-theme", JSON.stringify(settings.customTheme));
}

/**
 * Hook that loads and saves user settings to Firebase RTDB.
 * For authenticated users, settings are synced per-user.
 * For guests, settings stay in localStorage only.
 *
 * @param userId - Firebase Auth UID (empty string if not logged in)
 */
export function useUserSettings(userId: string) {
  // Initialize from localStorage (no flash)
  const [settings, setSettings] = useState<UserSettings>(readLocalStorage);
  const [isLoaded, setIsLoaded] = useState(false);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  const isGuest = !userId || isGuestUser(userId);

  // ── Subscribe to Firebase settings when authenticated ───────
  useEffect(() => {
    if (isGuest) {
      setIsLoaded(true);
      return;
    }

    try {
      unsubscribeRef.current = onValue(
        userSettingsRef(userId),
        (snapshot) => {
          const data = snapshot.val() as Partial<UserSettings> | null;

          if (data) {
            // Build merged settings from Firebase data
            const synced: UserSettings = {
              deviceId: data.deviceId ?? DEFAULT_SETTINGS.deviceId,
              theme: data.theme ?? DEFAULT_SETTINGS.theme,
              customTheme: data.customTheme ?? DEFAULT_SETTINGS.customTheme,
            };

            setSettings(synced);
            writeLocalStorage(synced);

            // Broadcast deviceId change for same-tab useDeviceId sync
            broadcastDeviceIdChange(synced.deviceId);
          } else {
            // First time user — no settings in Firebase yet, write defaults
            set(userSettingsRef(userId), DEFAULT_SETTINGS).catch(console.error);
          }

          setIsLoaded(true);
        },
        (err) => {
          console.error("[useUserSettings] Firebase read error:", err);
          setIsLoaded(true);
        }
      );
    } catch (err) {
      console.error("[useUserSettings] Failed to attach listener:", err);
      setIsLoaded(true);
    }

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [userId, isGuest]);

  // ── Save a single setting ───────────────────────────────────
  const saveSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      // Compute merged state and update React + localStorage synchronously
      setSettings((prev) => {
        const merged = { ...prev, [key]: value };
        writeLocalStorage(merged);

        // Sync to Firebase for authenticated users (fire-and-forget)
        if (!isGuest) {
          set(userSettingsRef(userId), {
            deviceId: merged.deviceId,
            theme: merged.theme,
            customTheme: merged.customTheme,
          }).catch((err) => {
            console.error("[useUserSettings] Firebase write error:", err);
          });
        }

        return merged;
      });
    },
    [userId, isGuest]
  );

  // ── Save all settings at once ───────────────────────────────
  const saveSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...newSettings };
        writeLocalStorage(merged);

        if (!isGuest) {
          set(userSettingsRef(userId), {
            deviceId: merged.deviceId,
            theme: merged.theme,
            customTheme: merged.customTheme,
          }).catch((err) => {
            console.error("[useUserSettings] Firebase write error:", err);
          });
        }

        return merged;
      });
    },
    [userId, isGuest]
  );

  return {
    settings,
    isLoaded,
    saveSetting,
    saveSettings,
  };
}
