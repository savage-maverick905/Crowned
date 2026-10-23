const C="crowned-v4";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.add("/")));self.skipWaiting()});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);
// Never cache API calls or the admin and partner panels: it needs a live session and fresh data.
if(e.request.method!=="GET"||u.pathname.startsWith("/api")||u.pathname.startsWith("/admin")||u.pathname.startsWith("/partner")||u.pathname==="/manifest.webmanifest")return;
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
