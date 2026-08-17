const CACHE = "iron-log-v49";
const SHELL = ["./","./index.html","./app.js","./app.css","./manifest.json","./favicon.ico","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isShell = event.request.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/app.js") || url.pathname.endsWith("/app.css") || url.pathname.endsWith("/sw.js");

  if (isShell) {
    // Network-first for anything that defines app behavior. A stale cached copy of
    // index.html/app.js is exactly what causes "I redeployed but nothing changed" —
    // always try the network first, and only fall back to cache if truly offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (icons, etc.) where staleness doesn't matter and
  // instant-from-cache offline behavior is the point.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ── Rest-timer notification ─────────────────────────────────────────────
   The app posts REST_SCHEDULE with a delay (ms) when rest starts, and
   REST_CANCEL if the user skips/ends early. We only fire the notification
   if no window is focused (i.e. the user has left the app). */
let restTimeout = null;
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "REST_SCHEDULE") {
    if (restTimeout) clearTimeout(restTimeout);
    const delay = Math.max(0, data.delay || 0);
    restTimeout = setTimeout(async () => {
      restTimeout = null;
      const clientsArr = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const anyFocused = clientsArr.some((c) => c.focused || c.visibilityState === "visible");
      if (anyFocused) return; // app is open & visible — the in-app timer/haptic is enough
      self.registration.showNotification("Rest complete", {
        body: data.label ? `Time for your next set — ${data.label}` : "Time for your next set.",
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: "iron-log-rest",
        renotify: true,
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: "./" },
      });
    }, delay);
  } else if (data.type === "REST_CANCEL") {
    if (restTimeout) { clearTimeout(restTimeout); restTimeout = null; }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of clientsArr) { if ("focus" in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  })());
});
