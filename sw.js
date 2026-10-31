/* Steady Path Careers service worker. Pages: network first, offline fallback; page cache keys drop the query string so sign-in tokens never land in Cache Storage, and a page opened with ?t= or ?k= is not stored at all. Assets: cache first. API calls (script.google.com) are never touched, so no client data is ever cached. */
var V = 'sp-20261031r18a';
var ASSETS = ['/offline.html', '/assets/site.css?v=20261023a', '/assets/site.js?v=20261027a', '/assets/path.css?v=20261027a', '/assets/path.js?v=20261026a', '/assets/portal.css?v=20261024g', '/assets/portal.js?v=20261024e', '/assets/fx.js?v=20261024d', '/assets/intake.js?v=20261024d', '/assets/intake2.js?v=20261030g', '/assets/favicon.svg', '/img/icon-192.png', '/manifest.webmanifest'];
/* round 18: the portal's app shell (the page and its round 18 files). Never client data: the API is cross-origin and never touched. */
ASSETS = ASSETS.concat(['/portal/', '/assets/portal-r18.css?v=20261031a', '/assets/portal-r18.js?v=20261031a']);
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // never intercept the API or fonts
  var tok = url.searchParams.has('t') || url.searchParams.has('k'); // round 18: a URL with a sign-in token or link key is never stored
  if (tok && req.mode !== 'navigate') return;
  if (req.mode === 'navigate') {
    var key = url.origin + url.pathname; // no query string: tokens (?t=) and flags are never cached
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok && !tok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(key).then(function (hit) { return hit || caches.match('/offline.html'); });
    }));
    return;
  }
  /* data files (testimonials, pay data) always come from the network, so a change or a withdrawn quote shows on the next visit */
  if (/\.json$/i.test(url.pathname)) { e.respondWith(fetch(req).catch(function () { return caches.match(req); })); return; }
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
