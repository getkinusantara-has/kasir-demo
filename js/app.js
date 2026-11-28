import {init} from './db.js';
export const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);
export const coba=async fn=>{try{await fn()}catch(e){alert(e.message)}};
const $=s=>document.querySelector(s),awal=on=>document.body.classList.toggle('awal',on);
const hr=()=>{const e=$('#jam');if(!e)return;const d=new Date();
 e.textContent=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})};
hr();setInterval(hr,1000);
let peran=null;
async function buka(){const n=['kasir','meja','booking','menu','laporan'].find(x=>'#'+x===location.hash)||'kasir';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+n));
 const m=await import(`./views/${n}.js`),el=document.createElement('div');$('main').replaceChildren(el);m.default(el)}
function pilihPeran(){peran=null;awal(true);history.replaceState(null,'',location.pathname+location.search);
 const el=$('main');
 el.innerHTML=`<div class="peran"><h2>Masuk sebagai</h2><button class="utama" data-p="kasir"><b>Kasir</b><small>Transaksi, meja, booking, menu, laporan</small></button><button data-p="manajemen"><b>Manajemen</b><small>Dalam pembuatan</small></button><button data-p="owner"><b>Owner</b><small>Dalam pembuatan</small></button></div>`;
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>masuk(b.dataset.p))}
function masuk(p){
 if(p==='kasir'){peran=p;awal(false);history.replaceState(null,'','#kasir');coba(buka);return}
 const el=$('main');
 el.innerHTML=`<div class="peran"><h2>${p==='owner'?'Owner':'Manajemen'}</h2><div class="nota"><b>Dalam pembuatan</b><small>Halaman ini belum tersedia.</small></div><button id="kembali">Kembali</button></div>`;
 el.querySelector('#kembali').onclick=pilihPeran}
const g=$('#ganti');if(g)g.onclick=pilihPeran;
navigator.locks.request('kasir',{ifAvailable:true},async l=>{
 const sp=$('#splash');
 if(!l){sp?.classList.add('off');$('main').textContent='Kasir sudah terbuka di tab lain. Tutup tab ini.';return}
 try{const jeda=new Promise(r=>setTimeout(r,600));
  await init();navigator.storage?.persist?.();
  addEventListener('hashchange',()=>{if(peran==='kasir')coba(buka)});
  await jeda;pilihPeran();sp?.classList.add('off')}
 catch(e){const s=$('.spin'),t=$('#splash-teks');if(s)s.hidden=true;
  const pesan='Gagal memuat data: '+e.message+'. Muat ulang halaman.';
  if(t)t.textContent=pesan;else $('main').textContent=pesan}
 await new Promise(()=>{})});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
