/**
 * ChartSection.tsx
 * ─────────────────────────────────────────────────────────────────
 * Live rolling telemetry chart using Recharts.
 *
 * • Plots the last 15 data points from the rolling history buffer.
 * • Dynamically changes accent color and unit based on the selected
 *   sensor metric.
 * • Dark theme matching the Farm Assistant reference UI.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useId, useMemo, useState } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { SensorKey, ChartDataPoint } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";

interface ChartSectionProps {
  activeSensor: SensorKey;
  history: ChartDataPoint[];
}

const DATA_POINT_OPTIONS = [10, 15, 25, 50, 100] as const;

/** Formats a Unix timestamp for display on the X axis. */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Formats a tooltip timestamp. */
function formatTooltipTime(ts: React.ReactNode): string {
  if (typeof ts !== "number") return String(ts ?? "");
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ChartSection({
  activeSensor,
  history,
}: ChartSectionProps) {
  const meta = SENSOR_META[activeSensor];
  const pointCountSelectId = useId();
  const [pointCount, setPointCount] = useState<number>(15);

  const chartData = useMemo(() => {
    const visibleHistory = pointCount === 0 ? history : history.slice(-pointCount);

    return visibleHistory.map((point) => ({
      timestamp: point.timestamp,
      value:
        activeSensor === "temperature"
          ? (point.temperature ?? point.value)
          : activeSensor === "moisture"
            ? (point.moisture ?? point.value)
            : activeSensor === "waterLevel"
              ? (point.waterLevel ?? point.value)
              : activeSensor === "light"
                ? (point.light ?? point.value)
                : point.value,
    }));
  }, [history, activeSensor, pointCount]);

  const hasData = chartData.length > 1;

  return (
    <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4 sm:p-6">
      {/* ── Chart header ── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Live {meta.label} Telemetry
          </h2>
          <p className="text-sm text-slate-400">
            Showing {chartData.length} of {history.length} data points
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: meta.hexColor }}
            />
            <span className="text-sm text-slate-400">{meta.unit}</span>
          </div>
          <label
            htmlFor={pointCountSelectId}
            className="flex items-center gap-2 text-xs text-slate-400"
          >
            <span className="whitespace-nowrap">Display</span>
            <select
              id={pointCountSelectId}
              value={pointCount}
              onChange={(event) => setPointCount(Number(event.target.value))}
              className="rounded-lg border border-cyan-900/40 bg-[#0a1628] px-2 py-1.5 text-sm text-slate-200 outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              aria-label="Number of data points to display"
            >
              {DATA_POINT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  Last {count}
                </option>
              ))}
              <option value={0}>All</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── Chart ── */}
      {hasData ? (
        <div className="h-56 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id={`gradient-${activeSensor}`} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={meta.hexColor}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={meta.hexColor}
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                tick={{ fontSize: 11, fill: "#64748b" }}
                stroke="rgba(255,255,255,0.1)"
              />
              <YAxis
                domain={[meta.min, meta.max]}
                tick={{ fontSize: 11, fill: "#64748b" }}
                stroke="rgba(255,255,255,0.1)"
                width={40}
              />
              <Tooltip
                labelFormatter={formatTooltipTime}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "13px",
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                formatter={(value) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return [
                    `${num.toFixed(1)} ${meta.unit}`,
                    meta.label,
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={meta.hexColor}
                strokeWidth={2.5}
                fill={`url(#gradient-${activeSensor})`}
                dot={{
                  r: 4,
                  fill: meta.hexColor,
                  stroke: "#0c1a2e",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: meta.hexColor,
                  stroke: "#0c1a2e",
                  strokeWidth: 2,
                }}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-56 items-center justify-center sm:h-72">
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-800/50" />
            <p className="text-sm text-slate-400">
              Waiting for sensor data…
            </p>
            <p className="text-xs text-slate-500">
              Chart will populate once readings are received
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
