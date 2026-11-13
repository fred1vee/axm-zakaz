// Версия кэша. Меняйте при изменении иконок/манифеста; index.html обновляется сам (network-first).
const V = 'uz-v4';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL))));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('uz-') && k !== V) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {   // страница: сначала сеть (свежая версия), без сети — из кэша
    e.respondWith(fetch(r, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const cp = res.clone(); caches.open(V).then((c) => c.put('index.html', cp)); }
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  const font = u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (u.origin !== location.origin && !font) return;   // API и чужие запросы не трогаем
  if (u.pathname.endsWith('/sw.js')) return;
  e.respondWith(caches.match(r).then((hit) => {
    const net = fetch(r).then((res) => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(V).then((c) => c.put(r, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
