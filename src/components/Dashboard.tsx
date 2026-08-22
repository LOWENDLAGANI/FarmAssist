/**
 * Dashboard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Main dashboard composition component.
 *
 * Layout:
 *  • Desktop (≥768px): Left sidebar + top bar + content
 *  • Mobile (<768px): Top bar + content + bottom tab bar
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { SensorKey, SensorTelemetry, ChartDataPoint } from "@/types/telemetry";
import { generateRecommendations } from "@/lib/recommendations";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import SensorCard from "./SensorCard";
import ChartSection from "./ChartSection";
import RecommendationPanel from "./RecommendationPanel";
import SensorsPage from "./pages/SensorsPage";
import CameraPage from "./pages/CameraPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

/** Ordered list of sensor keys displayed in the card grid. */
const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

export default function Dashboard() {
  const isMobile = useIsMobile();

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
        moisture: null,
        waterLevel: null,
        light: null,
      } as Record<SensorKey, number | null>;
    return {
      temperature: latest.temperature,
      moisture: latest.moisture,
      waterLevel: latest.waterLevel,
      light: latest.light,
    };
  }, [latest]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#060e1a] md:flex-row">
      {/* ── Sidebar (desktop only) ── */}
      {!isMobile && (
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
      )}

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Bar ── */}
        <TopBar status={status} lastUpdated={lastUpdated} />

        {/* ── Scrollable content ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-900/30 bg-[#0c1a2e] p-3 sm:mb-6 sm:p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="text-sm text-slate-400">
                Connecting to Firebase…
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-800/40 bg-red-950/30 p-3 sm:mb-6 sm:p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* ── Dashboard page ── */}
          {activePage === "dashboard" && (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
                {SENSOR_KEYS.map((key) => (
                  <SensorCard
                    key={key}
                    sensorKey={key}
                    value={sensorValues[key]}
                    isSelected={activeSensor === key}
                    onSelect={handleSelectSensor}
                    compact={isMobile}
                  />
                ))}
              </div>

              <div className="mb-6 sm:mb-8">
                <ChartSection
                  activeSensor={activeSensor}
                  history={chartHistory}
                />
              </div>

              <RecommendationPanel recommendations={recommendations} />
            </>
          )}

          {/* ── Sensors page ── */}
          {activePage === "sensors" && (
            <SensorsPage latest={latest} />
          )}

          {/* ── Camera page ── */}
          {activePage === "camera" && (
            <CameraPage />
          )}

          {/* ── History page ── */}
          {activePage === "history" && (
            <HistoryPage history={chartHistory} />
          )}

          {/* ── Settings page ── */}
          {activePage === "settings" && (
            <SettingsPage status={status} lastUpdated={lastUpdated} />
          )}
        </main>

        {/* ── Bottom Nav (mobile only) ── */}
        {isMobile && (
          <BottomNav activePage={activePage} onNavigate={setActivePage} />
        )}
      </div>
    </div>
  );
}
