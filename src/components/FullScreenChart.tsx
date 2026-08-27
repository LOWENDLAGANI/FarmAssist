/**
 * FullScreenChart.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full-screen chart modal for detailed data analysis.
 *
 * Features:
 *  • Expanded area chart with more screen real estate
 *  • Sensor switching tabs (temperature, moisture, water, light)
 *  • Multiple data point count options
 *  • Close button + Escape key support
 *  • Focus trapping for accessibility
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  X,
  Thermometer,
  Droplets,
  Waves,
  Sun,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SensorKey, ChartDataPoint } from "@/types/telemetry";
import { SENSOR_META } from "@/types/telemetry";

const SENSOR_TABS: Array<{ key: SensorKey; label: string; icon: React.ReactNode }> = [
  { key: "temperature", label: "Temp", icon: <Thermometer className="h-3.5 w-3.5" /> },
  { key: "moisture", label: "Moisture", icon: <Droplets className="h-3.5 w-3.5" /> },
  { key: "waterLevel", label: "Water", icon: <Waves className="h-3.5 w-3.5" /> },
  { key: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
];

const POINT_OPTIONS = [25, 50, 100, 200, 500] as const;

interface FullScreenChartProps {
  isOpen: boolean;
  onClose: () => void;
  initialSensor: SensorKey;
  history: ChartDataPoint[];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(ts: React.ReactNode): string {
  if (typeof ts !== "number") return String(ts ?? "");
  const d = new Date(ts);
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FullScreenChart({
  isOpen,
  onClose,
  initialSensor,
  history,
}: FullScreenChartProps) {
  const [sensor, setSensor] = useState<SensorKey>(initialSensor);
  const [pointCount, setPointCount] = useState(100);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync initial sensor when opened
  useEffect(() => {
    if (isOpen) setSensor(initialSensor);
  }, [isOpen, initialSensor]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  const meta = SENSOR_META[sensor];

  const chartData = useMemo(() => {
    const visible = pointCount === 0 ? history : history.slice(-pointCount);
    return visible.map((point) => ({
      timestamp: point.timestamp,
      value:
        sensor === "temperature"
          ? (point.temperature ?? point.value)
          : sensor === "moisture"
            ? (point.moisture ?? point.value)
            : sensor === "waterLevel"
              ? (point.waterLevel ?? point.value)
              : (point.light ?? point.value),
    }));
  }, [history, sensor, pointCount]);

  const hasData = chartData.length > 1;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-cyan-900/30 bg-[#0a1628] shadow-2xl outline-none animate-scale-in"
        role="dialog"
        aria-label="Full-screen chart view"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-cyan-900/20 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {meta.label} — Detailed View
            </h2>
            <p className="text-xs text-slate-400">
              {chartData.length} of {history.length} data points
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-white"
            aria-label="Close full-screen chart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Sensor tabs ── */}
        <div className="flex items-center gap-2 border-b border-cyan-900/20 px-6 py-2">
          {SENSOR_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSensor(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                sensor === tab.key
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          <div className="flex-1" />

          {/* Point count selector */}
          <select
            value={pointCount}
            onChange={(e) => setPointCount(Number(e.target.value))}
            className="rounded-lg border border-cyan-900/40 bg-[#0a1628] px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
            aria-label="Number of data points"
          >
            {POINT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Last {n}
              </option>
            ))}
            <option value={0}>All</option>
          </select>
        </div>

        {/* ── Chart ── */}
        <div className="flex-1 px-6 py-4">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id={`fs-gradient-${sensor}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={meta.hexColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={meta.hexColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
                  width={50}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "13px",
                    padding: "10px 14px",
                  }}
                  labelStyle={{ color: "#94a3b8", fontSize: "11px" }}
                  formatter={(value) => {
                    const num = typeof value === "number" ? value : Number(value);
                    return [`${num.toFixed(1)} ${meta.unit}`, meta.label];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={meta.hexColor}
                  strokeWidth={2.5}
                  fill={`url(#fs-gradient-${sensor})`}
                  dot={{ r: 3, fill: meta.hexColor, stroke: "#0a1628", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: meta.hexColor, stroke: "#0a1628", strokeWidth: 2 }}
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-400">
                No data available for this sensor yet.
              </p>
            </div>
          )}
        </div>

        {/* ── Stats footer ── */}
        {hasData && (
          <div className="flex items-center justify-around border-t border-cyan-900/20 px-6 py-3">
            {[
              {
                label: "Min",
                value: Math.min(...chartData.map((d) => d.value)).toFixed(1),
              },
              {
                label: "Max",
                value: Math.max(...chartData.map((d) => d.value)).toFixed(1),
              },
              {
                label: "Avg",
                value: (
                  chartData.reduce((s, d) => s + d.value, 0) / chartData.length
                ).toFixed(1),
              },
              {
                label: "Latest",
                value: chartData[chartData.length - 1].value.toFixed(1),
              },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-[10px] text-slate-500">{stat.label}</p>
                <p className="text-sm font-semibold text-white">
                  {stat.value} <span className="text-[10px] font-normal text-slate-400">{meta.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
