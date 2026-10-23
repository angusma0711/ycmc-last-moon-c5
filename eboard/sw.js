const CACHE='last-moon-c5-v7';
const ASSETS=['./','./index.html','./style.css?v=6','./engine.js','./app.js?v=4','./pairing.js?v=6','./vendor/qrcode.js','./firebase-config.js','./assets/last-moon-v2.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('last-moon-c5-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return res}).catch(()=>caches.match(e.request).then(c=>c||Response.error())))});
