const CACHE = "control-entradas-v1";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", evento => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", evento => {
  evento.respondWith(
    caches.match(evento.request).then(respuesta => {
      return respuesta || fetch(evento.request).then(red => {
        const copia = red.clone();
        caches.open(CACHE).then(cache => cache.put(evento.request, copia));
        return red;
      });
    }).catch(() => caches.match("./index.html"))
  );
});
```