/**
 * firebaseConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Firebase configuration and Realtime Database helpers.
 *
 * ⚠️  SETUP INSTRUCTIONS:
 * 1. Replace the placeholder values below with your actual Firebase
 *    project credentials from the Firebase Console:
 *    https://console.firebase.google.com → Project Settings → General
 *
 * 2. Enable Realtime Database in your Firebase project.
 *
 * 3. Set up Realtime Database security rules to allow reads/writes from your
 *    dashboard and writes from the ESP microcontroller.
 *
 * 4. Optionally set the FIREBASE_* environment variables in .env.local
 *    to avoid hardcoding credentials in source.
 *
 * Realtime Database paths used by this app:
 *   • sensors/latest           — live sensor data (ESP writes, dashboard reads)
 *   • sensors/history          — historical chart snapshots (dashboard writes/reads)
 *   • telemetry_logs           — telemetry log entries
 * ─────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  type Database,
  ref,
  type DatabaseReference,
} from "firebase/database";

// ── Firebase configuration ────────────────────────────────────────
// These values come from your Firebase project settings.
// In production, use environment variables: process.env.NEXT_PUBLIC_FIREBASE_*
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAuWDWRSVJU-73_lYoefIxiLq8HFyhfc7o",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "farmassist-2425.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "https://farmassist-2425-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "farmassist-2425",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "farmassist-2425.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:000000000000:web:0000000000000000",
};

// ── Initialize Firebase (singleton pattern) ───────────────────────
// Prevents multiple Firebase app instances during hot-reload in dev.
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

/** Initialized Realtime Database instance. */
export const db: Database = getDatabase(app);

// ── Default device configuration ──────────────────────────────────
// Change this to match your ESP microcontroller's device ID.
export const DEVICE_ID =
  process.env.NEXT_PUBLIC_DEVICE_ID ?? "esp32-farm-001";

// ── Realtime Database reference helpers ───────────────────────────

/**
 * Reference to the live telemetry node.
 * Path: sensors/latest
 * The ESP writes sensor readings to this node in real time.
 */
export function telemetryRef(): DatabaseReference {
  return ref(db, "sensors/latest");
}

/**
 * Reference to the history node for a specific sensor metric.
 * Path: sensors/history/{metricType}
 */
export function historyRef(metricType: string): DatabaseReference {
  return ref(db, `sensors/history/${metricType}`);
}

/**
 * Reference to the telemetry logs node.
 * Path: telemetry_logs
 */
export function telemetryLogsRef(): DatabaseReference {
  return ref(db, "telemetry_logs");
}
