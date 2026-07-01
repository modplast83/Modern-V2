const CACHE_NAME = "mpbf-next-v2";
const STATIC_CACHE = "mpbf-static-v2";

const STATIC_ASSETS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

function isViteDevRequest(url) {
  return (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/client/") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/__") ||
    url.search.includes("import") ||
    url.search.includes("t=") ||
    url.search.includes("v=")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Never intercept Vite dev/HMR module requests — caching them serves stale
  // JavaScript on the dev server and produces a blank page.
  if (isViteDevRequest(url)) {
    return;
  }

  // Only cache-first genuinely static media that is safe to serve stale.
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML, JS and CSS go network-first so the latest code always loads when
  // online; the cache is only used as an offline fallback.
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.headers.get("accept")?.includes("text/html")) {
      const fallback = await caches.match("/");
      if (fallback) return fallback;
    }

    return new Response("Offline", { status: 503 });
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
