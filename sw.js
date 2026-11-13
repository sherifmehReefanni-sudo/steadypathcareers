/* Steady Path Careers service worker. Pages: network first, offline fallback; page cache keys drop the query string so sign-in tokens never land in Cache Storage, and a page opened with ?t= or ?k= is not stored at all. Assets: cache first. API calls (script.google.com) are never touched, so no client data is ever cached. */
var V = 'sp-20261112r43';
var ASSETS = ['/', '/offline.html', '/assets/site.css?v=sp-20261110r30', '/assets/site.js?v=sp-20261112r43', '/assets/path.css?v=sp-20261110r30', '/assets/path.js?v=20261026a', '/assets/r17.css?v=sp-20261110r30', '/assets/r17.js?v=20261106a', '/assets/portal.css?v=sp-20261110r30', '/assets/portal.js?v=20261024e', '/assets/fx.js?v=20261024d', '/assets/intake.js?v=20261024d', '/assets/intake2.js?v=sp-20261112r41', '/assets/theme.css?v=sp-20261110r32', '/assets/favicon.svg', '/img/icon-192.png', '/manifest.webmanifest'];
/* r43: '/' is precached, so the home page opens offline after one visit (stored under its path, the key navigations look up). Nothing under /media/ is ever precached. */
/* r26: new logo. Install fetches every file above past the browser's HTTP cache (cache: 'reload'), so the new mark and icons arrive fresh. */
/* round 18: the portal's app shell (the page and its round 18 files). Never client data: the API is cross-origin and never touched. */
ASSETS = ASSETS.concat(['/portal/', '/assets/portal-r18.css?v=sp-20261110r30', '/assets/portal-r18.js?v=sp-20261112r36']);
/* r27: Find Your Fit files (r35: deeper quiz, work preferences, weekly match check-in; r36: score meaning line) */
ASSETS = ASSETS.concat(['/assets/fit-r35.css?v=sp-20261112r36', '/assets/fit-r35.js?v=sp-20261112r36']);
/* r37: new home page files */
ASSETS = ASSETS.concat(['/assets/home-r37.css?v=sp-20261112r41', '/assets/home-r37.js?v=sp-20261112r43']);
/* r42: portal revamp files (Home, five destinations) */
ASSETS = ASSETS.concat(['/assets/portal-r42.css?v=sp-20261112r42', '/assets/portal-r42.js?v=sp-20261112r42']);
/* r38: the How we check every job page */
ASSETS = ASSETS.concat(['/how-we-check/']);
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
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
  if (url.pathname.indexOf('/media/') === 0) return; // r41: video and captions go straight to the network (range requests are never cached)
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
