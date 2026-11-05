var CACHE_NAME = 'daily-v1';
var ASSETS = ['./index.html', './manifest.json'];

// Install — cache the app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        // Cache successful navigations & same-origin requests
        if (resp.ok && e.request.url.startsWith(self.location.origin)) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      });
    }).catch(function() {
      // Offline fallback
      return caches.match('./index.html');
    })
  );
});

// Listen for messages from the main page to show notifications
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'REMINDER') {
    self.registration.showNotification(e.data.title, {
      body: e.data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎯</text></svg>',
      tag: e.data.tag || 'daily-reminder',
      renotify: true,
      requireInteraction: false
    });
  }
});

// When user clicks the notification, open/focus the app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.indexOf('index.html') >= 0) {
          return clients[i].focus();
        }
      }
      return self.clients.openWindow('./index.html');
    })
  );
});

