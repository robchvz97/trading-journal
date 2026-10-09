// Sube VERSION al actualizar data.json o assets
const VERSION='tj-v4';
const CORE=['./','./index.html','./style.css','./app.js','./manifest.json','./vendor/chart.umd.min.js','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./data.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.endsWith('data.json')||u.pathname.endsWith('.js')||u.pathname.endsWith('.css')||u.pathname.endsWith('.html')||u.pathname.endsWith('/')){ // red primero para datos frescos
    e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VERSION).then(k=>k.put(e.request,c));return r}).catch(()=>caches.match(e.request)));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(h=>h||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(VERSION).then(k=>k.put(e.request,c))}return r})));
});
