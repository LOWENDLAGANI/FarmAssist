/**
 * Dashboard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Main dashboard composition component.
 *
 * Layout:
 *  • Desktop (≥768px): Left sidebar + top bar + content
 *  • Mobile (<768px): Top bar + content + bottom tab bar
 *
 * All data is scoped per-user via Firebase Auth UID.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useMemo, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useSensorRanges } from "@/hooks/useSensorRanges";
import { useLoggingSession } from "@/hooks/useLoggingSession";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { SensorKey } from "@/types/telemetry";
import { generateRecommendations } from "@/lib/recommendations";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import SensorCard from "./SensorCard";
import ChartSection from "./ChartSection";
import RecommendationPanel from "./RecommendationPanel";
import ErrorDialog from "./ErrorDialog";
import SensorsPage from "./pages/SensorsPage";
import CameraPage from "./pages/CameraPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

/** Ordered list of sensor keys displayed in the card grid. */
const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const userId = user?.uid ?? "";

  // ── Navigation state ──────────────────────────────────────
  const [activePage, setActivePage] = useState("dashboard");

  // ── Device pairing ────────────────────────────────────────
  const { deviceId, setDevice } = useDeviceId();

  // ── Logging session management (user-scoped) ──────────────
  const {
    sessions,
    activeSession,
    isLoading: sessionsLoading,
    startSession,
    stopSession,
    renameSession,
    updateNotes,
    deleteSession,
    loadSessionData,
    subscribeToSessionData,
    writeToSession,
    exportSessionCSV,
  } = useLoggingSession(userId, deviceId);

  // ── Real-time telemetry from Firebase (user-scoped) ─────────
  // Pass writeToSession as callback — called on every new reading
  // when a session is active
  const { latest, chartHistory, isLoading, status, error, lastUpdated } =
    useTelemetry(
      userId,
      deviceId,
      undefined,
      activeSession ? writeToSession : undefined
    );

  // ── User-configurable sensor ranges (user-scoped) ─────────
  const {
    ranges,
    updateRanges,
    resetToDefaults: resetRanges,
  } = useSensorRanges(userId, deviceId);

  // ── Error dialog state ─────────────────────────────────────
  const [showError, setShowError] = useState(false);

  // ── Active sensor selection ────────────────────────────────
  const [activeSensor, setActiveSensor] = useState<SensorKey>("temperature");

  const handleSelectSensor = useCallback((key: SensorKey) => {
    setActiveSensor(key);
  }, []);

  // ── Recommendations (uses configurable ranges) ─────────────
  const recommendations = useMemo(() => {
    if (!latest) return [];
    return generateRecommendations(latest, ranges);
  }, [latest, ranges]);

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
        <TopBar status={status} lastUpdated={lastUpdated} deviceId={deviceId} />

        {/* ── Scrollable content ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-900/30 bg-[#0c1a2e] p-3 sm:mb-6 sm:p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="text-sm text-slate-400">
                Connecting to device…
              </span>
            </div>
          )}

          {/* Error state — banner for minor, dialog for critical */}
          {error && (
            <>
              <div
                onClick={() => setShowError(true)}
                className="mb-4 cursor-pointer rounded-xl border border-red-800/40 bg-red-950/30 p-3 transition-colors hover:border-red-600/50 sm:mb-6 sm:p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-400 flex-1">{error}</span>
                  <span className="text-[10px] text-red-500 shrink-0">Click for details</span>
                </div>
              </div>
              {showError && (
                <ErrorDialog error={error} onClose={() => setShowError(false)} />
              )}
            </>
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
                    range={ranges[key]}
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
            <SensorsPage latest={latest} sensorRanges={ranges} />
          )}

          {/* ── Camera page ── */}
          {activePage === "camera" && (
            <CameraPage />
          )}

          {/* ── History page ── */}
          {activePage === "history" && (
            <HistoryPage
              sessions={sessions}
              activeSession={activeSession}
              isLoading={sessionsLoading}
              onStartSession={startSession}
              onStopSession={stopSession}
              onRenameSession={renameSession}
              onUpdateNotes={updateNotes}
              onDeleteSession={deleteSession}
              onLoadSessionData={loadSessionData}
              onSubscribeSessionData={subscribeToSessionData}
              onExportCSV={exportSessionCSV}
            />
          )}

          {/* ── Settings page ── */}
          {activePage === "settings" && (
            <SettingsPage
              status={status}
              lastUpdated={lastUpdated}
              deviceId={deviceId}
              onDeviceChange={setDevice}
              sensorRanges={ranges}
              onRangesSave={updateRanges}
              onRangesReset={resetRanges}
              userUID={userId}
            />
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
