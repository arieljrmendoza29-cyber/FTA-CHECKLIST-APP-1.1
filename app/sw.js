/* FTA Checklist app: works offline after the first visit.
   To push an update to everyone, change VERSION below and upload this file again. */
const VERSION = "fta-checklist-app-v3";
const CORE = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
              "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // the page itself: try the network first so updates show up, fall back to the saved copy offline
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("index.html", copy)); return r; })
      .catch(() => caches.match("index.html")));
    return;
  }
  // settings.json (the dates): always get the latest, use the saved copy only when offline
  if (url.origin === location.origin && url.pathname.endsWith("/settings.json")) {
    e.respondWith(fetch(req, { cache: "no-store" }).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put("settings.json", copy)); return r; })
      .catch(() => caches.match("settings.json")));
    return;
  }
  // icons and Google Fonts: use the saved copy, refresh it in the background
  if (url.origin === location.origin || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
