// crawlspark.ai — Minimal service worker for PWA installability + basic offline shell
// Only intercepts same-origin http(s) GET requests (never extension URLs).

const CACHE_NAME = "crawlspark-v3";
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

async function putInCache(cache, request, response) {
  if (!response || !response.ok) return;
  try {
    await cache.put(request, response.clone());
  } catch {
    // Ignore quota, opaque, or unsupported scheme errors
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

  // Let the browser handle extensions, cross-origin, POST, etc.
  if (!isCacheableRequest(request)) return;

  const url = new URL(request.url);

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/auth")
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/");
        return (
          cached ||
          new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          })
        );
      }),
    );
    return;
  }

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => putInCache(cache, request, response));
          return response;
        })
        .catch(async () => {
          const cached =
            (await caches.match(request)) || (await caches.match("/"));
          return (
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(png|jpg|jpeg|svg|ico|webp|css|js|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => putInCache(cache, request, response));
          return response;
        });
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          caches.open(CACHE_NAME).then((cache) => putInCache(cache, request, response));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});