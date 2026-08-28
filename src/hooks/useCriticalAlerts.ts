/**
 * useCriticalAlerts.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook that detects critical events and writes notifications
 * to the user's notification center.
 *
 * Critical events (push + in-app):
 *  • Sensor value breaches a configured threshold (temperature,
 *    moisture, waterLevel, light)
 *  • Rover goes offline (was live/stale, now offline)
 *
 * Each alert type is rate-limited to once per cooldown period to
 * avoid notification spam.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef } from "react";
import type { SensorTelemetry, SensorKey } from "@/types/telemetry";
import type { SensorRanges } from "@/hooks/useSensorRanges";
import type { ConnectionStatus } from "@/types/telemetry";
import type { AppNotification } from "@/types/notifications";
import { isNotificationEnabled } from "@/lib/notificationPreferences";

interface CriticalAlertsParams {
  userId: string;
  deviceId: string;
  latest: SensorTelemetry | null;
  ranges: SensorRanges;
  status: ConnectionStatus;
  createNotification: (
    userId: string,
    type: AppNotification["type"],
    title: string,
    body: string,
    deviceId: string
  ) => Promise<void>;
}

/** Cooldown between repeated alerts of the same type (10 minutes). */
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

const SENSOR_LABELS: Record<SensorKey, string> = {
  temperature: "Temperature",
  moisture: "Soil Moisture",
  waterLevel: "Water Level",
  light: "Light",
};

const SENSOR_UNITS: Record<SensorKey, string> = {
  temperature: "°C",
  moisture: "%",
  waterLevel: "%",
  light: "lux",
};

export function useCriticalAlerts({
  userId,
  deviceId,
  latest,
  ranges,
  status,
  createNotification,
}: CriticalAlertsParams) {
  const lastAlertRef = useRef<
    Record<string, number>
  >({});
  const prevStatusRef = useRef<ConnectionStatus>(status);

  // ── Sensor threshold alerts ────────────────────────────────
  useEffect(() => {
    if (!userId || !deviceId || !latest) return;

    const now = Date.now();

    const checkSensor = (key: SensorKey) => {
      const value = latest[key];
      const range = ranges[key];
      if (value === undefined || !range) return;

      const alertKey = `sensor_${key}`;
      const lastAlert = lastAlertRef.current[alertKey] ?? 0;
      if (now - lastAlert < ALERT_COOLDOWN_MS) return;

      const label = SENSOR_LABELS[key];
      const unit = SENSOR_UNITS[key];
      let direction: "high" | "low" | null = null;

      if (value > range.optimalMax) {
        direction = "high";
      } else if (value < range.optimalMin) {
        direction = "low";
      }

      if (direction) {
        const isCritical =
          (key === "temperature" && (value > 45 || value < 5)) ||
          (key === "waterLevel" && value < 10);
        const severity: "critical" | "warning" = isCritical ? "critical" : "warning";
        if (!isNotificationEnabled(severity)) return;

        lastAlertRef.current[alertKey] = now;
        const body =
          direction === "high"
            ? `${label} is ${value}${unit} (max: ${range.optimalMax}${unit}). Consider taking action.`
            : `${label} is ${value}${unit} (min: ${range.optimalMin}${unit}). Consider taking action.`;

        createNotification(
          userId,
          "sensor_alert",
          `${label} ${direction === "high" ? "too high" : "too low"}`,
          body,
          deviceId
        );
      }
    };

    (["temperature", "moisture", "waterLevel", "light"] as SensorKey[]).forEach(
      checkSensor
    );
  }, [userId, deviceId, latest, ranges, createNotification]);

  // ── Rover offline alert ────────────────────────────────────
  useEffect(() => {
    if (!userId || !deviceId) return;

    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    // Only alert when transitioning FROM live/stale TO offline
    if (
      (prevStatus === "live" || prevStatus === "stale") &&
      status === "offline"
    ) {
      const now = Date.now();
      const alertKey = "rover_offline";
      const lastAlert = lastAlertRef.current[alertKey] ?? 0;
      if (now - lastAlert < ALERT_COOLDOWN_MS) return;
      if (!isNotificationEnabled("critical")) return;

      lastAlertRef.current[alertKey] = now;
      createNotification(
        userId,
        "rover_offline",
        "Rover went offline",
        `Rover "${deviceId}" stopped sending data. Check power and WiFi connection.`,
        deviceId
      );
    }
  }, [userId, deviceId, status, createNotification]);
}
