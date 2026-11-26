import {q,run,tx} from '../db.js';import {rp,esc,coba} from '../app.js';
import {unduhMenu,bacaFile,terapkan} from '../excel.js';
let rencana=null;
export default function view(el,e={}){
 const r=rencana;
 el.innerHTML=`<div class="baris"><span>Excel</span><span><button id="unduh">Unduh Excel</button> <button id="impor">Impor Excel</button><input type="file" id="berkas" accept=".xlsx,.xls" hidden></span></div>
 ${r?(r.err.length?`<div class="nota"><b>Impor dibatalkan, ada ${r.err.length} masalah:</b>${r.err.slice(0,8).map(x=>`<div>${esc(x)}</div>`).join('')}${r.err.length>8?`<div>…dan ${r.err.length-8} lainnya</div>`:''}<button id="tutup">Tutup</button></div>`:`<div class="nota"><b>Siap diterapkan</b><div>${r.baru} menu baru, ${r.ubah} menu diperbarui. Menu yang tidak ada di file tidak diubah.</div><button class="utama" id="terap">Terapkan</button><button id="tutup">Batal</button></div>`):''}
 <form><input name="n" placeholder="Nama menu" required><input name="h" type="number" min="0" placeholder="Harga" required><input name="k" placeholder="Kategori"><input name="s" type="number" min="0" placeholder="Stok" required><label><input name="a" type="checkbox" checked> Aktif</label><button class="utama">Simpan menu</button></form>
 ${q('SELECT * FROM menu').map(m=>`<div class="baris"><span>${esc(m.nama_menu)}, ${rp(m.harga)}, stok ${m.stok}${m.status_aktif?'':' (nonaktif)'}</span><button data-id="${m.menu_id}">Ubah</button></div>`).join('')}`;
 const $=s=>el.querySelector(s);
 $('#unduh').onclick=()=>coba(unduhMenu);
 $('#impor').onclick=()=>$('#berkas').click();
 $('#berkas').onchange=ev=>{const f=ev.target.files[0];if(f)coba(async()=>{rencana=await bacaFile(f);view(el)})};
 if($('#tutup'))$('#tutup').onclick=()=>{rencana=null;view(el)};
 if($('#terap'))$('#terap').onclick=ev=>{ev.target.disabled=true;
  coba(async()=>{await terapkan(r.aksi);rencana=null;view(el)}).finally(()=>{ev.target.disabled=false})};
 const f=$('form'),x=f.elements;
 if(e.menu_id){x.n.value=e.nama_menu;x.h.value=e.harga;x.k.value=e.kategori||'';x.s.value=e.stok;x.a.checked=!!e.status_aktif}
 f.onsubmit=v=>{v.preventDefault();const p=[x.n.value,Math.round(+x.h.value),x.k.value,Math.floor(+x.s.value),+x.a.checked];
  coba(async()=>{await tx(()=>e.menu_id?run('UPDATE menu SET nama_menu=?,harga=?,kategori=?,stok=?,status_aktif=? WHERE menu_id=?',[...p,e.menu_id]):run('INSERT INTO menu(nama_menu,harga,kategori,stok,status_aktif)VALUES(?,?,?,?,?)',p));view(el)})};
 el.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{view(el,q('SELECT * FROM menu WHERE menu_id=?',[+b.dataset.id])[0]);scrollTo(0,0)})}
