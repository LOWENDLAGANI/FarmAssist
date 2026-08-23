/**
 * SensorCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Sensor metric card with circular gauge display.
 * Dark theme matching the FarmAssist reference UI.
 *
 * Each card shows:
 *  • Sensor label at top
 *  • Circular arc gauge with value and unit
 *  • Status text (Good / Warning)
 *  • Optimal range text (user-configurable)
 *
 * Props:
 *  • compact — smaller gauge for mobile screens
 *  • range — configurable optimal range from RTDB
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useMemo } from "react";
import CircularGauge from "./CircularGauge";
import type { SensorKey } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";
import type { SensorRange } from "@/hooks/useSensorRanges";

interface SensorCardProps {
  sensorKey: SensorKey;
  value: number | null;
  isSelected: boolean;
  onSelect: (key: SensorKey) => void;
  /** Use smaller gauge for mobile */
  compact?: boolean;
  /** User-configurable optimal range */
  range?: SensorRange;
}

export default function SensorCard({
  sensorKey,
  value,
  isSelected,
  onSelect,
  compact = false,
  range,
}: SensorCardProps) {
  const meta = SENSOR_META[sensorKey];

  // Use configured range or fall back to defaults from SENSOR_META
  const optimalMin = range?.optimalMin ?? meta.optimalRange[0];
  const optimalMax = range?.optimalMax ?? meta.optimalRange[1];

  /** Whether the current value is within the optimal range. */
  const isOptimal = useMemo(() => {
    if (value === null) return false;
    return value >= optimalMin && value <= optimalMax;
  }, [value, optimalMin, optimalMax]);

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
      className={`group flex flex-col items-center rounded-2xl border p-3 transition-all duration-300 sm:p-5 hover-lift ${
        isSelected
          ? "border-cyan-500/40 bg-[#0d1f35] shadow-lg shadow-cyan-500/10"
          : "border-cyan-900/20 bg-[#0c1a2e] hover:border-cyan-800/30 hover:bg-[#0f2240] hover:shadow-xl hover:shadow-cyan-500/5"
      }`}
      aria-pressed={isSelected}
      aria-label={`Select ${meta.label} for chart display`}
    >
      {/* ── Label ── */}
      <span
        className={`font-medium transition-colors ${compact ? "mb-1 text-xs" : "mb-3 text-sm"}`}
        style={{ color: meta.hexColor }}
      >
        {meta.label}
      </span>

      {/* ── Circular Gauge ── */}
      <div className="transition-transform duration-300 group-hover:scale-105">
        <CircularGauge
          value={value ?? 0}
          min={meta.min}
          max={meta.max}
          color={meta.hexColor}
          unit={meta.unit}
          decimals={sensorKey === "temperature" ? 1 : 0}
          size={compact ? 120 : 160}
        />
      </div>

      {/* ── Status ── */}
      <span className={`mt-1 text-xs font-semibold sm:mt-2 sm:text-sm transition-colors ${statusColor}`}>
        {statusText}
      </span>

      {/* ── Optimal Range ── */}
      <span className="mt-0.5 text-[10px] text-slate-500 sm:mt-1 sm:text-xs">
        Range {optimalMin}–
        {optimalMax}
        {meta.unit}
      </span>
    </button>
  );
}
