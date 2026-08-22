/**
 * useTelemetry.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom React hook for real-time IoT sensor telemetry.
 *
 * Responsibilities:
 *  • Attaches an `onValue` listener to the live RTDB node.
 *  • Maintains a rolling 15-snapshot history buffer for charts.
 *  • Computes connection status ("live" | "stale" | "offline") based
 *    on the age of the latest timestamp vs. the stale threshold.
 *  • Gracefully handles Firebase errors, missing data, and network
 *    disconnects without throwing unhandled exceptions.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { onValue, type Unsubscribe } from "firebase/database";
import {
  telemetryRef,
} from "@/lib/firebaseConfig";
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
  /** Most recent sensor reading, or `null` if no data received yet. */
  latest: SensorTelemetry | null;
  /** Rolling history buffer (max 15 items) for chart rendering. */
  history: ChartDataPoint[];
  /** Whether the RTDB listener is connected and receiving. */
  isLoading: boolean;
  /** Current connection health of the hardware node. */
  status: ConnectionStatus;
  /** Any error message from RTDB or network. */
  error: string | null;
  /** Timestamp (ms) of the last successful snapshot. */
  lastUpdated: number | null;
}

/**
 * Computes the connection status from the latest timestamp.
 *  - "live"   : data is fresh (within stale threshold)
 *  - "stale"  : data exists but timestamp exceeds the threshold
 *  - "offline": no data received yet or node is missing
 */
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
  staleThreshold: number = DEFAULT_STALE_THRESHOLD_MS
): TelemetryState {
  const [latest, setLatest] = useState<SensorTelemetry | null>(null);
  const [history, setHistory] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Keep a ref to the last update time so the interval can read it
  // without re-subscribing to RTDB on every tick.
  const lastUpdateRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  // ── RTDB snapshot listener ────────────────────────────────────
  useEffect(() => {
    if (mountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    let unsubscribe: Unsubscribe;
    try {
      const dbRef = telemetryRef();

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

          // Validate that essential fields are present
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

          // Generate timestamp client-side since RTDB doesn't store one
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

          // Append to rolling history buffer (max 15 entries)
          const newPoint: ChartDataPoint = {
            timestamp: now,
            value: data.temperature, // default; the chart component picks the active sensor
          };

          setHistory((prev) => {
            const next = [...prev, newPoint];
            return next.length > MAX_HISTORY_SIZE
              ? next.slice(next.length - MAX_HISTORY_SIZE)
              : next;
          });

          // Compute status based on when we received the data
          setStatus(computeStatus(now, staleThreshold));
        },
        (err) => {
          // Gracefully handle RTDB permission errors and network issues
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
  }, [staleThreshold]);

  // Mark as mounted after first effect runs
  useEffect(() => {
    mountedRef.current = true;
  }, []);

  // ── Status polling interval ───────────────────────────────────
  // Re-evaluate the connection status every second based on the
  // latest known timestamp, even when no new snapshots arrive.
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(
        computeStatus(lastUpdateRef.current, staleThreshold)
      );
    }, 1_000);

    return () => clearInterval(interval);
  }, [staleThreshold]);

  return { latest, history, isLoading, status, error, lastUpdated };
}
