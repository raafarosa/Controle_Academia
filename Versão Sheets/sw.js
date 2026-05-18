// Service Worker minimalista - eventos básicos apenas
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  // Transparent - sem tratamento, passa direto para rede
});