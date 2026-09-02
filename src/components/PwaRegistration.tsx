/**
 * PwaRegistration.tsx
 * ─────────────────────────────────────────────────────────────────
 * Registers the service worker for PWA support.
 * On first load, clears stale caches so fresh chunks are served.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Clear stale caches so Turbopack/dev chunks are never served from cache
    const clearCaches = async () => {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    };

    // Unregister old service workers, clear caches, then re-register fresh
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      // Unregister all old SWs
      for (const reg of registrations) {
        await reg.unregister();
      }
      // Clear all caches
      await clearCaches();
      console.log("[PWA] Caches cleared, registering fresh service worker");

      // Re-register the service worker
      navigator.serviceWorker
        .register("/firebase-messaging-sw.js")
        .then((reg) => {
          console.log("[PWA] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration failed:", err);
        });
    });
  }, []);

  return null;
}
