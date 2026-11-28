const V='kasir-v26-fix1',C='https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.';
const F=['./','index.html','style.css','manifest.webmanifest','icons/192.png','icons/512.png','icons/logo-kin.png',...['app','db','logic','booking','printer','excel','views/kasir','views/meja','views/booking','views/menu','views/laporan','views/owner','views/manajemen','data-center'].map(x=>`js/${x}.js`),C+'js',C+'wasm'];
self.oninstall=e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>Promise.all(F.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))))};
self.onactivate=e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('kasir-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
self.onfetch=e=>e.respondWith(caches.match(e.request,{ignoreVary:true}).then(r=>r||fetch(e.request).then(res=>{
 if(e.request.method==='GET'&&e.request.url.includes('/xlsx/')){const c=res.clone();caches.open(V).then(ch=>ch.put(e.request,c))}
 return res})));
