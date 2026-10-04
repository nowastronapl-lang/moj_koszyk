const CACHE_NAME = 'moj-koszyk-v1';

// Instalacja i natychmiastowe przejęcie kontroli
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      // Czyszczenie starych wersji cache
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      });
    })
  );
});

// Strategia Network-First: Zawsze pobieraj najnowsze pliki z Vercel, gdy jest sieć
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Jeśli pobrano plik z sieci, zaktualizuj kopię podręczną
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request)) // Gdy brak sieci, ładuj z pamięci
  );
});