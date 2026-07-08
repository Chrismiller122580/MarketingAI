// crawlspark.ai — Minimal service worker for PWA installability + basic offline shell
// Only intercepts same-origin http(s) GET requests (never extension URLs).

const CACHE_NAME = "crawlspark-v4";
const APP_SHELL = [
  "/",
  "/dashboard",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

function isCacheableRequest(request) {
  if (request.method !== "GET") return false;
  try {
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.origin !== self.location.origin) return false;
    return true;
  } catch {
    return false;
  }
}

/** Next.js App Router fetches must not be cached or wrapped by the SW. */
function isPassthroughRequest(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/")) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (url.pathname.includes("/auth")) return true;
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  if (request.headers.get("Next-Action")) return true;
  return false;
}

function offlineResponse(contentType = "text/plain; charset=utf-8") {
  return new Response("Offline", {
    status: 503,
    headers: { "Content-Type": contentType },
  });
}

async function putInCache(cache, request, response) {
  if (!response || !response.ok) return;
  try {
    await cache.put(request, response.clone());
  } catch {
    // Ignore quota, opaque, or unsupported scheme errors
  }
}

async function networkFirst(request, options = {}) {
  const { cacheName, offlineHtml = false } = options;
  try {
    const response = await fetch(request);
    if (cacheName && response.ok) {
      const cache = await caches.open(cacheName);
      await putInCache(cache, request, response);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (offlineHtml) {
      const shell = await caches.match("/");
      if (shell) return shell;
      return offlineResponse("text/html; charset=utf-8");
    }
    return offlineResponse();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(APP_SHELL).catch(() => {
          // Best-effort precache; missing assets must not block install
        }),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (!isCacheableRequest(request) || isPassthroughRequest(request)) {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      networkFirst(request, { cacheName: CACHE_NAME, offlineHtml: true }),
    );
    return;
  }

  if (/\.(png|jpg|jpeg|svg|ico|webp|css|js|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        return networkFirst(request, { cacheName: CACHE_NAME });
      }),
    );
    return;
  }

  event.respondWith(networkFirst(request, { cacheName: CACHE_NAME }));
});