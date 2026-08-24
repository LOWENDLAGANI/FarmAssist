/**
 * useSensorRanges.ts
 * ─────────────────────────────────────────────────────────────────
 * Manages sensor threshold ranges (optimal/warning) per device.
 *
 * - Loads saved ranges from users/{uid}/devices/{deviceId}/ranges on mount
 * - Saves changes to RTDB in real-time
 * - Falls back to defaults from SENSOR_META if no saved ranges exist
 * - Two-way sync: changes propagate to RTDB and reflect on all clients
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { onValue, set } from "firebase/database";
import { sensorRangesRef } from "@/lib/firebaseConfig";
import { SENSOR_META, type SensorKey } from "@/types/telemetry";

/** The shape of a single sensor's range config stored in RTDB. */
export interface SensorRange {
  optimalMin: number;
  optimalMax: number;
}

/** All sensor ranges keyed by sensor type. */
export type SensorRanges = Record<SensorKey, SensorRange>;

/** Default ranges derived from SENSOR_META constants. */
const DEFAULT_RANGES: SensorRanges = {
  temperature: {
    optimalMin: SENSOR_META.temperature.optimalRange[0],
    optimalMax: SENSOR_META.temperature.optimalRange[1],
  },
  moisture: {
    optimalMin: SENSOR_META.moisture.optimalRange[0],
    optimalMax: SENSOR_META.moisture.optimalRange[1],
  },
  waterLevel: {
    optimalMin: SENSOR_META.waterLevel.optimalRange[0],
    optimalMax: SENSOR_META.waterLevel.optimalRange[1],
  },
  light: {
    optimalMin: SENSOR_META.light.optimalRange[0],
    optimalMax: SENSOR_META.light.optimalRange[1],
  },
};

/**
 * Hook that loads, listens to, and saves sensor ranges from Firebase RTDB.
 *
 * @param userId   - The Firebase Auth UID
 * @param deviceId - The device ID to load ranges for
 * @returns        - ranges, updateRange, updateRanges, resetToDefaults, isLoading
 */
/** Check if the user is a guest (demo mode) */
function isGuestUser(userId: string): boolean {
  return userId.startsWith("guest-");
}

export function useSensorRanges(userId: string, deviceId: string) {
  const [ranges, setRanges] = useState<SensorRanges>(DEFAULT_RANGES);
  const [isLoading, setIsLoading] = useState(true);

  // ── Ref to avoid stale closure in callbacks ────────────────────
  const rangesRef = useRef<SensorRanges>(DEFAULT_RANGES);
  rangesRef.current = ranges;

  // ── Skip Firebase for guest users ──────────────────────────────
  if (isGuestUser(userId)) {
    return {
      ranges: DEFAULT_RANGES,
      updateRange: async () => {},
      updateRanges: async () => {},
      resetToDefaults: async () => {},
      isLoading: false,
    };
  }

  // ── Load + listen to RTDB ──────────────────────────────────────
  useEffect(() => {
    if (!userId || !deviceId || isGuestUser(userId)) return;
    setIsLoading(true);
    const dbRef = sensorRangesRef(userId, deviceId);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val() as SensorRanges | null;

      if (data && typeof data === "object") {
        // Merge with defaults to fill in any missing keys
        const merged = { ...DEFAULT_RANGES };
        for (const key of Object.keys(data) as SensorKey[]) {
          const val = data[key];
          if (
            val &&
            typeof val === "object" &&
            typeof val.optimalMin === "number" &&
            typeof val.optimalMax === "number"
          ) {
            merged[key] = { optimalMin: val.optimalMin, optimalMax: val.optimalMax };
          }
        }
        setRanges(merged);
      } else {
        // No saved ranges — use defaults and save them to RTDB
        set(dbRef, DEFAULT_RANGES).catch(console.error);
        setRanges(DEFAULT_RANGES);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId, deviceId]);

  // ── Update all ranges at once ──────────────────────────────────
  const updateRanges = useCallback(
    async (newRanges: SensorRanges) => {
      setRanges(newRanges);
      rangesRef.current = newRanges;
      const dbRef = sensorRangesRef(userId, deviceId);
      await set(dbRef, newRanges).catch(console.error);
    },
    [userId, deviceId]
  );

  // ── Update a single sensor's range ─────────────────────────────
  const updateRange = useCallback(
    async (sensor: SensorKey, range: SensorRange) => {
      // Build the full updated object from the ref (always fresh)
      const updated = { ...rangesRef.current, [sensor]: range };
      setRanges(updated);
      rangesRef.current = updated;
      const dbRef = sensorRangesRef(userId, deviceId);
      await set(dbRef, updated).catch(console.error);
    },
    [userId, deviceId]
  );

  // ── Reset to defaults ──────────────────────────────────────────
  const resetToDefaults = useCallback(async () => {
    setRanges(DEFAULT_RANGES);
    rangesRef.current = DEFAULT_RANGES;
    const dbRef = sensorRangesRef(userId, deviceId);
    await set(dbRef, DEFAULT_RANGES).catch(console.error);
  }, [userId, deviceId]);

  return {
    ranges,
    updateRange,
    updateRanges,
    resetToDefaults,
    isLoading,
  };
}
