// Offline support for the home-screen app. Network first, so updates arrive; the cache covers no signal.
const CACHE = 'tw-9b0c60c9ab';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192-361f1ead.png", "icon-512-361f1ead.png", "apple-touch-icon-361f1ead.png"];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: false }).then(r => r || caches.match('./'))));
});
