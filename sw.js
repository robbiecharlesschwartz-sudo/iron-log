const CACHE = "iron-log-v57";
const SHELL = ["./","./index.html","./app.js","./app.css","./manifest.json","./favicon.ico","./icon-180.png","./icon-192.png","./icon-512.png","./icon-512-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== STATE_CACHE).map((k) => caches.delete(k))))
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
   if no window is focused (i.e. the user has left the app).

   Mobile browsers routinely terminate an idle service worker to save
   resources — often within seconds of the page being backgrounded, well
   before a realistic 60-180s rest period elapses. A plain in-memory
   setTimeout dies silently with it: the notification is just never shown,
   with no way to tell. To survive that, the target time (not just a
   countdown) is persisted via the Cache API, which outlives SW
   termination. Every time this script is (re-)evaluated — which happens
   both on first install AND every time the browser spins the worker back
   up to handle a new event after killing an idle instance — the top-level
   check below runs immediately: if the target already passed while
   nothing was listening, the notification fires right then (late, but
   shown, instead of lost); if time remains, an in-memory timer is
   re-armed for the remainder as a best-effort primary path. */
const STATE_CACHE = "iron-log-state-v1";
const REST_TARGET_KEY = new Request(self.registration.scope + "__rest-target");
let restTimeout = null;

async function getRestTarget() {
  const cache = await caches.open(STATE_CACHE);
  const res = await cache.match(REST_TARGET_KEY);
  if (!res) return null;
  try { return await res.json(); } catch { return null; }
}
async function setRestTarget(at, label) {
  const cache = await caches.open(STATE_CACHE);
  await cache.put(REST_TARGET_KEY, new Response(JSON.stringify({ at, label })));
}
async function clearRestTarget() {
  const cache = await caches.open(STATE_CACHE);
  await cache.delete(REST_TARGET_KEY);
}

async function fireRestNotification(label) {
  const clientsArr = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const anyFocused = clientsArr.some((c) => c.focused || c.visibilityState === "visible");
  if (anyFocused) return; // app is open & visible — the in-app timer/haptic is enough
  await self.registration.showNotification("Rest complete", {
    body: label ? `Time for your next set — ${label}` : "Time for your next set.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "iron-log-rest",
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: { url: "./" },
  });
}

function armRestTimeout(delay, label) {
  if (restTimeout) clearTimeout(restTimeout);
  restTimeout = setTimeout(async () => {
    restTimeout = null;
    await fireRestNotification(label);
    await clearRestTarget();
  }, delay);
}

async function checkOverdueRestOnRevival() {
  const target = await getRestTarget();
  if (!target) return;
  const remaining = target.at - Date.now();
  if (remaining <= 0) {
    await fireRestNotification(target.label);
    await clearRestTarget();
  } else {
    armRestTimeout(remaining, target.label);
  }
}
checkOverdueRestOnRevival();

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "REST_SCHEDULE") {
    const delay = Math.max(0, data.delay || 0);
    const at = Date.now() + delay;
    event.waitUntil(setRestTarget(at, data.label));
    armRestTimeout(delay, data.label);
  } else if (data.type === "REST_CANCEL") {
    if (restTimeout) { clearTimeout(restTimeout); restTimeout = null; }
    event.waitUntil(clearRestTarget());
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
