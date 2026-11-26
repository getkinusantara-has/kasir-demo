import {q} from '../db.js';import {checkout} from '../logic.js';import {cetak} from '../printer.js';import {rp,esc,coba} from '../app.js';
const k=new Map();let meja='',metode='Tunai',uang='',hasil=null;
export default function view(el){
 if(hasil){
  el.innerHTML=`<div class="nota"><h2>Pembayaran berhasil</h2><div>Total ${rp(hasil.total)}</div><div>Diterima ${rp(hasil.uang)}</div><div class="kembali">Kembalian ${rp(hasil.kembalian)}</div><button class="utama" id="cetak">Cetak struk</button><button id="baru">Pesanan baru</button></div>`;
  el.querySelector('#cetak').onclick=()=>coba(()=>cetak(hasil.id));
  el.querySelector('#baru').onclick=()=>{hasil=null;view(el)};
  return}
 const menu=q('SELECT * FROM menu WHERE status_aktif=1 ORDER BY kategori,nama_menu');
 const semua=q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id');
 if(meja&&!semua.some(m=>String(m.meja_id)===String(meja)&&m.status_okupansi==='KOSONG'))meja='';
 for(const id of k.keys())if(!menu.some(m=>m.menu_id===id))k.delete(id);
 const isi=[...k].map(([id,n])=>({...menu.find(m=>m.menu_id===id),n}));
 const total=isi.reduce((a,i)=>a+i.harga*i.n,0);
 el.innerHTML=`<div class="dua"><div class="grid">${menu.map(m=>`<button data-t="${m.menu_id}" ${m.stok<=(k.get(m.menu_id)||0)?'disabled':''}><b>${esc(m.nama_menu)}</b><br>${rp(m.harga)}<br><small>Stok ${m.stok}</small></button>`).join('')}</div>
 <div class="nota">
 <div class="grid kecil"><button class="mj bawa${meja===''?' pilih':''}" data-m="">Bawa pulang</button>${semua.map(m=>{const t=m.status_okupansi==='TERISI';return `<button class="mj ${t?'terisi':'kosong'}${String(m.meja_id)===String(meja)?' pilih':''}" data-m="${m.meja_id}" ${t?'disabled':''}>Meja ${m.meja_id}<br><small>${m.kapasitas} kursi</small></button>`}).join('')}</div>
 ${isi.map(i=>`<div class="baris"><span>${i.n} × ${esc(i.nama_menu)}</span><button data-k="${i.menu_id}" aria-label="Kurangi">−</button></div>`).join('')||'<p>Ketuk menu untuk mulai pesanan.</p>'}
 <h2>${rp(total)}</h2>
 <select id="metode"><option>Tunai</option><option>QRIS</option><option>Debit</option></select>
 ${metode==='Tunai'?`<input id="uang" type="number" inputmode="numeric" placeholder="Uang diterima" value="${esc(uang)}"><div class="uang"><button data-u="pas">Uang pas</button>${[20000,50000,100000].map(n=>`<button data-u="${n}">${n/1000}rb</button>`).join('')}</div>`:''}
 <div class="kembali" id="kb"></div>
 <button class="utama" id="bayar">Bayar</button></div></div>`;
 const $=s=>el.querySelector(s);
 const hitung=()=>{
  const kb=$('#kb'),by=$('#bayar');if(!kb||!by)return;
  const tunai=metode==='Tunai',u=+uang;let t='',ok=total>0,merah=false;
  if(total>0){
   if(!tunai)t='Dibayar pas '+rp(total);
   else if(uang==='')t='Masukkan uang diterima';
   else if(u>=total)t='Kembalian '+rp(u-total);
   else t='Kurang '+rp(total-u);
   if(tunai&&(uang===''||u<total))ok=false;
   merah=tunai&&uang!==''&&u<total}
  kb.textContent=t;kb.classList.toggle('kurang',merah);by.disabled=!ok};
 $('#metode').value=metode;
 $('#metode').onchange=e=>{metode=e.target.value;view(el)};
 el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{meja=b.dataset.m;view(el)});
 el.querySelectorAll('[data-t],[data-k]').forEach(b=>b.onclick=()=>{
  const id=+(b.dataset.t||b.dataset.k),n=(k.get(id)||0)+(b.dataset.t?1:-1);
  n?k.set(id,n):k.delete(id);view(el)});
 if($('#uang')){
  $('#uang').oninput=e=>{uang=e.target.value;hitung()};
  el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{uang=b.dataset.u==='pas'?String(total):b.dataset.u;$('#uang').value=uang;hitung()})}
 $('#bayar').onclick=e=>{
  e.target.disabled=true;
  coba(async()=>{
   const id=await checkout(k,+meja||null,metode,+uang);
   const r=q('SELECT total_harga t,uang_diterima u,kembalian x FROM transaksi WHERE transaksi_id=?',[id])[0];
   hasil={id,total:r.t,uang:r.u,kembalian:r.x};k.clear();meja=uang='';view(el)
  }).finally(hitung)};
 hitung()}
