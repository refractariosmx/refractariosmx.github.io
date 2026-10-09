// Guarda la app en la tablet para que abra sin internet.
// Al publicar una versión nueva, cambia el número de CACHE.
const CACHE = 'espacios-confinados-v1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const nav = r.mode === 'navigate';
    const hit = await c.match(r, { ignoreSearch: nav }) || (nav ? await c.match('index.html') : undefined);
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()).catch(() => {}); return res; }).catch(() => null);
    if (hit) { if (new URL(r.url).origin === self.location.origin) e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
