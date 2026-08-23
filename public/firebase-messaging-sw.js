// Firebase Cloud Messaging Service Worker
// This file handles background push notifications when the browser tab is not focused.

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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "FarmAssist";
  const options = {
    body: payload.notification?.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.data?.deviceId || "farmassist",
    renotify: true,
    data: { url: payload.fcmOptions?.link || "/" },
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow(url);
    })
  );
});
