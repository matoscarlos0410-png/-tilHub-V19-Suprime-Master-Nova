const CACHE_NAME = "utilhub-v19-nova-flow-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest"
];

// INSTALACIÓN
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const file of APP_FILES) {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn("No se pudo guardar en caché:", file);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// PETICIONES
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Solo manejar peticiones GET
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // No interceptar APIs externas
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            // Guardar solamente respuestas válidas
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const copy = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, copy);
                })
                .catch(() => {});
            }

            return networkResponse;
          })
          .catch(() => {
            // Si es una navegación y no hay internet,
            // intentar mostrar la página principal.
            if (request.mode === "navigate") {
              return caches.match("./index.html");
            }

            return new Response(
              "Sin conexión",
              {
                status: 503,
                statusText: "Offline"
              }
            );
          });
      })
  );
});

// MENSAJES DESDE LA PÁGINA
self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  // Actualizar inmediatamente el Service Worker
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Borrar caché de ÚtilHub
  if (event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME)
    );
  }
});
