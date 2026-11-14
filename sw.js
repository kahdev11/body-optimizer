/* Service worker – versjonert cache.
 *
 * Cachenavnet følger APP_VERSION i version.js. Siden registrerer denne filen som
 * sw.js?v=<versjon>, så en ny versjon gir en ny service worker som legger alle
 * filene i en ny cache. Den gamle cachen slettes først når den nye tar over.
 *
 * Service workeren rører aldri IndexedDB – brukerdata påvirkes ikke av oppdateringer.
 *
 * NB: Nye filer i appen må legges til i ASSETS-listen under.
 */
importScripts('./version.js');

const CACHE_PREFIX = 'body-optimizer-';
const CACHE = `${CACHE_PREFIX}v${self.APP_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './version.js',
  './css/themes.css',
  './css/base.css',
  './js/app.js',
  './js/db.js',
  './js/migrations.js',
  './js/backup.js',
  './js/theme.js',
  './js/pwa.js',
  './js/router.js',
  './js/ui.js',
  './js/icons.js',
  './js/regions.js',
  './js/scores.js',
  './js/bodymap.js',
  './js/views/today.js',
  './js/views/body.js',
  './js/views/placeholder.js',
  './js/views/settings.js',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // cache: 'reload' går forbi nettleserens HTTP-cache, slik at vi alltid får ferske filer.
      cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Ingen skipWaiting her: brukeren velger selv «Oppdater» i appen.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Versjonssjekken (version.js?check=...) skal alltid gå til nettverket.
  if (url.searchParams.has('check')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(req);
      } catch (err) {
        if (req.mode === 'navigate') {
          const shell = await cache.match('./index.html');
          if (shell) return shell;
        }
        return Response.error();
      }
    })()
  );
});
