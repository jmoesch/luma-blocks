/* Luma Blocks PWA: cache only this app, including its two original sounds. */
const PREFIX = 'luma-blocks:' + self.registration.scope + ':';
const CACHE = PREFIX + '1.3.4';
const ASSETS = [
  './','./index.html','./styles.css?v=1.3.4','./game.js?v=1.3.4','./engine.js?v=1.3.4','./audio.js?v=1.3.4','./manifest.webmanifest',
  './assets/maskable-192.png','./assets/maskable-512.png','./assets/icon-192.png','./assets/icon-512.png','./assets/apple-touch-icon.png',
  './assets/favicon.png','./assets/place.wav?v=1.3.4','./assets/clear.wav?v=1.3.4'
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
    event.respondWith(caches.open(CACHE).then(async cache=>{
      const response=await cache.match(isShell?shell.href:event.request.url);
      if(!response)return fetch(event.request);
      const range=event.request.headers.get('range');
      if(!range||!url.pathname.endsWith('.wav'))return response;
      return audioRange(response,range);
    }));
  }
});

// Safari can request just the WAV header before requesting the audio samples.
async function audioRange(response,range){
  const bytes=await response.arrayBuffer();
  const size=bytes.byteLength;
  const match=/^bytes=(\d*)-(\d*)$/i.exec(range);
  if(!match||(!match[1]&&!match[2]))return new Response(bytes,{headers:response.headers});
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
  if(start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{
    'Content-Type':'audio/wav','Accept-Ranges':'bytes','Content-Length':String(end-start+1),
    'Content-Range':`bytes ${start}-${end}/${size}`
  }});
}
