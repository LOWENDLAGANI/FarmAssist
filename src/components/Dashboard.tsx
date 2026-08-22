/**
 * Dashboard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Main dashboard composition component.
 *
 * Layout:
 *  • Left sidebar with icon navigation
 *  • Top bar with title and status
 *  • Sensor cards in horizontal row with circular gauges
 *  • Chart section below
 *  • Recommendation panel at bottom
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTelemetry } from "@/hooks/useTelemetry";
import type { SensorKey, SensorTelemetry, ChartDataPoint } from "@/types/telemetry";
import { generateRecommendations } from "@/lib/recommendations";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import SensorCard from "./SensorCard";
import ChartSection from "./ChartSection";
import RecommendationPanel from "./RecommendationPanel";

/** Ordered list of sensor keys displayed in the card grid. */
const SENSOR_KEYS: SensorKey[] = ["temperature", "humidity", "moisture", "waterLevel"];

export default function Dashboard() {
  // ── Navigation state ──────────────────────────────────────
  const [activePage, setActivePage] = useState("dashboard");

  // ── Real-time telemetry from Firebase ───────────────────────
  const { latest, isLoading, status, error, lastUpdated } =
    useTelemetry();

  // ── Active sensor selection ────────────────────────────────
  const [activeSensor, setActiveSensor] = useState<SensorKey>("temperature");

  // ── Rolling history for chart — rebuilds when latest changes ──
  const [chartHistory, setChartHistory] = useState<ChartDataPoint[]>([]);
  const prevLatestRef = useRef<SensorTelemetry | null>(null);

  // Append new readings to chart history when latest telemetry changes
  useEffect(() => {
    if (!latest || latest === prevLatestRef.current) return;

    const newPoint: ChartDataPoint = {
      timestamp: latest.timestamp,
      value: latest[activeSensor],
    };

    setChartHistory((prev) => {
      // Deduplicate by timestamp
      if (prev.length > 0 && prev[prev.length - 1]!.timestamp === newPoint.timestamp) {
        return prev;
      }
      const next = [...prev, newPoint];
      return next.length > 15 ? next.slice(next.length - 15) : next;
    });

    prevLatestRef.current = latest;
  }, [latest, activeSensor]);

  // Clear chart history when switching sensors
  const handleSelectSensor = useCallback((key: SensorKey) => {
    setActiveSensor(key);
    setChartHistory([]);
  }, []);

  // ── Recommendations ──────────────────────────────────────
  const recommendations = useMemo(() => {
    if (!latest) return [];
    return generateRecommendations(latest);
  }, [latest]);

  // ── Sensor values map for cards ──────────────────────────
  const sensorValues = useMemo(() => {
    if (!latest)
      return {
        temperature: null,
        humidity: null,
        moisture: null,
        waterLevel: null,
      } as Record<SensorKey, number | null>;
    return {
      temperature: latest.temperature,
      humidity: latest.humidity,
      moisture: latest.moisture,
      waterLevel: latest.waterLevel,
    };
  }, [latest]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060e1a]">
      {/* ── Sidebar ── */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Bar ── */}
        <TopBar status={status} lastUpdated={lastUpdated} />

        {/* ── Scrollable content ── */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-cyan-900/30 bg-[#0c1a2e] p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="text-sm text-slate-400">
                Connecting to Firebase…
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-800/40 bg-red-950/30 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ── Sensor cards grid (horizontal) ── */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {SENSOR_KEYS.map((key) => (
              <SensorCard
                key={key}
                sensorKey={key}
                value={sensorValues[key]}
                isSelected={activeSensor === key}
                onSelect={handleSelectSensor}
              />
            ))}
          </div>

          {/* ── Chart ── */}
          <div className="mb-8">
            <ChartSection
              activeSensor={activeSensor}
              history={chartHistory}
            />
          </div>

          {/* ── Recommendations ── */}
          <RecommendationPanel recommendations={recommendations} />
        </main>
      </div>
    </div>
  );
}
