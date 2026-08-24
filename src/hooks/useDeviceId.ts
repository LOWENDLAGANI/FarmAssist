/**
 * useDeviceId.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for managing the paired device ID.
 * Persists to localStorage. For authenticated users, the canonical
 * source is Firebase (via useUserSettings in ThemeProvider) which
 * mirrors to localStorage. This hook reads from localStorage and
 * listens for external changes via custom events and storage events.
 *
 * IMPORTANT: This hook is localStorage-only. All Firebase sync for
 * deviceId is handled by useUserSettings (single listener).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { getDeviceId, setDeviceId as saveDeviceId } from "@/lib/firebaseConfig";

/** Custom event name for same-tab deviceId sync */
const DEVICE_ID_EVENT = "farmassist-device-id-changed";

/**
 * Returns the current device ID and a setter.
 * The device ID is persisted in localStorage and stays in sync
 * with Firebase via useUserSettings.
 */
export function useDeviceId() {
  const [deviceId, setDeviceState] = useState<string>(getDeviceId);

  // ── Listen for external localStorage changes ───────────────
  // Cross-tab: storage event
  // Same-tab: custom event dispatched by useUserSettings
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "farmassist-device-id" && e.newValue && e.newValue !== deviceId) {
        setDeviceState(e.newValue);
      }
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail && detail !== deviceId) {
        setDeviceState(detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(DEVICE_ID_EVENT, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(DEVICE_ID_EVENT, handleCustom);
    };
  }, [deviceId]);

  const setDevice = useCallback((id: string) => {
    const trimmed = id.trim();
    if (trimmed.length === 0) return;
    saveDeviceId(trimmed);
    setDeviceState(trimmed);
  }, []);

  return { deviceId, setDevice };
}

/**
 * Dispatch a custom event to notify other useDeviceId instances
 * in the same tab that localStorage was updated by useUserSettings.
 */
export function broadcastDeviceIdChange(newId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DEVICE_ID_EVENT, { detail: newId }));
  }
}
