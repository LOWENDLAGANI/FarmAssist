// Firebase Cloud Messaging Service Worker
// Handles background push notifications AND static asset caching for offline PWA support.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAlLaKUR4q8CZTMFlAFRTM-ToncomN4Ugs",
  authDomain: "farmassist-2425.firebaseapp.com",
  databaseURL: "https://farmassist-2425-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "farmassist-2425",
  storageBucket: "farmassist-2425.firebasestorage.app",
  messagingSenderId: "266165512232",
  appId: "1:266165512232:web:d3ff699e3e770a5e616d1d",
});

const messaging = firebase.messaging();

// ── Cache names ──────────────────────────────────────────────
const STATIC_CACHE = "farmassist-static-v1";
const RUNTIME_CACHE = "farmassist-runtime-v1";

// Static assets to pre-cache on install (Next.js output)
const PRECACHE_URLS = [
  "/",
  "/favicon.ico",
  "/manifest.json",
  "/farmassist-mascot.png",
  "/background.jpg",
  "/sidebar-banner.png",
];

// ── Install: pre-cache critical static assets ────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for HTML/API, cache-first for static ─
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Firebase/Google API calls — always go to network
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("open-meteo.com") ||
    url.hostname.includes("firebase") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // HTML pages: network-first with offline fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Static assets (_next/static, images, etc.): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
});

// ── FCM: Handle background messages ──────────────────────────
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "FarmAssist";
  const options = {
    body: payload.notification?.body || "",
    icon: "/farmassist-mascot.png",
    badge: "/favicon.ico",
    tag: payload.data?.deviceId || "farmassist",
    renotify: true,
    data: { url: payload.fcmOptions?.link || "/" },
  };

  self.registration.showNotification(title, options);
});

// ── Notification click — open/focus the app ──────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
