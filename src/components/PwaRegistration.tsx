/**
 * PwaRegistration.tsx
 * ─────────────────────────────────────────────────────────────────
 * Registers the service worker for PWA support.
 * Only runs on the client side and in production.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register the Firebase messaging service worker (also handles caching)
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .then((reg) => {
        console.log("[PWA] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
  }, []);

  return null;
}
