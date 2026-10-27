// Network-first replacement for the previous Last Moon service worker.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('last-moon-c5-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',()=>{});
