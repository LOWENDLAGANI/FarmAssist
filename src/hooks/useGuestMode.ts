/**
 * useGuestMode.ts
 * ─────────────────────────────────────────────────────────────────
 * Guest mode hook that simulates a fully working device for
 * presentations and demos. Generates realistic sensor data with
 * natural fluctuations.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SensorTelemetry, SensorKey, ChartDataPoint, ConnectionStatus } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";

interface GuestModeState {
  isActive: boolean;
  latest: SensorTelemetry | null;
  chartHistory: ChartDataPoint[];
  status: ConnectionStatus;
  lastUpdated: number | null;
  deviceId: string;
}

const GUEST_DEVICE_ID = "demo-farm-001";

// Realistic base values with slight variations
const BASE_VALUES: Record<SensorKey, { base: number; variance: number; min: number; max: number }> = {
  temperature: { base: 24.5, variance: 2.5, min: 15, max: 45 },
  moisture: { base: 45, variance: 8, min: 10, max: 85 },
  waterLevel: { base: 65, variance: 5, min: 20, max: 95 },
  light: { base: 4500, variance: 1500, min: 500, max: 9500 },
};

function generateSensorValue(key: SensorKey, time: number): number {
  const config = BASE_VALUES[key];
  // Add sinusoidal variation for natural-looking data
  const sineOffset = Math.sin(time / 10000) * config.variance * 0.5;
  const noise = (Math.random() - 0.5) * config.variance;
  const value = config.base + sineOffset + noise;
  return Math.round(Math.min(config.max, Math.max(config.min, value)) * 10) / 10;
}

function generateTelemetry(): SensorTelemetry {
  const now = Date.now();
  return {
    temperature: generateSensorValue("temperature", now),
    moisture: generateSensorValue("moisture", now + 1000),
    waterLevel: generateSensorValue("waterLevel", now + 2000),
    light: generateSensorValue("light", now + 3000),
    timestamp: now,
  };
}

export function useGuestMode() {
  const [state, setState] = useState<GuestModeState>({
    isActive: false,
    latest: null,
    chartHistory: [],
    status: "live",
    lastUpdated: null,
    deviceId: GUEST_DEVICE_ID,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const activateGuestMode = useCallback(() => {
    startTimeRef.current = Date.now();
    
    // Generate initial history (30 data points)
    const initialHistory: ChartDataPoint[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - i * 5000; // 5 seconds apart
      const temp = generateSensorValue("temperature", timestamp);
      const moisture = generateSensorValue("moisture", timestamp + 1000);
      const waterLevel = generateSensorValue("waterLevel", timestamp + 2000);
      const light = generateSensorValue("light", timestamp + 3000);
      initialHistory.push({
        timestamp,
        value: temp,
        temperature: temp,
        moisture,
        waterLevel,
        light,
      });
    }

    const latestReading = generateTelemetry();

    setState({
      isActive: true,
      latest: latestReading,
      chartHistory: initialHistory,
      status: "live",
      lastUpdated: now,
      deviceId: GUEST_DEVICE_ID,
    });

    // Start simulated data updates
    intervalRef.current = setInterval(() => {
      const newReading = generateTelemetry();
      setState((prev) => ({
        ...prev,
        latest: newReading,
        lastUpdated: Date.now(),
        chartHistory: [
          ...prev.chartHistory.slice(-99), // Keep last 100 points
          {
            timestamp: newReading.timestamp,
            value: newReading.temperature,
            temperature: newReading.temperature,
            moisture: newReading.moisture,
            waterLevel: newReading.waterLevel,
            light: newReading.light,
          },
        ],
      }));
    }, 5000); // Update every 5 seconds
  }, []);

  const deactivateGuestMode = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState({
      isActive: false,
      latest: null,
      chartHistory: [],
      status: "offline",
      lastUpdated: null,
      deviceId: GUEST_DEVICE_ID,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    activateGuestMode,
    deactivateGuestMode,
  };
}
