import {q,run,tx} from '../db.js';import {rp,esc,coba} from '../app.js';
import {unduhMenu,bacaFile,terapkan} from '../excel.js';
let rencana=null;
const kecil=f=>new Promise((ok,no)=>{const u=URL.createObjectURL(f),i=new Image();i.onload=()=>{const z=Math.min(1,480/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=Math.round(i.width*z);c.height=Math.round(i.height*z);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(i,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL('image/jpeg',.75))};i.onerror=()=>{URL.revokeObjectURL(u);no(new Error('File bukan gambar yang valid'))};i.src=u});
export default function view(el,e={}){
 const r=rencana;
 el.innerHTML=`<div class="baris"><span>Excel</span><span><button id="unduh">Unduh Excel</button> <button id="impor">Impor Excel</button><input type="file" id="berkas" accept=".xlsx,.xls" hidden></span></div>
 ${r?(r.err.length?`<div class="nota"><b>Impor dibatalkan, ada ${r.err.length} masalah:</b>${r.err.slice(0,8).map(x=>`<div>${esc(x)}</div>`).join('')}${r.err.length>8?`<div>…dan ${r.err.length-8} lainnya</div>`:''}<button id="tutup">Tutup</button></div>`:`<div class="nota"><b>Siap diterapkan</b><div>${r.baru} menu baru, ${r.ubah} menu diperbarui. Menu yang tidak ada di file tidak diubah.</div><button class="utama" id="terap">Terapkan</button><button id="tutup">Batal</button></div>`):''}
 <form><input name="n" placeholder="Nama menu" required><input name="h" type="number" min="0" placeholder="Harga" required><input name="k" placeholder="Kategori" list="daftar-kat" autocomplete="off"><datalist id="daftar-kat">${q("SELECT DISTINCT kategori FROM menu WHERE kategori<>'' ORDER BY kategori").map(c=>`<option value="${esc(c.kategori)}">`).join('')}</datalist><input name="s" type="number" min="0" placeholder="Stok" required><label><input name="a" type="checkbox" checked> Aktif</label><div class="gambar-form"><div id="pratinjau" class="gbr kecilg"></div><label class="tombol">Pilih gambar<input type="file" name="f" accept="image/*" hidden></label><button type="button" id="hapusg">Hapus gambar</button></div><button class="utama">Simpan menu</button></form>
 ${q('SELECT * FROM menu').map(m=>`<div class="baris"><span class="item">${m.gambar?`<img class="mini" src="${esc(m.gambar)}" alt="">`:'<span class="mini"></span>'}<span>${esc(m.nama_menu)}, ${rp(m.harga)}, stok ${m.stok}${m.status_aktif?'':' (nonaktif)'}</span></span><button data-id="${m.menu_id}">Ubah</button></div>`).join('')}`;
 const $=s=>el.querySelector(s);
 $('#unduh').onclick=()=>coba(unduhMenu);
 $('#impor').onclick=()=>$('#berkas').click();
 $('#berkas').onchange=ev=>{const f=ev.target.files[0];if(f)coba(async()=>{rencana=await bacaFile(f);view(el)})};
 if($('#tutup'))$('#tutup').onclick=()=>{rencana=null;view(el)};
 if($('#terap'))$('#terap').onclick=ev=>{ev.target.disabled=true;
  coba(async()=>{await terapkan(r.aksi);rencana=null;view(el)}).finally(()=>{ev.target.disabled=false})};
 const f=$('form'),x=f.elements;let gambar=e.gambar||'';
 const lihat=()=>{$('#pratinjau').innerHTML=gambar?`<img src="${esc(gambar)}" alt="">`:'<span>Gambar</span>';$('#hapusg').hidden=!gambar};lihat();
 x.f.onchange=()=>{const b=x.f.files[0];if(b)coba(async()=>{gambar=await kecil(b);lihat()});x.f.value=''};
 $('#hapusg').onclick=()=>{gambar='';lihat()};
 if(e.menu_id){x.n.value=e.nama_menu;x.h.value=e.harga;x.k.value=e.kategori||'';x.s.value=e.stok;x.a.checked=!!e.status_aktif}
 f.onsubmit=v=>{v.preventDefault();const p=[x.n.value,Math.round(+x.h.value),x.k.value.trim(),Math.floor(+x.s.value),+x.a.checked,gambar||null];
  coba(async()=>{await tx(()=>e.menu_id?run('UPDATE menu SET nama_menu=?,harga=?,kategori=?,stok=?,status_aktif=?,gambar=? WHERE menu_id=?',[...p,e.menu_id]):run('INSERT INTO menu(nama_menu,harga,kategori,stok,status_aktif,gambar)VALUES(?,?,?,?,?,?)',p));view(el)})};
 el.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{view(el,q('SELECT * FROM menu WHERE menu_id=?',[+b.dataset.id])[0]);scrollTo(0,0)})}
