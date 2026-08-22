/**
 * SensorCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Sensor metric card with circular gauge display.
 * Dark theme matching the Farm Assistant reference UI.
 *
 * Each card shows:
 *  • Sensor label at top
 *  • Circular arc gauge with value and unit
 *  • Status text (Good / Optimal / Warning)
 *  • Optimal range text
 *
 * Props:
 *  • compact — smaller gauge for mobile screens
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useMemo } from "react";
import CircularGauge from "./CircularGauge";
import type { SensorKey } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";

interface SensorCardProps {
  sensorKey: SensorKey;
  value: number | null;
  isSelected: boolean;
  onSelect: (key: SensorKey) => void;
  /** Use smaller gauge for mobile */
  compact?: boolean;
}

export default function SensorCard({
  sensorKey,
  value,
  isSelected,
  onSelect,
  compact = false,
}: SensorCardProps) {
  const meta = SENSOR_META[sensorKey];

  /** Whether the current value is within the optimal range. */
  const isOptimal = useMemo(() => {
    if (value === null) return false;
    return value >= meta.optimalRange[0] && value <= meta.optimalRange[1];
  }, [value, meta]);

  /** Status label based on range check. */
  const statusText = useMemo(() => {
    if (value === null) return "No Data";
    return isOptimal ? "Good" : "Warning";
  }, [value, isOptimal]);

  /** Status color. */
  const statusColor = useMemo(() => {
    if (value === null) return "text-slate-500";
    return isOptimal ? "text-emerald-400" : "text-amber-400";
  }, [value, isOptimal]);

  return (
    <button
      onClick={() => onSelect(sensorKey)}
      className={`group flex flex-col items-center rounded-2xl border p-3 transition-all duration-200 sm:p-5 ${
        isSelected
          ? "border-cyan-500/40 bg-[#0d1f35] shadow-lg shadow-cyan-500/10"
          : "border-cyan-900/20 bg-[#0c1a2e] hover:border-cyan-800/30 hover:bg-[#0f2240]"
      }`}
      aria-pressed={isSelected}
      aria-label={`Select ${meta.label} for chart display`}
    >
      {/* ── Label ── */}
      <span
        className={`font-medium ${compact ? "mb-1 text-xs" : "mb-3 text-sm"}`}
        style={{ color: meta.hexColor }}
      >
        {meta.label}
      </span>

      {/* ── Circular Gauge ── */}
      <CircularGauge
        value={value ?? 0}
        min={meta.min}
        max={meta.max}
        color={meta.hexColor}
        unit={meta.unit}
        decimals={sensorKey === "temperature" ? 1 : 0}
        size={compact ? 120 : 160}
      />

      {/* ── Status ── */}
      <span className={`mt-1 text-xs font-semibold sm:mt-2 sm:text-sm ${statusColor}`}>
        {statusText}
      </span>

      {/* ── Optimal Range ── */}
      <span className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">
        Range {meta.optimalRange[0]}–
        {meta.optimalRange[1]}
        {meta.unit}
      </span>
    </button>
  );
}
