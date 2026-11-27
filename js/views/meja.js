import {q,run,tx} from '../db.js';import {coba} from '../app.js';import {infoMeja} from '../booking.js';
let modeHapus=false,pilih=null;
export default function view(el){
 const daftar=q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id'),info=infoMeja();
 const m=daftar.find(x=>x.meja_id===pilih);if(!m)pilih=null;
 el.innerHTML=`<div class="baris"><span>${modeHapus?'Mode hapus: ketuk meja yang mau dihapus.':'Ketuk meja untuk mengubah status. Hijau kosong, kuning booking segera, merah terisi.'}</span><button id="mode">${modeHapus?'Selesai':'Hapus meja'}</button></div>
 <div class="grid">${daftar.map(x=>{const t=x.status_okupansi==='TERISI',ib=info.get(x.meja_id),kuning=!t&&ib?.status==='MENUNGGU';return `<button class="mj ${t?'terisi':kuning?'dibooking':'kosong'}${modeHapus&&x.meja_id===pilih?' pilih':''}" data-id="${x.meja_id}" data-s="${x.status_okupansi}">Meja ${x.meja_id}<br><small>${x.kapasitas} kursi</small><br><b>${kuning?`BOOKING ${ib.jam} · ${escMeja(ib.nama)}`:t?'TERISI':'KOSONG'}</b></button>`}).join('')||'<p>Belum ada meja.</p>'}</div>
 ${modeHapus&&m?`<div class="nota"><b>Hapus Meja ${m.meja_id}?</b><button class="utama" id="ya">Ya, hapus</button><button id="batal">Batal</button></div>`:''}
 <h3>Tambah meja</h3><form id="baru"><input name="k" type="number" min="1" step="1" inputmode="numeric" placeholder="Jumlah kursi" required><button class="utama">Tambah meja</button></form>`;
 el.querySelector('#mode').onclick=()=>{modeHapus=!modeHapus;pilih=null;view(el)};
 el.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{
  if(modeHapus){pilih=+b.dataset.id;view(el);return}
  coba(async()=>{const baru=b.dataset.s==='TERISI'?'KOSONG':'TERISI';
   await tx(()=>run('UPDATE meja SET status_okupansi=? WHERE meja_id=?',[baru,+b.dataset.id]));view(el)})});
 if(m&&modeHapus){
  el.querySelector('#batal').onclick=()=>{pilih=null;view(el)};
  el.querySelector('#ya').onclick=()=>coba(async()=>{
   if(m.status_okupansi==='TERISI')throw Error('Kosongkan meja dulu sebelum dihapus');
   await tx(()=>run('UPDATE meja SET aktif=0 WHERE meja_id=?',[m.meja_id]));pilih=null;view(el)})}
 el.querySelector('#baru').onsubmit=e=>{e.preventDefault();const n=Math.floor(+e.target.elements.k.value);
  coba(async()=>{if(!(n>0))throw Error('Isi jumlah kursi dengan angka lebih dari 0');await tx(()=>run('INSERT INTO meja(kapasitas)VALUES(?)',[n]));view(el)})}
}
const escMeja=s=>String(s??'').replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);
