import {q} from '../db.js';import {checkout} from '../logic.js';import {cetak} from '../printer.js';import {infoMeja,datangBooking} from '../booking.js';import {rp,esc,coba} from '../app.js';
const k=new Map();let fokus=0,kat='Semua',skrol=0,meja='',metode='Tunai',uang='',hasil=null;
export default function view(el){
 if(hasil){
  el.innerHTML=`<div class="nota"><h2>Pembayaran berhasil</h2><div>Total ${rp(hasil.total)}</div>${hasil.dp?`<div>DP booking −${rp(hasil.dp)}</div>`:''}<div>Diterima ${rp(hasil.uang)}</div><div class="kembali">Kembalian ${rp(hasil.kembalian)}</div><button class="utama" id="cetak">Cetak struk</button><button id="baru">Pesanan baru</button></div>`;
  el.querySelector('#cetak').onclick=()=>coba(()=>cetak(hasil.id));
  el.querySelector('#baru').onclick=()=>{hasil=null;view(el)};
  return}
 const menu=q('SELECT * FROM menu WHERE status_aktif=1 ORDER BY kategori,nama_menu');
 const semua=q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id');
 if(meja&&!semua.some(m=>String(m.meja_id)===String(meja)&&m.status_okupansi==='KOSONG'))meja='';
 for(const id of k.keys())if(!menu.some(m=>m.menu_id===id))k.delete(id);
 const isi=[...k].map(([id,n])=>({...menu.find(m=>m.menu_id===id),n}));
 const total=isi.reduce((a,i)=>a+i.harga*i.n,0);
 const kats=[...new Set(menu.map(m=>m.kategori||'Lainnya'))].sort();
 if(kat!=='Semua'&&!kats.includes(kat))kat='Semua';
 const tampil=menu.filter(m=>kat==='Semua'||(m.kategori||'Lainnya')===kat);
 const bk=meja?datangBooking(+meja):null,dp=bk?Math.min(bk.dp,total):0,due=total-dp,info=infoMeja();
 const jml=isi.reduce((a,i)=>a+i.n,0);
 el.innerHTML=`<div class="tiga"><aside class="kat">${['Semua',...kats].map(c=>`<button class="${c===kat?'on':''}" data-kat="${esc(c)}">${esc(c)}</button>`).join('')}</aside><div class="grid">${tampil.map(m=>{const n=k.get(m.menu_id)||0;return `<div class="kartu${n?' ada':''}"><div class="gbr">${m.gambar?`<img src="${esc(m.gambar)}" alt="" loading="lazy">`:`<span>${esc(m.nama_menu.trim().charAt(0).toUpperCase())}</span>`}${m.stok<=5?`<em class="sisa">${m.stok<1?'Habis':'Sisa '+m.stok}</em>`:''}</div><div class="kt"><b>${esc(m.nama_menu)}</b><span class="hg">${rp(m.harga)}</span><small>Stok ${m.stok}</small></div>${n?`<div class="kc"><label>Jumlah <input type="number" inputmode="numeric" min="0" max="${m.stok}" value="${n}" data-c="${m.menu_id}" aria-label="Jumlah pesanan ${esc(m.nama_menu)}"></label></div>`:`<button class="pesan" data-t="${m.menu_id}" ${m.stok<1?'disabled':''}>${m.stok<1?'Habis':'Pesan'}</button>`}</div>`}).join('')||'<p>Belum ada menu di kategori ini.</p>'}</div>
 <div class="nota" id="panel">
 <div class="grid kecil"><button class="mj bawa${meja===''?' pilih':''}" data-m="">Bawa pulang</button>${semua.map(m=>{const t=m.status_okupansi==='TERISI',ib=info.get(m.meja_id),kunci=!t&&ib?.status==='MENUNGGU',tamu=!t&&ib?.status==='DATANG';return `<button class="mj ${t?'terisi':'kosong'}${tamu?' tamu':''}${String(m.meja_id)===String(meja)?' pilih':''}" data-m="${m.meja_id}" ${t||kunci?'disabled':''}>Meja ${m.meja_id}<br><small>${m.kapasitas} kursi</small>${tamu?`<br><small>a.n. ${esc(ib.nama)}${ib.dp?' · DP '+rp(ib.dp):''}</small>`:''}${kunci?'<br><small>Booking segera</small>':''}</button>`}).join('')}</div>
 ${isi.map(i=>`<div class="baris"><span>${esc(i.nama_menu)}<br><small>${rp(i.harga)}</small></span><span style="display:flex;gap:4px;align-items:center"><button data-k="${i.menu_id}" aria-label="Kurangi">−</button><input type="number" inputmode="numeric" min="0" max="${i.stok}" value="${i.n}" data-q="${i.menu_id}" aria-label="Jumlah ${esc(i.nama_menu)}" style="width:56px;text-align:center"><button data-p="${i.menu_id}" aria-label="Tambah" ${i.n>=i.stok?'disabled':''}>+</button></span></div>`).join('')||'<p>Ketuk menu untuk mulai pesanan.</p>'}
 <h2>${rp(total)}</h2>${dp>0?`<div class="baris"><span>DP booking a.n. ${esc(bk.nama)}</span><b>−${rp(dp)}</b></div><div class="baris"><span>Sisa bayar</span><b>${rp(due)}</b></div>`:''}
 <select id="metode"><option>Tunai</option><option>QRIS</option><option>Debit</option></select>
 ${metode==='Tunai'?`<input id="uang" type="number" inputmode="numeric" placeholder="Uang diterima" value="${esc(uang)}"><div class="uang"><button data-u="pas">Uang pas</button>${[20000,50000,100000].map(n=>`<button data-u="${n}">${n/1000}rb</button>`).join('')}</div>`:''}
 <div class="kembali" id="kb"></div>
 <button class="utama" id="bayar">Bayar</button></div></div>${jml?`<button class="bar" id="bar"><span>${jml} item</span><b>${rp(total)}</b><span>Lihat pesanan ›</span></button>`:''}`;
 const $=s=>el.querySelector(s);
 const hitung=()=>{
  const kb=$('#kb'),by=$('#bayar');if(!kb||!by)return;
  const tunai=metode==='Tunai'&&due>0,u=+uang;let t='',ok=total>0,merah=false;
  if(total>0){
   if(due===0)t='Lunas oleh DP';
   else if(metode!=='Tunai')t='Dibayar pas '+rp(due);
   else if(uang==='')t='Masukkan uang diterima';
   else if(u>=due)t='Kembalian '+rp(u-due);
   else t='Kurang '+rp(due-u);
   if(tunai&&(uang===''||u<due))ok=false;
   merah=tunai&&uang!==''&&u<due}
  kb.textContent=t;kb.classList.toggle('kurang',merah);by.disabled=!ok};
 const ubah=(id,n)=>{n>0?k.set(id,n):k.delete(id);view(el)};
 const stokOf=id=>menu.find(m=>m.menu_id===id).stok;
 $('#metode').value=metode;
 const kt=$('.kat');kt.scrollLeft=skrol;kt.onscroll=()=>{skrol=kt.scrollLeft};
 el.querySelectorAll('[data-kat]').forEach(b=>b.onclick=()=>{kat=b.dataset.kat;view(el)});
 if($('#bar'))$('#bar').onclick=()=>$('#panel').scrollIntoView({behavior:'smooth'});
 $('#metode').onchange=e=>{metode=e.target.value;view(el)};
 el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(b.disabled)return;meja=b.dataset.m;view(el)});
 el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const id=+b.dataset.t;fokus=id;ubah(id,(k.get(id)||0)+1)});
 el.querySelectorAll('[data-c]').forEach(inp=>inp.onchange=()=>{
  const id=+inp.dataset.c;let n=Math.floor(+inp.value);
  if(!Number.isFinite(n))n=k.get(id);
  ubah(id,Math.min(Math.max(n,0),stokOf(id)))});
 const f=fokus&&el.querySelector(`[data-c="${fokus}"]`);fokus=0;if(f){f.focus();f.select()}
 el.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const id=+b.dataset.k;ubah(id,k.get(id)-1)});
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const id=+b.dataset.p;ubah(id,k.get(id)+1)});
 el.querySelectorAll('[data-q]').forEach(inp=>inp.onchange=()=>{
  const id=+inp.dataset.q;let n=Math.floor(+inp.value);
  if(!Number.isFinite(n))n=k.get(id);
  ubah(id,Math.min(Math.max(n,0),stokOf(id)))});
 if($('#uang')){
  $('#uang').oninput=e=>{uang=e.target.value;hitung()};
  el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{uang=b.dataset.u==='pas'?String(due):b.dataset.u;$('#uang').value=uang;hitung()})}
 $('#bayar').onclick=e=>{
  e.target.disabled=true;
  coba(async()=>{
   const id=await checkout(k,+meja||null,metode,+uang);
   const r=q('SELECT total_harga t,uang_diterima u,kembalian x,dp_dipakai d FROM transaksi WHERE transaksi_id=?',[id])[0];
   hasil={id,total:r.t,uang:r.u,kembalian:r.x,dp:r.d};k.clear();meja=uang='';view(el)
  }).finally(hitung)};
 hitung()}
