/**
 * notificationPreferences.ts
 * ─────────────────────────────────────────────────────────────────
 * Manages which notification types the user wants to receive.
 * Stored in localStorage (per-browser setting).
 *
 * Alert severity levels:
 *  • critical — water <10%, temp >45°C or <5°C, rover offline
 *  • warning  — sensor outside optimal range
 *  • info     — general notifications (test, etc.)
 * ─────────────────────────────────────────────────────────────────
 */

export type AlertSeverity = "critical" | "warning" | "info";

interface NotificationPreferences {
  critical: boolean;
  warning: boolean;
  info: boolean;
}

const STORAGE_KEY = "farmassist-notification-prefs";

const DEFAULT_PREFS: NotificationPreferences = {
  critical: true,
  warning: true,
  info: true,
};

export function getNotificationPrefs(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setNotificationPref(severity: AlertSeverity, enabled: boolean): void {
  const prefs = getNotificationPrefs();
  prefs[severity] = enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isNotificationEnabled(severity: AlertSeverity): boolean {
  return getNotificationPrefs()[severity];
}
