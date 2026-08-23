/**
 * useDeviceId.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook for managing the paired device ID.
 * Persists to localStorage and triggers a re-render when changed.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useCallback } from "react";
import { getDeviceId, setDeviceId as saveDeviceId } from "@/lib/firebaseConfig";

/**
 * Returns the current device ID and a setter.
 * The device ID is persisted in localStorage.
 */
export function useDeviceId() {
  const [deviceId, setDeviceState] = useState<string>(getDeviceId);

  const setDevice = useCallback((id: string) => {
    const trimmed = id.trim();
    if (trimmed.length === 0) return;
    saveDeviceId(trimmed);
    setDeviceState(trimmed);
  }, []);

  return { deviceId, setDevice };
}
