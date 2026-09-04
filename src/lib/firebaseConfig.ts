/**
 * firebaseConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Firebase configuration, authentication, and Realtime Database helpers.
 *
 * RTDB paths used by this app (per-user isolation):
 *   • users/{uid}/settings                     — synced user preferences
 *   • users/{uid}/devices/{deviceId}/latest    — live sensor data
 *   • users/{uid}/devices/{deviceId}/history   — chart history
 *   • users/{uid}/devices/{deviceId}/ranges    — sensor thresholds
 *   • users/{uid}/devices/{deviceId}/sessions  — logging sessions
 *   • broadcasts/{id}                         — admin broadcast messages (banner/popup/both)
 * ─────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  type Database,
  ref,
  type DatabaseReference,
} from "firebase/database";
import { getAuth, type Auth } from "firebase/auth";
import { getMessaging, type Messaging } from "firebase/messaging";

// ── Firebase configuration ────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAlLaKUR4q8CZTMFlAFRTM-ToncomN4Ugs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "farmassist-2425.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "https://farmassist-2425-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "farmassist-2425",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "farmassist-2425.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "266165512232",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:266165512232:web:d3ff699e3e770a5e616d1d",
};

// ── Initialize Firebase (singleton pattern) ───────────────────────
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

/** Initialized Realtime Database instance. */
export const db: Database = getDatabase(app);

/** Initialized Firebase Auth instance. */
export const auth: Auth = getAuth(app);

/** Initialized Firebase App instance (for other SDKs like Functions). */
export { app };

// ── Default device configuration ──────────────────────────────────
const DEFAULT_DEVICE_ID = "esp32-farm-001";

/**
 * Gets the current device ID from localStorage.
 * Falls back to the default if none is set.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return DEFAULT_DEVICE_ID;
  return localStorage.getItem("farmassist-device-id") ?? DEFAULT_DEVICE_ID;
}

/**
 * Sets the device ID in localStorage.
 */
export function setDeviceId(id: string): void {
  localStorage.setItem("farmassist-device-id", id);
}

// ── Realtime Database reference helpers (user-scoped) ─────────────

/**
 * Reference to the live telemetry node for a user's device.
 * Path: users/{uid}/devices/{deviceId}/latest
 */
export function telemetryRef(userId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/latest`);
}

/**
 * Reference to the history node for a user's device.
 * Path: users/{uid}/devices/{deviceId}/history
 */
export function sensorHistoryRef(userId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/history`);
}

/**
 * Reference to the telemetry logs node.
 * Path: telemetry_logs
 */
export function telemetryLogsRef(): DatabaseReference {
  return ref(db, "telemetry_logs");
}

/**
 * Reference to the sensor ranges configuration for a user's device.
 * Path: users/{uid}/devices/{deviceId}/ranges
 */
export function sensorRangesRef(userId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/ranges`);
}

/**
 * Reference to the sessions node for a user's device.
 * Path: users/{uid}/devices/{deviceId}/sessions
 */
export function sessionsRef(userId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/sessions`);
}

/**
 * Reference to a specific session's data points.
 * Path: users/{uid}/devices/{deviceId}/sessions/{sessionId}/data
 */
export function sessionDataRef(userId: string, sessionId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/sessions/${sessionId}/data`);
}

/**
 * Reference to a specific session's metadata.
 * Path: users/{uid}/devices/{deviceId}/sessions/{sessionId}
 */
export function sessionRef(userId: string, sessionId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/sessions/${sessionId}`);
}

// ── Invite Code (registration gate) ────────────────────────

/**
 * Reference to the single shared invite code.
 * Path: inviteCode
 *
 * Only the admin can read/write this node (see database.rules.json).
 * Code validation happens server-side in the Cloud Functions, never
 * in the browser.
 *
 * Shape: { code: string, updatedAt: number, updatedBy: string }
 */
export function inviteCodeRef(): DatabaseReference {
  return ref(db, "inviteCode");
}

/**
 * Reference to a user's invite-verification flag.
 * Path: users/{uid}/verified
 *
 * Set to `true` only by the server (registerWithInvite / verifyInviteCode).
 * While it is not `true`, the app is blocked by the invite-code popup.
 */
export function userVerifiedRef(userId: string): DatabaseReference {
  return ref(db, `users/${userId}/verified`);
}

/**
 * Reference to the public registration config node.
 * Path: inviteConfig
 *
 * Anyone (even signed-out visitors on the login screen) can read this,
 * but only the admin can write it (see database.rules.json).
 *
 * Shape: { required: boolean } — true = registration is invite-only
 * (current default when the node is missing); false = anyone can
 * register without entering an invite code.
 */
export function inviteConfigRef(): DatabaseReference {
  return ref(db, "inviteConfig");
}

// ── User Settings ──────────────────────────────────────────

/**
 * Reference to the synced user settings node.
 * Path: users/{uid}/settings
 *
 * Shape: {
 *   deviceId: string,
 *   theme: string,
 *   customTheme: CustomThemeConfig | null,
 * }
 */
export function userSettingsRef(userId: string): DatabaseReference {
  return ref(db, `users/${userId}/settings`);
}

// ── Rover Ownership Registry ─────────────────────────────────

/**
 * Reference to the global ownership record for a Rover.
 * Path: rover_registry/{deviceId}
 *
 * This record is shared across all users (auth != null can read/write).
 * It stores who currently owns the Rover and whether it is paired.
 *
 * Shape: { ownerUid: string, paired: boolean, pairedAt: number }
 */
export function roverRegistryRef(deviceId: string): DatabaseReference {
  return ref(db, `rover_registry/${deviceId}`);
}

// ── Rover Commands ──────────────────────────────────────────

/**
 * Reference to the commands node for a user's device.
 * Path: users/{uid}/devices/{deviceId}/commands
 *
 * The ESP32 polls this node for pending commands.
 * Shape of each child: {
 *   action: string,       // e.g. "watering", "emergency_stop"
 *   timestamp: number,    // Date.now()
 *   status: "pending" | "executed" | "failed"
 * }
 */
export function commandsRef(userId: string, deviceId?: string): DatabaseReference {
  const id = deviceId ?? getDeviceId();
  return ref(db, `users/${userId}/devices/${id}/commands`);
}

// ── Notifications ────────────────────────────────────────────

/**
 * Reference to the notifications node for a user.
 * Path: users/{uid}/notifications
 *
 * Shape of each child: {
 *   id: string,
 *   type: "sensor_alert" | "rover_offline",
 *   title: string,
 *   body: string,
 *   deviceId: string,
 *   createdAt: number,
 *   read: boolean
 * }
 */
export function notificationsRef(userId: string): DatabaseReference {
  return ref(db, `users/${userId}/notifications`);
}

/**
 * Reference to the FCM token stored for a user.
 * Path: users/{uid}/fcmToken
 */
export function fcmTokenRef(userId: string): DatabaseReference {
  return ref(db, `users/${userId}/fcmToken`);
}

// ── Broadcasts (admin) ───────────────────────────────────────

/**
 * Reference to the global broadcasts node.
 * Path: broadcasts
 *
 * Each child is one broadcast message. The dashboard reads this
 * node and renders any active broadcast targeting the current user.
 * Only the single admin account can write (see database.rules.json).
 *
 * Shape of each child: {
 *   message: string,                // text to display
 *   mode: "banner" | "popup" | "both",
 *   createdAt: number,              // Date.now()
 *   audience: "all" | { uids: string[] },
 *   active: boolean,                // false once stopped
 *   sentBy: string,                 // admin UID who sent it
 * }
 */
export function broadcastsRef(): DatabaseReference {
  return ref(db, "broadcasts");
}

/**
 * Reference to a single broadcast.
 * Path: broadcasts/{broadcastId}
 */
export function broadcastRef(broadcastId: string): DatabaseReference {
  return ref(db, `broadcasts/${broadcastId}`);
}

// ── Bans (admin) ────────────────────────────────────────────

/**
 * Reference to the global bans node.
 * Path: bans
 *
 * Each child key is a banned user's UID. Records are written ONLY by
 * the server-side banUser/unbanUser callables — clients cannot write.
 * The banned user can read their own record (to show the ban screen)
 * and the admin can read everything (see database.rules.json).
 *
 * Shape of each child: see src/lib/bans.ts (BanRecord).
 */
export function bansRef(): DatabaseReference {
  return ref(db, "bans");
}

/**
 * Reference to a single user's ban record.
 * Path: bans/{uid} — yields nothing when the user isn't banned.
 */
export function banRef(userId: string): DatabaseReference {
  return ref(db, `bans/${userId}`);
}

/**
 * Firebase Cloud Messaging instance (browser only).
 * Returns null on the server or if messaging is unsupported.
 */
let _messaging: Messaging | null = null;
try {
  if (typeof window !== "undefined") {
    _messaging = getMessaging(app);
  }
} catch {
  // Messaging not available (SSR or unsupported browser)
}
export const messaging: Messaging | null = _messaging;
