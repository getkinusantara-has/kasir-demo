import {init} from './db.js';
export const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);
export const coba=async fn=>{try{await fn()}catch(e){alert(e.message)}};
async function buka(){const n=['kasir','meja','menu','laporan'].find(x=>'#'+x===location.hash)||'kasir';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+n));
 const m=await import(`./views/${n}.js`),el=document.createElement('div');document.querySelector('main').replaceChildren(el);m.default(el)}
navigator.locks.request('kasir',{ifAvailable:true},async l=>{
 if(!l){document.querySelector('main').textContent='Kasir sudah terbuka di tab lain. Tutup tab ini.';return}
 await coba(async()=>{await init();navigator.storage?.persist?.();addEventListener('hashchange',buka);await buka()});
 await new Promise(()=>{})});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
