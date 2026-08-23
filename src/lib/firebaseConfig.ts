/**
 * firebaseConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Firebase configuration, authentication, and Realtime Database helpers.
 *
 * RTDB paths used by this app (per-user isolation):
 *   • users/{uid}/devices/{deviceId}/latest    — live sensor data
 *   • users/{uid}/devices/{deviceId}/history   — chart history
 *   • users/{uid}/devices/{deviceId}/ranges    — sensor thresholds
 *   • users/{uid}/devices/{deviceId}/sessions  — logging sessions
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

// ── Device Link Registry ───────────────────────────────────────

/**
 * Reference to the device link record for a user's device.
 * Path: users/{uid}/devices/{deviceId}/link
 *
 * This record is written when a user pairs a Rover in Settings.
 * Its existence confirms that the current user has paired this device.
 */
export function deviceLinkRef(userId: string, deviceId: string): DatabaseReference {
  return ref(db, `users/${userId}/devices/${deviceId}/link`);
}
