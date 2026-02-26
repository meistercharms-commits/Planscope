// Planscope Service Worker
// Provides offline caching and PWA install support

const CACHE_NAME = "planscope-v1";

// Core assets to cache for offline shell
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/new-plan",
  "/settings",
  "/login",
  "/signup",
  "/logo-circle.svg",
  "/logo-circle-black-wordmark.svg",
  "/logo-circle-outline-primary.svg",
  "/manifest.json",
];

// Install: precache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API routes — always go to network
  if (url.pathname.startsWith("/api/")) return;

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") return;

  // For navigation requests (HTML pages): network first, fall back to cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache, then fallback to cached dashboard
          return caches.match(event.request).then(
            (cached) => cached || caches.match("/dashboard")
          );
        })
    );
    return;
  }

  // For static assets (JS, CSS, images): cache first, fall back to network
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
      )
    );
    return;
  }
});
