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
 * Supports guest mode with simulated data for presentations.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthProvider";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useAppTheme } from "./ThemeProvider";
import { useSensorRanges } from "@/hooks/useSensorRanges";
import { useLoggingSession } from "@/hooks/useLoggingSession";
import { useDeviceValidation } from "@/hooks/useDeviceValidation";
import { useNotifications } from "@/hooks/useNotifications";
import { useCriticalAlerts } from "@/hooks/useCriticalAlerts";
import { useFCM } from "@/hooks/useFCM";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { SensorKey } from "@/types/telemetry";
import { generateRecommendations } from "@/lib/recommendations";
import { useProgramme } from "@/hooks/useProgramme";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import SensorCard from "./SensorCard";
import ChartSection from "./ChartSection";
import RecommendationPanel from "./RecommendationPanel";
import WelcomeBanner from "./WelcomeBanner";
import ErrorDialog from "./ErrorDialog";
import DeviceMismatchBanner from "./DeviceMismatchBanner";
import OwnershipDeniedOverlay from "./OwnershipDeniedOverlay";
import GuestModeBanner from "./GuestModeBanner";
import NotificationsPage from "./pages/NotificationsPage";
import CameraPage from "./pages/CameraPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import ControlPage from "./pages/ControlPage";

/** Ordered list of sensor keys displayed in the card grid. */
const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light"];

/** Stagger delay classes for sensor cards */
const STAGGER_CLASSES = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"];

export default function Dashboard() {
  const isMobile = useIsMobile();
  const {
    user,
    isGuest,
    guestLatest,
    guestChartHistory,
    guestStatus,
    guestLastUpdated,
    guestDeviceId,
  } = useAuth();
  const userId = user?.uid ?? "";

  // ── Navigation state ──────────────────────────────────────
  const [activePage, setActivePage] = useState("dashboard");
  const [backgroundMedia, setBackgroundMedia] = useState<{
    type: "image" | "video";
    url: string;
  } | null>(null);

  // Restore the background selected in this browser.
  useEffect(() => {
    const request = indexedDB.open("farmassist", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onsuccess = () => {
      const transaction = request.result.transaction("settings", "readonly");
      const getRequest = transaction.objectStore("settings").get("backgroundMedia");
      getRequest.onsuccess = () => {
        const saved = getRequest.result as { type: "image" | "video"; blob: Blob } | undefined;
        if (saved?.blob) setBackgroundMedia({ type: saved.type, url: URL.createObjectURL(saved.blob) });
      };
    };
  }, []);

  const saveBackgroundMedia = useCallback((file: File) => {
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!type) return;
    setBackgroundMedia((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { type, url: URL.createObjectURL(file) };
    });
    const request = indexedDB.open("farmassist", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onsuccess = () => {
      request.result.transaction("settings", "readwrite").objectStore("settings").put({ type, blob: file }, "backgroundMedia");
    };
  }, []);

  const resetBackgroundMedia = useCallback(() => {
    setBackgroundMedia((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    const request = indexedDB.open("farmassist", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("settings");
    request.onsuccess = () => {
      request.result.transaction("settings", "readwrite").objectStore("settings").delete("backgroundMedia");
    };
  }, []);

  // ── Device pairing (synced to Firebase via ThemeProvider) ──
  const { deviceId, setDeviceId: setDevice } = useAppTheme();

  // ── Device-account linkage validation ──────────────────────
  const {
    status: deviceLinkStatus,
    isLoading: deviceValidationLoading,
    registryInfo,
  } = useDeviceValidation(userId, deviceId);

  // ── Auto-navigate to Settings on first mismatch/unregistered ─
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    if (isGuest) return; // Skip validation in guest mode
    if (deviceValidationLoading) return;
    if (hasRedirectedRef.current) return;
    if (deviceLinkStatus === "taken" || deviceLinkStatus === "unregistered") {
      hasRedirectedRef.current = true;
      setActivePage("settings");
    }
  }, [deviceValidationLoading, deviceLinkStatus, isGuest]);

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
  const { latest, chartHistory, isLoading, status, error, lastUpdated } =
    useTelemetry(
      userId,
      deviceId,
      undefined,
      activeSession ? writeToSession : undefined
    );

  // ── Use guest data if in guest mode ─────────────────────
  const effectiveLatest = isGuest ? guestLatest : latest;
  const effectiveChartHistory = isGuest ? guestChartHistory : chartHistory;
  const effectiveStatus = isGuest ? guestStatus : status;
  const effectiveLastUpdated = isGuest ? guestLastUpdated : lastUpdated;
  const effectiveDeviceId = isGuest ? guestDeviceId : deviceId;

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
    latest: effectiveLatest,
    ranges,
    status: effectiveStatus,
    createNotification,
  });

  // ── Auto-request FCM permission on mount ───────────────────
  const fcmRequestedRef = useRef(false);
  useEffect(() => {
    if (isGuest) return; // Skip FCM in guest mode
    if (!userId || fcmRequestedRef.current) return;
    fcmRequestedRef.current = true;
    requestPermission(userId);
  }, [userId, requestPermission, isGuest]);

  // ── Error dialog state ─────────────────────────────────────
  const [showError, setShowError] = useState(false);

  // ── Active sensor selection ────────────────────────────────
  const [activeSensor, setActiveSensor] = useState<SensorKey>("temperature");

  const handleSelectSensor = useCallback((key: SensorKey) => {
    setActiveSensor(key);
  }, []);

  // ── Programme / phase data for the welcome banner ─────────
  const { badges: programmeBadges } = useProgramme(userId);

  // ── Recommendations (uses configurable ranges) ─────────────
  const recommendations = useMemo(() => {
    if (!effectiveLatest) return [];
    return generateRecommendations(effectiveLatest, ranges);
  }, [effectiveLatest, ranges]);

  // ── Sensor values map for cards ──────────────────────────
  const sensorValues = useMemo(() => {
    if (!effectiveLatest)
      return {
        temperature: null,
        moisture: null,
        waterLevel: null,
        light: null,
      } as Record<SensorKey, number | null>;
    return {
      temperature: effectiveLatest.temperature,
      moisture: effectiveLatest.moisture,
      waterLevel: effectiveLatest.waterLevel,
      light: effectiveLatest.light,
    };
  }, [effectiveLatest]);

  // Guest mode is always "linked" and "live"
  const effectiveDeviceLinkStatus = isGuest ? "linked" as const : deviceLinkStatus;

  // Sidebar collapse → gently animate the main content reflow instead of snapping
  const [contentReflowing, setContentReflowing] = useState(false);
  const handleSidebarCollapsedChange = () => setContentReflowing(true);

  return (
    <>
      {backgroundMedia?.type === "video" && (
        <video className="fixed inset-0 z-0 h-full w-full object-cover" src={backgroundMedia.url} autoPlay loop muted playsInline />
      )}
      {backgroundMedia?.type === "image" && (
        <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url("${backgroundMedia.url}")` }} />
      )}
      <div className="relative z-10 flex h-screen flex-col overflow-hidden md:flex-row">
      {/* ── Sidebar (desktop only; visibility is controlled by CSS) ── */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} settingsAlert={!isGuest && (effectiveDeviceLinkStatus === "taken" || effectiveDeviceLinkStatus === "unregistered")} onCollapsedChange={handleSidebarCollapsedChange} />

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top Bar ── */}
        <TopBar
          status={effectiveStatus}
          lastUpdated={effectiveLastUpdated}
          deviceId={effectiveDeviceId}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={(id) => markRead(userId, id)}
          onMarkAllRead={() => markAllRead(userId)}
        />

        {/* ── Scrollable content ── */}
        <main
          onAnimationEnd={() => setContentReflowing(false)}
          className={`relative flex-1 overflow-y-auto p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6 ${contentReflowing ? "animate-content-reflow" : ""}`}
        >
          {/* Guest Mode Banner */}
          <GuestModeBanner />

          {/* Ownership denied overlay - skip in guest mode */}
          {!isGuest && effectiveDeviceLinkStatus === "taken" && activePage !== "settings" && (
            <OwnershipDeniedOverlay
              deviceId={effectiveDeviceId}
              currentUserUid={userId}
              registryInfo={registryInfo}
              onGoToSettings={() => setActivePage("settings")}
            />
          )}

          {/* Loading state - skip in guest mode */}
          {!isGuest && isLoading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-900/30 bg-[#0c1a2e] p-3 sm:mb-6 sm:p-4 animate-fade-in">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="text-sm text-slate-400">
                Connecting to device…
              </span>
            </div>
          )}

          {/* Device linkage mismatch banner - skip in guest mode */}
          {!isGuest && (
            <DeviceMismatchBanner
              status={effectiveDeviceLinkStatus}
              currentDeviceId={effectiveDeviceId}
              currentUserUid={userId}
              registryInfo={registryInfo}
            />
          )}

          {/* Error state — banner for minor, dialog for critical - skip in guest mode */}
          {!isGuest && error && (
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
              {/* ── Welcome hero banner ── */}
              <div className="animate-slide-up">
                <WelcomeBanner userName={user?.displayName ?? undefined} badges={programmeBadges} />
              </div>

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
                  history={effectiveChartHistory}
                />
              </div>

              <div className="animate-slide-up stagger-5">
                <RecommendationPanel recommendations={recommendations} />
              </div>
            </div>
          )}

          {/* ── Control page ── */}
          {activePage === "control" && (
            <div className="animate-fade-in">
              <ControlPage />
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
                status={effectiveStatus}
                lastUpdated={effectiveLastUpdated}
                deviceId={effectiveDeviceId}
                onDeviceChange={setDevice}
                sensorRanges={ranges}
                onRangesSave={updateRanges}
                onRangesReset={resetRanges}
                userUID={userId}
                onCreateNotification={createNotification}
                backgroundMediaType={backgroundMedia?.type ?? null}
                onBackgroundUpload={saveBackgroundMedia}
                onBackgroundReset={resetBackgroundMedia}
              />
            </div>
          )}
        </main>

        {/* ── Bottom Nav (mobile only; visibility is controlled by CSS) ── */}
        <BottomNav activePage={activePage} onNavigate={setActivePage} settingsAlert={!isGuest && (effectiveDeviceLinkStatus === "taken" || effectiveDeviceLinkStatus === "unregistered")} />
      </div>
      </div>
    </>
  );
}
