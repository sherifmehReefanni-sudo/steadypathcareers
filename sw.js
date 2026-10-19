/* Steady Path Careers service worker. Pages: network first, offline fallback. Assets: cache first. API calls (script.google.com) are never touched. */
var V = 'sp-20261018a';
var ASSETS = ['/offline.html', '/assets/site.css?v=20261018a', '/assets/site.js?v=20261018a', '/assets/favicon.svg', '/img/icon-192.png', '/manifest.webmanifest'];
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
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(V).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match('/offline.html'); });
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
