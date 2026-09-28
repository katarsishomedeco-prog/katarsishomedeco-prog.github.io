const V = 'partituras-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// La página: primero internet (así siempre ves la última versión); si no hay conexión o tarda más de 2,5 s, la copia guardada.
// El resto (íconos, etc.): copia guardada primero.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = e.request.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (isPage) {
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fromCache = () => caches.match('./index.html').then(r => { if (r && !done) { done = true; resolve(r); } });
      const timer = setTimeout(fromCache, 2500);
      fetch(e.request).then(r => {
        clearTimeout(timer);
        if (r && r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put('./index.html', cp)); }
        if (!done) { done = true; resolve(r); }
      }).catch(() => { clearTimeout(timer); fromCache().then(() => { if (!done) resolve(Response.error()); }); });
    }));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request)));
});
