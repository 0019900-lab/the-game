/* LAWLESS — Service Worker: يعمل بدون إنترنت، ويحدّث نفسه في الخلفية.
   غيّر رقم VERSION عند كل إصدار جديد لإجبار التحديث. */
var VERSION = 'lawless-v27';
var ASSETS = ['./', './index.html', './sim.js', './rooms.js', './audio.js', './game.js', './manifest.json', './assets/bg.jpg', './assets/bg2.jpg', './assets/bg3.jpg', './assets/w0.webp', './assets/w4.webp', './assets/wbg.jpg', './assets/bg4.jpg', './assets/law-gravity.webp', './assets/law-attraction.webp', './assets/law-reflection.webp', './assets/w1.webp', './assets/w2.webp', './assets/w3.webp', './assets/logo.webp', './assets/btn-start.webp', './assets/emblem.webp',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/icon-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Stale-while-revalidate
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(function () { return hit || cache.match('./index.html'); });
      return hit || net;
    });
  }));
});
