/**
 * SensorsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Detailed sensor view with large gauges and live readings.
 * Shows all sensors in a grid with expanded info.
 * Uses user-configurable optimal ranges from RTDB.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import CircularGauge from "../CircularGauge";
import type { SensorTelemetry } from "@/types/telemetry";
import { SENSOR_META, type SensorKey } from "@/types/telemetry";
import type { SensorRanges } from "@/hooks/useSensorRanges";

interface SensorsPageProps {
  latest: SensorTelemetry | null;
  sensorRanges?: SensorRanges;
}

const SENSORS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

export default function SensorsPage({ latest, sensorRanges }: SensorsPageProps) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Sensors</h2>
        <p className="text-sm text-slate-400">Live readings from all connected sensors</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SENSORS.map((key) => {
          const meta = SENSOR_META[key];
          const value = latest ? latest[key] : null;
          const range = sensorRanges?.[key];
          const optimalMin = range?.optimalMin ?? meta.optimalRange[0];
          const optimalMax = range?.optimalMax ?? meta.optimalRange[1];

          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-6"
            >
              <span
                className="mb-4 text-sm font-medium"
                style={{ color: meta.hexColor }}
              >
                {meta.label}
              </span>

              <CircularGauge
                value={value ?? 0}
                min={meta.min}
                max={meta.max}
                color={meta.hexColor}
                unit={meta.unit}
                decimals={key === "temperature" ? 1 : 0}
                size={180}
              />

              <div className="mt-4 w-full border-t border-cyan-900/20 pt-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Optimal Range</span>
                  <span className="text-slate-300">
                    {optimalMin}–{optimalMax} {meta.unit}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>Min / Max</span>
                  <span className="text-slate-300">
                    {meta.min} – {meta.max} {meta.unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
