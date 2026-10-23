/* ZXmusic Offline Mode — app-shell cache for GitHub Pages.
   Audio blobs are stored separately in IndexedDB by the page. */
const CACHE_NAME = "zxmusic-shell-v1";
const APP_SHELL = ["./", "./index.html"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(APP_SHELL); } catch (error) {
      // GitHub Pages may not expose a root index at the same relative path;
      // keep installing so offline audio storage remains usable.
      console.warn("ZXmusic shell precache partial:", error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("zxmusic-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Do not intercept audio streams or API responses; only cache same-origin app shell/assets.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok && (request.destination === "document" || request.destination === "script" || request.destination === "style" || request.destination === "image" || request.destination === "font")) {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const fallback = await cache.match("./index.html") || await cache.match("./");
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
