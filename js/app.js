import {init} from './db.js';
import {mintaAkses} from './lock.js';
export const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);
export const coba=async fn=>{try{await fn()}catch(e){alert(e.message)}};
const $=s=>document.querySelector(s);
const setMode=p=>{
 document.body.classList.toggle('awal',!p);
 document.body.classList.toggle('kasir',p==='kasir');
 document.body.classList.toggle('owner',p==='owner');
 document.body.classList.toggle('manajemen',p==='manajemen');
};
const hr=()=>{
 const e=$('#jam');if(!e)return;
 const d=new Date();
 e.textContent=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
};
hr();setInterval(hr,1000);
let peran=null,sesi=null,aktifTerakhir=Date.now();
export const sesiSaatIni=()=>sesi;
const tampilSesi=()=>{const e=$('#menu-sesi');if(e)e.textContent=sesi?`Masuk: ${sesi.nama} (${sesi.jabatan})`:''};
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{aktifTerakhir=Date.now()},{passive:true}));
setInterval(()=>{if(sesi&&Date.now()-aktifTerakhir>10*60*1000)pilihPeran()},15000);

const panduan={
 kasir:[
  ['Kasir','Melayani transaksi penjualan, pembayaran, dan pencetakan struk.'],
  ['Meja','Mengelola ketersediaan meja, status penggunaan, dan perpindahan pelanggan.'],
  ['Booking','Mengelola reservasi pelanggan, jadwal kedatangan, dan konfirmasi booking.'],
  ['Menu','Mengatur daftar produk, kategori, harga, dan ketersediaan menu.'],
  ['Laporan','Melihat rekap transaksi, penjualan harian, dan menu terjual.']
 ],
 manajemen:[
  ['Inventori','Melakukan stock opname dan mencatat penerimaan barang.'],
  ['Staf','Mengatur jadwal kerja dan memantau absensi karyawan.'],
  ['Kasir','Memvalidasi pembatalan transaksi dan pemberian diskon khusus.']
 ],
 owner:[
  ['Strategi','Menganalisis laba rugi dan performa setiap cabang.'],
  ['Manajemen','Mengelola master data dan memberikan persetujuan pembelian.']
 ]
};
function kartuPanduanAwal(){
 return `<section class="panduan panduan-awal" aria-label="Panduan penggunaan">
  <div class="panduan-kepala"><span class="panduan-label">PANDUAN PENGGUNAAN</span><h2>Selamat datang</h2><p>Kenali fungsi setiap menu berdasarkan peran yang tersedia di aplikasi.</p></div>
  <div class="panduan-daftar">
   <article class="panduan-item"><b>Kasir</b><p>Mengelola transaksi penjualan, meja, booking, menu, dan laporan penjualan.</p></article>
   <article class="panduan-item"><b>Manajemen</b><p>Mengelola inventori, jadwal kerja, absensi karyawan, serta persetujuan transaksi khusus.</p></article>
   <article class="panduan-item"><b>Owner</b><p>Memantau kinerja usaha, menganalisis laporan keuangan, dan mengelola kebijakan operasional.</p></article>
  </div>
  <div class="panduan-info"><b>Informasi</b><p>Beberapa fitur masih dalam tahap pengembangan dan akan tersedia pada pembaruan berikutnya.</p></div>
 </section>`;
}
async function buka(){
 const n=['kasir','meja','booking','menu','laporan'].find(x=>'#'+x===location.hash)||'kasir';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+n));
 const m=await import(`./views/${n}.js`),host=document.createElement('div'),el=document.createElement('div');
 host.append(el);$('main').replaceChildren(host);m.default(el);
}
function tutupMenu(){
 const panel=$('#menu-peran-panel'),toggle=$('#menu-toggle');
 panel.hidden=true;toggle.setAttribute('aria-expanded','false');
}
function toggleMenu(){
 const panel=$('#menu-peran-panel'),toggle=$('#menu-toggle');
 panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
}
function pilihPeran(){
 peran=null;sesi=null;tampilSesi();setMode(null);tutupMenu();
 history.replaceState(null,'',location.pathname+location.search);
 $('main').innerHTML=kartuPanduanAwal()+'<section class="landing landing-pilih"><p>Pilih peran melalui menu untuk mulai menggunakan aplikasi.</p></section>';
}
async function masuk(p){
 tutupMenu();
 if(p!=='kasir'){
  let u;try{u=await mintaAkses(p)}catch(e){alert(e.message);return}
  if(!u)return;
  sesi=u;
 }else sesi=null;
 aktifTerakhir=Date.now();
 peran=p;setMode(p);tampilSesi();
 if(p==='kasir'){history.replaceState(null,'','#kasir');coba(buka);return;}
 history.replaceState(null,'',location.pathname+location.search);
 if(p==='owner'){
  try{const m=await import('./views/owner.js');m.default($('main'));}
  catch(e){$('main').innerHTML=`<section class="peran"><div class="nota"><b>Gagal membuka Owner</b><small>${esc(e.message)}</small></div></section>`;}
  return;
 }
 if(p==='manajemen'){
  try{const m=await import('./views/manajemen.js');m.default($('main'));}
  catch(e){$('main').innerHTML=`<section class="peran"><div class="nota"><b>Gagal membuka Manajemen</b><small>${esc(e.message)}</small></div></section>`;}
  return;
 }
 $('main').innerHTML=`<section class="peran"><div class="nota"><b>Informasi</b><small>Peran belum tersedia.</small></div></section>`;
}
$('#menu-toggle').addEventListener('click',toggleMenu);
$('#menu-kunci').addEventListener('click',pilihPeran);
document.querySelectorAll('[data-peran]').forEach(b=>b.addEventListener('click',()=>masuk(b.dataset.peran)));
document.addEventListener('click',e=>{
 if(!e.target.closest('.menu-peran'))tutupMenu();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')tutupMenu()});
addEventListener('hashchange',()=>{if(peran==='kasir')coba(buka)});

(navigator.locks?(f=>navigator.locks.request('kasir',{ifAvailable:true},f)):(f=>f(true)))(async l=>{
 const sp=$('#splash');
 if(!l){sp?.classList.add('off');$('main').textContent='Kasir sudah terbuka di tab lain. Tutup tab ini.';return}
 try{
  const jeda=new Promise(r=>setTimeout(r,600));
  await init();navigator.storage?.persist?.();
  await jeda;pilihPeran();sp?.classList.add('off');
 }catch(e){
  const s=$('.spin'),t=$('#splash-teks');if(s)s.hidden=true;
  const pesan='Gagal memuat data: '+e.message+'. Muat ulang halaman.';
  if(t)t.textContent=pesan;else $('main').textContent=pesan;
 }
 await new Promise(()=>{});
});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
