/**
 * backupRestore.ts
 * ─────────────────────────────────────────────────────────────────
 * Backup and restore utility for FarmAssist settings.
 *
 * Exports user preferences (theme, sensor ranges, notification
 * preferences, etc.) as a JSON file that can be re-imported later.
 * ─────────────────────────────────────────────────────────────────
 */

import type { SensorRanges } from "@/hooks/useSensorRanges";

export interface BackupData {
  version: string;
  exportedAt: string;
  settings: {
    deviceId?: string;
    theme?: string;
    backgroundBlur?: boolean;
    sensorRanges?: SensorRanges;
    notificationSound?: boolean;
    hapticFeedback?: boolean;
  };
}

const BACKUP_VERSION = "1.0";

/** Gather all user settings from localStorage and state. */
export function createBackup(data: {
  deviceId?: string;
  theme?: string;
  backgroundBlur?: boolean;
  sensorRanges?: SensorRanges;
}): BackupData {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      deviceId: data.deviceId,
      theme: data.theme,
      backgroundBlur: data.backgroundBlur,
      sensorRanges: data.sensorRanges,
      notificationSound:
        localStorage.getItem("farmassist-notification-sound") !== "false",
      hapticFeedback:
        localStorage.getItem("farmassist-haptic-feedback") !== "false",
    },
  };
}

/** Download a BackupData object as a JSON file. */
export function downloadBackup(backup: BackupData): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `farmassist-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Parse and validate a backup JSON string. Returns null if invalid. */
export function parseBackup(json: string): BackupData | null {
  try {
    const data = JSON.parse(json);
    if (
      typeof data !== "object" ||
      !data.version ||
      !data.settings
    ) {
      return null;
    }
    return data as BackupData;
  } catch {
    return null;
  }
}

/** Apply a backup to localStorage. Returns the restored settings. */
export function applyBackup(backup: BackupData): {
  deviceId?: string;
  theme?: string;
  backgroundBlur?: boolean;
  sensorRanges?: SensorRanges;
} {
  const { settings } = backup;

  if (settings.notificationSound !== undefined) {
    localStorage.setItem(
      "farmassist-notification-sound",
      String(settings.notificationSound)
    );
  }
  if (settings.hapticFeedback !== undefined) {
    localStorage.setItem(
      "farmassist-haptic-feedback",
      String(settings.hapticFeedback)
    );
  }

  return {
    deviceId: settings.deviceId,
    theme: settings.theme,
    backgroundBlur: settings.backgroundBlur,
    sensorRanges: settings.sensorRanges,
  };
}
