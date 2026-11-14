/* Luma Blocks PWA: cache only this app, including its two original sounds. */
const CACHE = 'luma-blocks-v1.1.0';
const ASSETS = [
  './','./index.html','./styles.css','./game.js','./engine.js','./manifest.webmanifest',
  './assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png',
  './assets/favicon.png','./assets/place.wav','./assets/clear.wav'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('luma-blocks-v')&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  if(event.request.mode==='navigate') {
    event.respondWith(fetch(event.request).then(response=>{
      if(response.ok) {const copy=response.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
