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

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useDeviceId } from "@/hooks/useDeviceId";
import { useSensorRanges } from "@/hooks/useSensorRanges";
import { useLoggingSession } from "@/hooks/useLoggingSession";
import { useDeviceValidation } from "@/hooks/useDeviceValidation";
import { useNotifications } from "@/hooks/useNotifications";
import { useCriticalAlerts } from "@/hooks/useCriticalAlerts";
import { useFCM } from "@/hooks/useFCM";
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
import DeviceMismatchBanner from "./DeviceMismatchBanner";
import OwnershipDeniedOverlay from "./OwnershipDeniedOverlay";
import NotificationsPage from "./pages/NotificationsPage";
import CameraPage from "./pages/CameraPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

/** Ordered list of sensor keys displayed in the card grid. */
const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

/** Stagger delay classes for sensor cards */
const STAGGER_CLASSES = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const userId = user?.uid ?? "";

  // ── Navigation state ──────────────────────────────────────
  const [activePage, setActivePage] = useState("dashboard");

  // ── Device pairing ────────────────────────────────────────
  const { deviceId, setDevice } = useDeviceId();

  // ── Device-account linkage validation ──────────────────────
  const {
    status: deviceLinkStatus,
    isLoading: deviceValidationLoading,
    registryInfo,
  } = useDeviceValidation(userId, deviceId);

  // ── Auto-navigate to Settings on first mismatch/unregistered ─
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (deviceValidationLoading) return;
    if (hasRedirectedRef.current) return;
    if (deviceLinkStatus === "taken" || deviceLinkStatus === "unregistered") {
      hasRedirectedRef.current = true;
      setActivePage("settings");
    }
  }, [deviceValidationLoading, deviceLinkStatus]);

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

  // ── Notifications & push ──────────────────────────────────
  const {
    notifications,
    unreadCount,
    createNotification,
    markRead,
    markAllRead,
  } = useNotifications(userId);

  const { requestPermission } = useFCM(userId);

  // Detect critical events and write notifications
  useCriticalAlerts({
    userId,
    deviceId,
    latest,
    ranges,
    status,
    createNotification,
  });

  // ── Auto-request FCM permission on mount ───────────────────
  const fcmRequestedRef = useRef(false);
  useEffect(() => {
    if (!userId || fcmRequestedRef.current) return;
    fcmRequestedRef.current = true;
    requestPermission(userId);
  }, [userId, requestPermission]);

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
      {/* ── Sidebar (desktop only; visibility is controlled by CSS) ── */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} settingsAlert={deviceLinkStatus === "taken" || deviceLinkStatus === "unregistered"} />

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Bar ── */}
        <TopBar
          status={status}
          lastUpdated={lastUpdated}
          deviceId={deviceId}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={(id) => markRead(userId, id)}
          onMarkAllRead={() => markAllRead(userId)}
        />

        {/* ── Scrollable content ── */}
        <main className="relative flex-1 overflow-y-auto p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
          {/* Ownership denied overlay */}
          {deviceLinkStatus === "taken" && activePage !== "settings" && (
            <OwnershipDeniedOverlay
              deviceId={deviceId}
              currentUserUid={userId}
              registryInfo={registryInfo}
              onGoToSettings={() => setActivePage("settings")}
            />
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-900/30 bg-[#0c1a2e] p-3 sm:mb-6 sm:p-4 animate-fade-in">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="text-sm text-slate-400">
                Connecting to device…
              </span>
            </div>
          )}

          {/* Device linkage mismatch banner */}
          <DeviceMismatchBanner
            status={deviceLinkStatus}
            currentDeviceId={deviceId}
            currentUserUid={userId}
            registryInfo={registryInfo}
          />

          {/* Error state — banner for minor, dialog for critical */}
          {error && (
            <>
              <div
                onClick={() => setShowError(true)}
                className="mb-4 cursor-pointer rounded-xl border border-red-800/40 bg-red-950/30 p-3 transition-all hover:border-red-600/50 hover:scale-[1.01] active:scale-[0.99] sm:mb-6 sm:p-4"
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
            <div className="animate-fade-in">
              <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
                {SENSOR_KEYS.map((key, index) => (
                  <div key={key} className={`animate-slide-up ${STAGGER_CLASSES[index]}`}>
                    <SensorCard
                      sensorKey={key}
                      value={sensorValues[key]}
                      isSelected={activeSensor === key}
                      onSelect={handleSelectSensor}
                      compact={isMobile}
                      range={ranges[key]}
                    />
                  </div>
                ))}
              </div>

              <div className="mb-6 sm:mb-8 animate-slide-up stagger-4">
                <ChartSection
                  activeSensor={activeSensor}
                  history={chartHistory}
                />
              </div>

              <div className="animate-slide-up stagger-5">
                <RecommendationPanel recommendations={recommendations} />
              </div>
            </div>
          )}

          {/* ── Notifications page ── */}
          {activePage === "notifications" && (
            <div className="animate-fade-in">
              <NotificationsPage
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={(id) => markRead(userId, id)}
                onMarkAllRead={() => markAllRead(userId)}
              />
            </div>
          )}

          {/* ── Camera page ── */}
          {activePage === "camera" && (
            <div className="animate-fade-in">
              <CameraPage />
            </div>
          )}

          {/* ── History page ── */}
          {activePage === "history" && (
            <div className="animate-fade-in">
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
            </div>
          )}

          {/* ── Settings page ── */}
          {activePage === "settings" && (
            <div className="animate-fade-in">
              <SettingsPage
                status={status}
                lastUpdated={lastUpdated}
                deviceId={deviceId}
                onDeviceChange={setDevice}
                sensorRanges={ranges}
                onRangesSave={updateRanges}
                onRangesReset={resetRanges}
                userUID={userId}
                onCreateNotification={createNotification}
              />
            </div>
          )}
        </main>

        {/* ── Bottom Nav (mobile only; visibility is controlled by CSS) ── */}
        <BottomNav activePage={activePage} onNavigate={setActivePage} settingsAlert={deviceLinkStatus === "taken" || deviceLinkStatus === "unregistered"} />
      </div>
    </div>
  );
}
