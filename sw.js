// Guarda la app en la tablet para que abra sin internet.
// Al publicar una versión nueva, cambia el número de CACHE.
const CACHE = 'espacios-confinados-v54';
const CORE = [
  './', 'index.html', 'config-sync.js', 'manifest.webmanifest', 'logo.png', 'icono-ec-192.png', 'icono-ec-512.png', 'icono-ec-maskable-512.png',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=Caveat:wght@700&display=swap'
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
// Archivos de la app (index.html, sw.js, etc.): primero se busca la version nueva en internet
// (si tarda mas de 4 s o no hay señal, se usa la guardada). Asi una mejora llega con abrir la app una vez.
// Librerias externas (versiones fijas): se usan las guardadas.
// Devuelve la respuesta de internet, o null si tarda mas de 'ms'. La descarga sigue aunque se acabe el tiempo.
const fromNet = (r, c, ms) => {
  const full = fetch(r, { cache: 'no-cache' }).then(res => { if (res && res.ok) c.put(r, res.clone()).catch(() => {}); return res; }).catch(() => null);
  return { full, quick: Promise.race([full, new Promise(ok => setTimeout(() => ok(null), ms))]) };
};
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith('http')) return;
  const u = new URL(r.url);
  if (!cacheable(u)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const nav = r.mode === 'navigate';
    if (u.origin === self.location.origin) {
      const n = fromNet(r, c, 4000);
      const res = await n.quick;
      if (res && res.ok) return res;
      const hit = (await c.match(r, { ignoreSearch: nav })) || (nav ? await c.match('index.html') : undefined);
      if (hit) { e.waitUntil(n.full); return hit; }
      // Sin copia guardada (primera vez): esperar a internet aunque sea lento, en lugar de marcar error.
      return (await n.full) || res || Response.error();
    }
    const hit = await c.match(r);
    if (hit) return hit;
    try { const res = await fetch(r); if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()).catch(() => {}); return res; } catch (x) { return Response.error(); }
  })());
});
