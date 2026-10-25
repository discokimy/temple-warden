// Offline support for the home-screen app. Network first, so updates arrive; the cache covers no signal.
const CACHE = 'tw-78e828686b';
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192-361f1ead.png", "icon-512-361f1ead.png", "apple-touch-icon-361f1ead.png"];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // try the network for a moment (so updates arrive), but never keep the player waiting on a bad signal
  const net = fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; });
  const stored = caches.match(e.request).then(r => r || caches.match('./'));
  e.respondWith(new Promise(resolve => {
    let done = false; const give = r => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => stored.then(give), 2500);
    net.then(r => { clearTimeout(t); give(r); }).catch(() => { clearTimeout(t); stored.then(r => give(r || Response.error())); });
  }));
});
