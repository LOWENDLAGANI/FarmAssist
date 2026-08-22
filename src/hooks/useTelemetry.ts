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
  timestamp: number | null,
  staleThreshold: number
): ConnectionStatus {
  if (!timestamp) return "offline";
  const age = Date.now() - timestamp;
  if (age <= staleThreshold) return "live";
  if (age <= staleThreshold * 3) return "stale";
  return "offline";
}

/**
 * Parses a timestamp value that may arrive as a string or number.
 * RTDB can store timestamps as strings (e.g. "543868").
 * If it looks like seconds (<= 10 digits, < year 2286 in ms),
 * we convert to ms. Otherwise treat as ms directly.
 */
function parseTimestamp(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const num = Number(raw);
    if (!Number.isNaN(num)) {
      // If the value is small (< 10 billion), treat as seconds
      return num < 10_000_000_000 ? num * 1000 : num;
    }
  }
  return null;
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

  // Keep a ref to the latest timestamp so the interval can read it
  // without re-subscribing to RTDB on every tick.
  const latestTimestampRef = useRef<number | null>(null);
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

          // Parse timestamp (may be string or number in RTDB)
          const timestamp = parseTimestamp(data.timestamp);

          // Validate that essential fields are present
          if (
            typeof data.temperature !== "number" ||
            typeof data.humidity !== "number" ||
            typeof data.moisture !== "number" ||
            typeof data.waterLevel !== "number" ||
            timestamp === null
          ) {
            setError("Malformed telemetry document.");
            setIsLoading(false);
            return;
          }

          const telemetry: SensorTelemetry = {
            temperature: data.temperature,
            humidity: data.humidity,
            moisture: data.moisture,
            waterLevel: data.waterLevel,
            timestamp,
          };

          setLatest(telemetry);
          latestTimestampRef.current = timestamp;
          setLastUpdated(Date.now());
          setError(null);
          setIsLoading(false);

          // Append to rolling history buffer (max 15 entries)
          const newPoint: ChartDataPoint = {
            timestamp,
            value: data.temperature, // default; the chart component picks the active sensor
          };

          setHistory((prev) => {
            const next = [...prev, newPoint];
            return next.length > MAX_HISTORY_SIZE
              ? next.slice(next.length - MAX_HISTORY_SIZE)
              : next;
          });

          // Compute initial status
          setStatus(computeStatus(timestamp, staleThreshold));
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
        computeStatus(latestTimestampRef.current, staleThreshold)
      );
    }, 1_000);

    return () => clearInterval(interval);
  }, [staleThreshold]);

  return { latest, history, isLoading, status, error, lastUpdated };
}
