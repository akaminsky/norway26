/* Norway Fjords Roadtrip — service worker.

   Offline strategy (wifi is spotty in the fjords):
   - App shell (our HTML): network-first, cached fallback → newest when online,
     still loads offline.
   - App libraries (React / Babel / Leaflet) + fonts: cache-first → the app
     renders offline once they've been fetched at least once.
   - Map tiles (Esri satellite / OpenTopoMap): cache-first with a size cap →
     tiles you've viewed while online are available offline.
   - Weather / place-search APIs: left to the network (offline, the app falls
     back to the last forecast it saved in local storage).

   Bump BUILD on each deploy to force already-installed clients to update. */
const BUILD = '2026-07-23a';
const CACHE = 'norway-shell-' + BUILD;   // app shell + libraries + fonts
const TILES = 'norway-tiles-v1';         // map tiles (kept across deploys)
const TILE_CAP = 700;                    // ~ up to a few hundred MB worst case; trims oldest

const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const LIBS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7/babel.min.js'
];

function isTile(url) {
  return url.hostname.indexOf('arcgisonline.com') !== -1 || url.hostname.indexOf('opentopomap.org') !== -1 || url.hostname.indexOf('cartocdn.com') !== -1;
}
function isLibOrFont(url) {
  return url.hostname === 'unpkg.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil((async function () {
    const c = await caches.open(CACHE);
    // cache:'reload' bypasses the browser HTTP cache — GitHub Pages serves with
    // max-age=600, so a plain addAll can bake a stale shell into a fresh deploy.
    await Promise.all(SHELL.map(function (u) {
      return fetch(u, { cache: 'reload' }).then(function (r) { return c.put(u, r); }).catch(function () {});
    }));
    // Best-effort precache of the libraries so the app can boot offline immediately.
    await Promise.all(LIBS.map(function (u) {
      return fetch(u, { mode: 'cors' }).then(function (r) { return c.put(u, r); }).catch(function () {});
    }));
  })());
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    const keys = await caches.keys();
    // Drop old shell caches; keep the current shell and the tile cache.
    await Promise.all(keys.map(function (k) {
      if (k === CACHE || k === TILES) return null;
      return caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

async function cacheFirst(cacheName, req) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  try { await c.put(req, res.clone()); } catch (e) {}
  return res;
}

async function tileFirst(req) {
  const c = await caches.open(TILES);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  try {
    await c.put(req, res.clone());
    const keys = await c.keys();
    if (keys.length > TILE_CAP) {
      for (let i = 0; i < keys.length - TILE_CAP; i++) await c.delete(keys[i]);
    }
  } catch (e) {}
  return res;
}

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Map tiles → cache-first (capped).
  if (isTile(url)) { e.respondWith(tileFirst(req).catch(function () { return caches.match(req); })); return; }

  // Libraries + fonts → cache-first.
  if (isLibOrFont(url)) { e.respondWith(cacheFirst(CACHE, req).catch(function () { return caches.match(req); })); return; }

  // Other cross-origin (weather, place search) → network, let the app handle failures.
  if (url.origin !== self.location.origin) return;

  // Our own HTML → network-first with cached fallback.
  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isDoc) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  // Same-origin static assets (icons, manifest) → stale-while-revalidate.
  e.respondWith(
    caches.match(req).then(function (cached) {
      const net = fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
