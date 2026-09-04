/**
 * Dashboard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Main dashboard composition component.
 *
 * Layout:
 *  • Desktop (≥768px): Left sidebar + top bar + content
 *  • Mobile (<768px): Top bar + content + bottom tab bar
 *  • Rover Screen Mode (Settings): 7-inch optimized chrome + home
 *
 * All data is scoped per-user via Firebase Auth UID.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import dynamic from "next/dynamic";
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
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { SensorKey } from "@/types/telemetry";
import { generateRecommendations } from "@/lib/recommendations";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ref, remove } from "firebase/database";
import { db } from "@/lib/firebaseConfig";
import { useBroadcasts } from "@/hooks/useBroadcast";
import { isAdminUser } from "@/lib/adminConfig";
import { isOnboardingDone } from "./OnboardingWizard";
import { alertUser } from "@/lib/notificationSound";
import ErrorBoundary from "./ErrorBoundary";
import BroadcastBanner from "./BroadcastBanner";
import BroadcastModal from "./BroadcastModal";
import OnboardingWizard from "./OnboardingWizard";
import ChangelogModal from "./ChangelogModal";
import LocationPrompt from "./LocationPrompt";
import ErrorDialog from "./ErrorDialog";
import DeviceMismatchBanner from "./DeviceMismatchBanner";
import OwnershipDeniedOverlay from "./OwnershipDeniedOverlay";
import RoverScreen, { RoverHome } from "./RoverScreen";

// ── Lazy-loaded chunks (kept out of the initial bundle) ────────────
// Rover screen mode never renders these, so a mounted display (e.g. a
// Raspberry Pi) never has to download or parse them. Each one loads
// on demand the first time it's actually used.
const Sidebar = dynamic(() => import("./Sidebar"), { ssr: false });
const TopBar = dynamic(() => import("./TopBar"), { ssr: false });
const BottomNav = dynamic(() => import("./BottomNav"), { ssr: false });
const SensorCard = dynamic(() => import("./SensorCard"), { ssr: false });
const ChartSection = dynamic(() => import("./ChartSection"), { ssr: false });
const FullScreenChart = dynamic(() => import("./FullScreenChart"), { ssr: false });
const RecommendationPanel = dynamic(() => import("./RecommendationPanel"), { ssr: false });
const WelcomeBanner = dynamic(() => import("./WelcomeBanner"), { ssr: false });
const WeatherWidget = dynamic(() => import("./WeatherWidget"), { ssr: false });
const QuickActionFAB = dynamic(() => import("./QuickActionFAB"), { ssr: false });
const PwaInstallBanner = dynamic(() => import("./PwaInstallBanner"), { ssr: false });
import NotificationsPage from "./pages/NotificationsPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import AccountPage from "./pages/AccountPage";
import ControlPage from "./pages/ControlPage";
import AboutPage from "./pages/AboutPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import {
  SkeletonGauge,
  SkeletonBanner,
  SkeletonChart,
  SkeletonRecommendations,
} from "./Skeleton";

/** Ordered list of sensor keys displayed in the card grid. */
const SENSOR_KEYS: SensorKey[] = ["temperature", "moisture", "waterLevel", "light", "battery"];

/** Stagger delay classes for sensor cards */
const STAGGER_CLASSES = ["stagger-1", "stagger-2", "stagger-3", "stagger-4"];


export default function Dashboard() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const userId = user?.uid ?? "";
  const isAdmin = isAdminUser(userId);

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

  // ── Device pairing + rover screen mode (synced to Firebase) ──
  const { deviceId, setDeviceId: setDevice, backgroundBlur, setBackgroundBlurred, roverMode, setRoverMode } = useAppTheme();

  // ── Keep the display awake while Rover Screen Mode is on ──
  useScreenWakeLock(roverMode);

  // ── Force fullscreen while Rover Screen Mode is on ──
  useFullscreen(roverMode);

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

  // Push notifications are skipped on the rover screen — a mounted display
  // doesn't need them, and it keeps `firebase/messaging` out of the load path.
  const { requestPermission } = useFCM(userId, !roverMode);

  // Detect critical events and write notifications
  useCriticalAlerts({
    userId,
    deviceId,
    latest,
    ranges,
    status,
    createNotification,
  });

  // ── Auto-request FCM permission on mount (not on the rover screen) ──
  const fcmRequestedRef = useRef(false);
  useEffect(() => {
    if (!userId || roverMode || fcmRequestedRef.current) return;
    fcmRequestedRef.current = true;
    requestPermission(userId);
  }, [userId, roverMode, requestPermission]);

  // ── Error dialog state ─────────────────────────────────────
  const [showError, setShowError] = useState(false);

  // ── Active sensor selection ────────────────────────────────
  const [activeSensor, setActiveSensor] = useState<SensorKey>("temperature");

  const handleSelectSensor = useCallback((key: SensorKey) => {
    setActiveSensor(key);
  }, []);

  // ── Full-screen chart state ────────────────────────────────
  const [fullScreenChartOpen, setFullScreenChartOpen] = useState(false);

  // ── Onboarding state ───────────────────────────────────────
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());

  // ── Legacy cleanup: delete leftover programme nodes ────────
  // The programme feature was removed from the app. Older versions
  // wrote users/{uid}/programme (and seeded it for first-time users),
  // so remove any stale node on load to keep the database tidy.
  useEffect(() => {
    if (!userId) return;
    remove(ref(db, `users/${userId}/programme`)).catch(() => {
      // Best-effort cleanup — ignore permission/network errors.
    });
  }, [userId]);

  // ── Broadcast messages (global, admin-sent) ─────────────────
  const { broadcasts } = useBroadcasts(userId);
  const latestBroadcast = broadcasts[0] ?? null;

  // ── Session actions (simplified) ─────
  const handleStartSession = useCallback(
    async (name?: string) => {
      return await startSession(name);
    },
    [startSession]
  );

  const handleStopSession = useCallback(
    async () => {
      await stopSession();
    },
    [stopSession]
  );

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
        battery: null,
      } as Record<SensorKey, number | null>;
    return {
      temperature: latest.temperature,
      moisture: latest.moisture,
      waterLevel: latest.waterLevel,
      light: latest.light,
      battery: latest.battery ?? null,
    };
  }, [latest]);

  // Sidebar collapse → gently animate the main content reflow instead of snapping
  const [contentReflowing, setContentReflowing] = useState(false);
  const handleSidebarCollapsedChange = () => setContentReflowing(true);

  // ── Keyboard shortcuts ────────────────────────────────────
  useKeyboardShortcuts({
    onNavigate: setActivePage,
    onSelectSensor: handleSelectSensor,
    enabled: !showOnboarding,
  });

  // ── Critical event alert (sound + haptic) ─────────────────
  // Watch for critical sensor values and play alert
  const prevCriticalRef = useRef<string>("");
  useEffect(() => {
    if (!latest) return;

    const criticals: string[] = [];
    if (typeof latest.waterLevel === "number" && latest.waterLevel < 10) {
      criticals.push("water_critical");
    }
    if (typeof latest.temperature === "number" && (latest.temperature > 45 || latest.temperature < 5)) {
      criticals.push("temp_critical");
    }

    const key = criticals.join(",");
    if (key && key !== prevCriticalRef.current) {
      alertUser("critical");
    }
    prevCriticalRef.current = key;
  }, [latest]);

  // ── Settings alert dot (pairing needs attention) ──────────
  const settingsAlert = deviceLinkStatus === "taken" || deviceLinkStatus === "unregistered";

  // ── Open a sensor's chart from the rover home ─────────────
  const handleOpenSensorChart = useCallback((key: SensorKey) => {
    setActiveSensor(key);
    setFullScreenChartOpen(true);
  }, []);

  /**
   * Content rendered below the chrome for every page. Shared by both
   * the normal layout and Rover Screen Mode so each page only has to
   * be implemented once.
   */
  const renderPageSections = () => (
    <ErrorBoundary>
      {/* PWA Install Prompt (rover screen is a kiosk — skip it) */}
      {!roverMode && <PwaInstallBanner />}

      {/* Admin broadcast banners (stacked) */}
      {broadcasts.map((b) =>
        b.mode !== "popup" ? <BroadcastBanner key={b.id} broadcast={b} /> : null
      )}

      {/* Ownership denied overlay */}
      {deviceLinkStatus === "taken" && activePage !== "settings" && (
        <OwnershipDeniedOverlay
          deviceId={deviceId}
          currentUserUid={userId}
          registryInfo={registryInfo}
          onGoToSettings={() => setActivePage("settings")}
        />
      )}

      {/* Loading state — use skeletons */}
      {isLoading && activePage === "dashboard" && (
        <div className="animate-fade-in">
          <SkeletonBanner />
          <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonGauge key={i} />
            ))}
          </div>
          <SkeletonChart />
          <SkeletonRecommendations />
        </div>
      )}

      {/* Loading state for non-dashboard pages — simple spinner */}
      {isLoading && activePage !== "dashboard" && (
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
        roverMode ? (
          /* Rover Screen Mode — compact at-a-glance home */
          <div className="h-full animate-fade-in">
            <RoverHome
              values={sensorValues}
              ranges={ranges}
              unreadCount={unreadCount}
              onOpenSensor={handleOpenSensorChart}
              onNavigate={setActivePage}
              onExitRoverMode={() => setRoverMode(false)}
            />
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* ── Welcome hero banner ── */}
            <div className="animate-slide-up">
              <WelcomeBanner userName={user?.displayName ?? undefined} />
            </div>

            {/* ── Weather widget ── */}
            <div className="mb-4 animate-slide-up sm:mb-6">
              <WeatherWidget />
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
                onExpand={() => setFullScreenChartOpen(true)}
              />
            </div>

            <div className="animate-slide-up stagger-5">
              <RecommendationPanel recommendations={recommendations} />
            </div>
          </div>
        )
      )}

      {/* ── Control page ── */}
      {activePage === "control" && (
        <div className="animate-fade-in">
          <ControlPage userId={userId} deviceId={deviceId} />
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

      {/* ── History page ── */}
      {activePage === "history" && (
        <div className="animate-fade-in">
          <HistoryPage
            sessions={sessions}
            activeSession={activeSession}
            isLoading={sessionsLoading}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onRenameSession={renameSession}
            onUpdateNotes={updateNotes}
            onDeleteSession={deleteSession}
            onLoadSessionData={loadSessionData}
            onSubscribeSessionData={subscribeToSessionData}
            onExportCSV={exportSessionCSV}
          />
        </div>
      )}

      {/* ── Account page ── */}
      {activePage === "account" && (
        <div className="animate-fade-in">
          <AccountPage />
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
            backgroundMediaType={backgroundMedia?.type ?? null}
            onBackgroundUpload={saveBackgroundMedia}
            onBackgroundReset={resetBackgroundMedia}
            backgroundBlur={backgroundBlur}
            onBackgroundBlurChange={setBackgroundBlurred}
            onOpenAccountSettings={() => setActivePage("account")}
          />
        </div>
      )}

      {/* ── About page ── */}
      {activePage === "about" && (
        <div className="animate-fade-in">
          <AboutPage />
        </div>
      )}

      {/* ── Admin Panel (admin only) ── */}
      {activePage === "admin" && (
        <div className="animate-fade-in">
          <AdminPanelPage />
        </div>
      )}
    </ErrorBoundary>
  );

  return (
    <>
      {/* ── Onboarding Wizard ── */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* ── What's New Changelog ── */}
      <ChangelogModal />

      {/* ── Location Permission Prompt ── */}
      <LocationPrompt />

      {backgroundMedia?.type === "video" && (
        <video
          className={`fixed inset-0 z-0 h-full w-full object-cover transition-[filter] duration-300 ${backgroundBlur ? "scale-105 blur-lg" : ""}`}
          src={backgroundMedia.url}
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      {backgroundMedia?.type === "image" && (
        <div
          className={`fixed inset-0 z-0 bg-cover bg-center transition-[filter] duration-300 ${backgroundBlur ? "scale-105 blur-lg" : ""}`}
          style={{ backgroundImage: `url("${backgroundMedia.url}")` }}
        />
      )}
      {/* No custom media → blur the default body background (public/background.jpg) */}
      {backgroundBlur && !backgroundMedia && (
        <div className="pointer-events-none fixed inset-0 z-0 backdrop-blur-lg" aria-hidden="true" />
      )}
      <div className="relative z-10 flex h-screen flex-col overflow-hidden md:flex-row">
      {roverMode ? (
        /* ── Rover Screen Mode chrome (7-inch optimized) ── */
        <RoverScreen
          activePage={activePage}
          onNavigate={setActivePage}
          status={status}
          deviceId={deviceId}
          batteryLevel={sensorValues.battery}
          settingsAlert={settingsAlert}
          unreadCount={unreadCount}
        >
          <main className="relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 md:pb-6">
            {renderPageSections()}
          </main>
        </RoverScreen>
      ) : (
        <>
        {/* ── Sidebar (desktop only; visibility is controlled by CSS) ── */}
        <Sidebar activePage={activePage} onNavigate={setActivePage} settingsAlert={settingsAlert} unreadCount={unreadCount} onCollapsedChange={handleSidebarCollapsedChange} isAdmin={isAdmin} />

        {/* ── Main content area ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* ── Top Bar ── */}
          <TopBar
            status={status}
            lastUpdated={lastUpdated}
            deviceId={deviceId}
            batteryLevel={sensorValues.battery}
          />

          {/* ── Scrollable content ── */}
          <main
            onAnimationEnd={() => setContentReflowing(false)}
            className={`relative flex-1 overflow-y-auto p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6 ${contentReflowing ? "animate-content-reflow" : ""}`}
          >
            {renderPageSections()}
          </main>
        </div>
        </>
      )}

      {/* ── Latest admin broadcast popup ── */}
      {latestBroadcast && latestBroadcast.mode !== "banner" && (
        <BroadcastModal broadcast={latestBroadcast} />
      )}

      {/* ── Full-Screen Chart Modal (lazy — only loads when opened) ── */}
      {fullScreenChartOpen && (
        <FullScreenChart
          isOpen={fullScreenChartOpen}
          onClose={() => setFullScreenChartOpen(false)}
          initialSensor={activeSensor}
          history={chartHistory}
        />
      )}

      {/* ── Quick Action FAB (mobile only) ── */}
      {!roverMode && isMobile && activePage === "dashboard" && (
        <QuickActionFAB onNavigateToControl={() => setActivePage("control")} />
      )}

      {/* ── Bottom Nav (mobile only; visibility is controlled by CSS) ── */}
      {!roverMode && (
        <BottomNav activePage={activePage} onNavigate={setActivePage} settingsAlert={settingsAlert} unreadCount={unreadCount} isAdmin={isAdmin} />
      )}
      </div>
    </>
  );
}
