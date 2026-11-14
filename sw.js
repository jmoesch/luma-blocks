/* Luma Blocks PWA: cache only this app, including its two original sounds. */
const PREFIX = 'luma-blocks:' + self.registration.scope + ':';
const CACHE = PREFIX + '1.2.3';
const ASSETS = [
  './','./index.html','./styles.css?v=1.2.3','./game.js?v=1.2.3','./engine.js?v=1.2.3','./manifest.webmanifest',
  './assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png',
  './assets/favicon.png','./assets/place.wav','./assets/clear.wav'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(!url.href.startsWith(self.registration.scope))return;
  const shell = new URL('./index.html', self.registration.scope);
  const root = new URL('./', self.registration.scope);
  const isShell = event.request.mode==='navigate' &&
    (url.pathname===root.pathname || url.pathname===shell.pathname);
  // Serve the HTML and its modules from the same installed release.
  if(isShell || ASSETS.some(path=>new URL(path,root).href===url.href)){
    event.respondWith(caches.open(CACHE).then(async cache=>
      await cache.match(isShell?shell.href:event.request) || fetch(event.request)));
  }
});
