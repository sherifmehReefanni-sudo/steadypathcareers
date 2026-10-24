/* Steady Path Careers service worker. Pages: network first, offline fallback; page cache keys drop the query string so sign-in tokens never land in Cache Storage. Assets: cache first. API calls (script.google.com) are never touched. */
var V = 'sp-20261024d';
var ASSETS = ['/offline.html', '/assets/site.css?v=20261023a', '/assets/site.js?v=20261023a', '/assets/path.css?v=20261024c', '/assets/path.js?v=20261024c', '/assets/portal.css?v=20261024d', '/assets/portal.js?v=20261024d', '/assets/fx.js?v=20261024d', '/assets/intake.js?v=20261024d', '/assets/favicon.svg', '/img/icon-192.png', '/manifest.webmanifest'];
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
  if (req.mode === 'navigate') {
    var key = url.origin + url.pathname; // no query string: tokens (?t=) and flags are never cached
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(key, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(key).then(function (hit) { return hit || caches.match('/offline.html'); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
