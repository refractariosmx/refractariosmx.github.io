// Guarda la app en la tablet para que abra sin internet.
// Al publicar una versión nueva, cambia el número de CACHE.
const CACHE = 'espacios-confinados-v5';
const CORE = [
  './', 'index.html', 'config-sync.js', 'manifest.webmanifest', 'logo.png', 'icon-192.png', 'icon-512.png',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&display=swap'
];
// Solo se guardan en la tablet los archivos de la app; el trafico de sincronizacion pasa directo.
const STATIC = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const cacheable = u => u.origin === self.location.origin || STATIC.includes(u.hostname) || (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http') || !cacheable(new URL(r.url))) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const nav = r.mode === 'navigate';
    const hit = await c.match(r, { ignoreSearch: nav }) || (nav ? await c.match('index.html') : undefined);
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()).catch(() => {}); return res; }).catch(() => null);
    if (hit) { if (new URL(r.url).origin === self.location.origin) e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
