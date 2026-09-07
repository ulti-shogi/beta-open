// キャッシュの名前と、キャッシュするファイルのリスト
const CACHE_NAME = 'baby-days-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時にファイルをキャッシュに保存する
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// ネットワークリクエストをフックして、キャッシュがあればそれを返す
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // キャッシュがあったらそれを返し、無ければネットワークから取得
        return response || fetch(event.request);
      })
  );
});