// Deliberately minimal — only caches offline.html and only handles the
// navigation-request offline fallback. Does NOT cache JS/CSS/API responses:
// this is a Supabase-backed, frequently-deployed SPA, and caching hashed
// build assets or API responses risks serving a stale build or stale data
// indefinitely (the classic PWA footgun). Every online request still goes
// straight to the network, untouched.
const CACHE = "trimbly-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
