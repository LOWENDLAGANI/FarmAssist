/**
 * useTelemetry.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom React hook for real-time IoT sensor telemetry.
 *
 * Responsibilities:
 *  • Attaches an `onValue` listener to the live RTDB node (users/{uid}/devices/{id}/latest).
 *  • Loads persisted history from users/{uid}/devices/{id}/history on mount.
 *  • Saves each new reading to users/{uid}/devices/{id}/history.
 *  • Maintains a rolling 15-snapshot history buffer for charts.
 *  • Computes connection status ("live" | "stale" | "offline").
 *  • Optionally calls onNewReading when data arrives (for session logging).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  onValue,
  push,
  get,
  query,
  orderByKey,
  limitToLast,
  remove,
  ref,
  type Unsubscribe,
} from "firebase/database";
import { telemetryRef, sensorHistoryRef, db } from "@/lib/firebaseConfig";
import type {
  SensorTelemetry,
  ChartDataPoint,
  ConnectionStatus,
} from "@/types/telemetry";
import {
  MAX_HISTORY_SIZE,
  DEFAULT_STALE_THRESHOLD_MS,
} from "@/types/telemetry";

/** Shape returned by the `useTelemetry` hook. */
export interface TelemetryState {
  latest: SensorTelemetry | null;
  /** Persisted chart history (from users/{uid}/devices/{id}/history in RTDB). */
  chartHistory: ChartDataPoint[];
  isLoading: boolean;
  status: ConnectionStatus;
  error: string | null;
  lastUpdated: number | null;
}

function computeStatus(
  lastUpdateMs: number | null,
  staleThreshold: number
): ConnectionStatus {
  if (!lastUpdateMs) return "offline";
  const age = Date.now() - lastUpdateMs;
  if (age <= staleThreshold) return "live";
  if (age <= staleThreshold * 3) return "stale";
  return "offline";
}

export function useTelemetry(
  userId: string,
  deviceId: string,
  staleThreshold: number = DEFAULT_STALE_THRESHOLD_MS,
  onNewReading?: (data: SensorTelemetry) => void
): TelemetryState {
  const [latest, setLatest] = useState<SensorTelemetry | null>(null);
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const lastUpdateRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const prevLatestRef = useRef<SensorTelemetry | null>(null);

  // ── Load history from RTDB on mount ─────────────────────────
  useEffect(() => {
    if (!userId || !deviceId) return;

    const loadFromDB = async () => {
      try {
        const histRef = sensorHistoryRef(userId, deviceId);
        const q = query(histRef, orderByKey(), limitToLast(MAX_HISTORY_SIZE));
        const snapshot = await get(q);

        if (snapshot.exists()) {
          const points: ChartDataPoint[] = [];
          snapshot.forEach((childSnap) => {
            const val = childSnap.val();
            if (val && typeof val.timestamp === "number" && typeof val.value === "number") {
              points.push({ timestamp: val.timestamp, value: val.value });
            }
          });
          setHistory(points);
        }
      } catch (err) {
        console.error("[useTelemetry] Failed to load history from DB:", err);
      }
    };

    loadFromDB();
  }, [userId, deviceId]);

  // ── RTDB live listener ──────────────────────────────────────
  useEffect(() => {
    if (!userId || !deviceId) return;

    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    let unsubscribe: Unsubscribe;
    try {
      const dbRef = telemetryRef(userId, deviceId);

      unsubscribe = onValue(
        dbRef,
        (snapshot) => {
          const data = snapshot.val();

          if (!data) {
            setLatest(null);
            setStatus("offline");
            setIsLoading(false);
            setError("No telemetry data found for this device.");
            return;
          }

          if (
            typeof data.temperature !== "number" ||
            typeof data.moisture !== "number" ||
            typeof data.waterLevel !== "number" ||
            typeof data.light !== "number"
          ) {
            setError("Malformed telemetry document.");
            setIsLoading(false);
            return;
          }

          const now = Date.now();

          const telemetry: SensorTelemetry = {
            temperature: data.temperature,
            moisture: data.moisture,
            waterLevel: data.waterLevel,
            light: data.light,
            timestamp: now,
          };

          setLatest(telemetry);
          lastUpdateRef.current = now;
          setLastUpdated(now);
          setError(null);
          setIsLoading(false);

          // Only append to history if this is a genuinely new reading
          if (!prevLatestRef.current || telemetry.timestamp > prevLatestRef.current.timestamp) {
            const newPoint: ChartDataPoint = {
              timestamp: now,
              value: telemetry.temperature,
            };

            setHistory((prev) => {
              const next = [...prev, newPoint];
              return next.length > MAX_HISTORY_SIZE
                ? next.slice(next.length - MAX_HISTORY_SIZE)
                : next;
            });

            // Save to RTDB history
            push(sensorHistoryRef(userId, deviceId), {
              timestamp: now,
              value: telemetry.temperature,
              temperature: telemetry.temperature,
              moisture: telemetry.moisture,
              waterLevel: telemetry.waterLevel,
              light: telemetry.light,
            }).then(() => {
              // Prune old entries beyond limit
              get(sensorHistoryRef(userId, deviceId)).then((snap) => {
                const keys: string[] = [];
                snap.forEach((child) => {
                  keys.push(child.key!);
                });
                if (keys.length > MAX_HISTORY_SIZE + 5) {
                  const excess = keys.length - MAX_HISTORY_SIZE;
                  const toDelete = keys.slice(0, excess);
                  toDelete.forEach((k) =>
                    remove(ref(db, `users/${userId}/devices/${deviceId}/history/${k}`))
                  );
                }
              });
            }).catch(() => {});

            // Write to active logging session if callback provided
            onNewReading?.(telemetry);

            prevLatestRef.current = telemetry;
          }

          setStatus(computeStatus(now, staleThreshold));
        },
        (err) => {
          console.error("[useTelemetry] RTDB error:", err);
          setError(
            `Connection error: ${err.message ?? "Unknown RTDB error"}`
          );
          setStatus("offline");
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("[useTelemetry] Failed to attach listener:", err);
      if (mountedRef.current) {
        setError(
          `Failed to initialize: ${err instanceof Error ? err.message : String(err)}`
        );
        setStatus("offline");
        setIsLoading(false);
      }
    }

    return () => {
      unsubscribe?.();
    };
  }, [userId, deviceId, staleThreshold, onNewReading]);

  // Mark as mounted after first effect runs
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // ── Status polling interval ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(
        computeStatus(lastUpdateRef.current, staleThreshold)
      );
    }, 1_000);

    return () => clearInterval(interval);
  }, [staleThreshold]);

  return { latest, chartHistory: history, isLoading, status, error, lastUpdated };
}
