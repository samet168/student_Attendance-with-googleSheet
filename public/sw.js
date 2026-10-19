// Service Worker for Student Attendance PWA
const CACHE_NAME = 'stu-atten-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Let browser handle non-GET requests normally
  if (event.request.method !== 'GET') {
    return;
  }

  // Always fetch fresh data from network (especially for dynamic Google Sheets API)
  // Satisfies Chrome PWA install criteria with active fetch listener
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
