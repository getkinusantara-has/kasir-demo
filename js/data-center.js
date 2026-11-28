import {q,run,tx} from './db.js';
import {unduhExcel,bacaExcel} from './xlsx-kit.js';
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>`&#${c.charCodeAt(0)};`);
const rp=n=>'Rp'+Number(n||0).toLocaleString('id-ID');

const KEY='kasir_v26_device_id';
const deviceId=()=>{let id=localStorage.getItem(KEY);if(!id){id='DEV-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));localStorage.setItem(KEY,id)}return id};
const now=()=>new Date().toISOString();
const download=(name,content,type)=>{const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
const csvCell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
const toCSV=rows=>{if(!rows.length)return '';const cols=Object.keys(rows[0]);return '\ufeff'+[cols.map(csvCell).join(','),...rows.map(r=>cols.map(k=>csvCell(r[k])).join(','))].join('\r\n')};
const dateTag=()=>new Date().toLocaleDateString('sv');
const ensure=()=>{
 run(`CREATE TABLE IF NOT EXISTS v26_import_log(log_id INTEGER PRIMARY KEY,source_device TEXT NOT NULL,source_type TEXT NOT NULL,source_key TEXT NOT NULL,imported_at TEXT NOT NULL DEFAULT(datetime('now','localtime')),UNIQUE(source_device,source_type,source_key))`);
};
function salesPackage(){
 const transaksi=q("SELECT * FROM transaksi WHERE date(waktu_transaksi)=date('now','localtime') ORDER BY transaksi_id");
 const ids=transaksi.map(x=>x.transaksi_id);const detail=ids.length?q(`SELECT * FROM detail_transaksi WHERE transaksi_id IN (${ids.map(()=>'?').join(',')}) ORDER BY detail_id`,ids):[];
 return {format:'KIN-KASIR-EXCHANGE',version:1,type:'SALES_DAILY',device_id:deviceId(),created_at:now(),date:dateTag(),data:{transaksi,detail_transaksi:detail}};
}
function masterPackage(){return {format:'KIN-KASIR-EXCHANGE',version:1,type:'OWNER_MASTER',device_id:deviceId(),created_at:now(),data:{menu:q('SELECT * FROM menu ORDER BY menu_id'),meja:q('SELECT * FROM meja ORDER BY meja_id')}}}
function downloadCSV(type){
 const p=type==='sales'?salesPackage():masterPackage();
 const tables=Object.entries(p.data);let i=0;
 for(const [name,rows] of tables){download(`${name}-${p.date||dateTag()}-${++i}.csv`,toCSV(rows),'text/csv;charset=utf-8')}
}
function parseCSV(text){
 const rows=[];let row=[],v='',qte=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(qte){if(c==='"'&&text[i+1]==='"'){v+='"';i++}else if(c==='"')qte=false;else v+=c}else if(c==='"')qte=true;else if(c===','){row.push(v);v=''}else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v=''}else v+=c}
 if(v.length||row.length){row.push(v.replace(/\r$/,''));rows.push(row)}
 if(!rows.length)return [];const headers=rows.shift().map((x,i)=>x.trim().replace(i===0?/^\uFEFF/:/$^/,''));return rows.filter(r=>r.some(x=>x!=='' )).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
}
async function readFile(file){const n=file.name.toLowerCase();
 if(n.endsWith('.xlsx')){const {info,sheets}=await bacaExcel(file);
  const bersih=r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v===''?null:v]));
  const data={};for(const [k,v] of Object.entries(sheets))data[k]=v.map(bersih);
  return {format:'KIN-KASIR-EXCHANGE',version:1,type:info.jenis,device_id:info.perangkat,data}}
 if(n.endsWith('.json'))return JSON.parse(await file.text());
 throw Error('Format belum didukung. Pilih file Excel (.xlsx).')}
const KOL_TRX=['transaksi_id','meja_id','total_harga','metode_pembayaran','uang_diterima','kembalian','waktu_transaksi','status','alasan_void','waktu_void','dp_dipakai'];
const KOL_DET=['detail_id','transaksi_id','menu_id','nama_menu','harga_satuan','qty'];
const KOL_MENU=['menu_id','nama_menu','harga','kategori','status_aktif'];
const KOL_MEJA=['meja_id','kapasitas','tipe','aktif'];
const unduhPenjualan=()=>{const p=salesPackage();return unduhExcel(`transaksi-kasir-${dateTag()}.xlsx`,'SALES_DAILY',{transaksi:{kolom:KOL_TRX,baris:p.data.transaksi},detail_transaksi:{kolom:KOL_DET,baris:p.data.detail_transaksi}})};
const unduhMaster=()=>unduhExcel(`master-owner-${dateTag()}.xlsx`,'OWNER_MASTER',{menu:{kolom:KOL_MENU,baris:q(`SELECT ${KOL_MENU.join(',')} FROM menu ORDER BY menu_id`)},meja:{kolom:KOL_MEJA,baris:q(`SELECT ${KOL_MEJA.join(',')} FROM meja ORDER BY meja_id`)}});
const cekJenisMaster=p=>{if(p.type==='PENGGUNA')throw Error('Ini file daftar pengguna. Impor lewat layar kunci atau Owner → Pengguna.');if(p.type!=='OWNER_MASTER'&&p.type!=='CSV_TABLE')throw Error('Ini bukan file master. Gunakan file master-owner dari perangkat Owner.')};
function validatePackage(p){if(!p||!['KIN-KASIR-EXCHANGE','KIN-KASIR-CSV'].includes(p.format))throw Error('File bukan format pertukaran data KIN.');if(!p.data||typeof p.data!=='object')throw Error('Struktur data tidak valid.');if(p.format==='KIN-KASIR-EXCHANGE'&&p.version!==1)throw Error('Versi file tidak didukung.');}
async function importSales(p){
 ensure();const tr=p.data.transaksi||[],dt=p.data.detail_transaksi||[];if(!Array.isArray(tr)||!Array.isArray(dt))throw Error('Struktur transaksi tidak valid.');
 const source=p.device_id||'UNKNOWN';let baru=0,duplikat=0,detailBaru=0,missing=[];
 const names=new Set(q('SELECT nama_menu FROM menu').map(m=>m.nama_menu.toLowerCase()));
 const pending=new Set(tr.filter(t=>!q('SELECT 1 FROM v26_import_log WHERE source_device=? AND source_type=? AND source_key=?',[source,'transaksi',String(t.transaksi_id)]).length).map(t=>String(t.transaksi_id)));
 for(const d of dt)if(pending.has(String(d.transaksi_id))&&d.nama_menu&&!names.has(String(d.nama_menu).toLowerCase()))missing.push(d.nama_menu);
 if(missing.length)throw Error('Impor dibatalkan. Master menu belum cocok: '+[...new Set(missing)].join(', ')+'. Impor master dari Owner terlebih dahulu.');
 await tx(()=>{
  const map=new Map();
  for(const t of tr){const key=String(t.transaksi_id);const seen=q('SELECT 1 FROM v26_import_log WHERE source_device=? AND source_type=? AND source_key=?',[source,'transaksi',key])[0];if(seen){duplikat++;continue}
   const cols=['meja_id','total_harga','metode_pembayaran','uang_diterima','kembalian','waktu_transaksi','status','alasan_void','waktu_void','dp_dipakai'];
   const vals=cols.map(k=>t[k]??null);if(vals[0]&&!q('SELECT 1 FROM meja WHERE meja_id=?',[vals[0]]).length)vals[0]=null;run(`INSERT INTO transaksi(${cols.join(',')}) VALUES(${cols.map(()=>'?').join(',')})`,vals);const local=q('SELECT last_insert_rowid() id')[0].id;map.set(t.transaksi_id,local);
   run('INSERT INTO v26_import_log(source_device,source_type,source_key)VALUES(?,?,?)',[source,'transaksi',key]);baru++;
  }
  for(const d of dt){const local=map.get(d.transaksi_id);if(!local)continue;const menu=q('SELECT menu_id FROM menu WHERE lower(nama_menu)=lower(?)',[d.nama_menu||''])[0];if(!menu){missing.push(d.nama_menu||`menu_id ${d.menu_id}`);continue}
   run('INSERT INTO detail_transaksi(transaksi_id,menu_id,nama_menu,harga_satuan,qty)VALUES(?,?,?,?,?)',[local,menu.menu_id,d.nama_menu,d.harga_satuan,d.qty]);detailBaru++;
  }
 });
 return {baru,duplikat,detailBaru,missing:[...new Set(missing)]};
}
async function importMaster(p){
 ensure();const entries=Object.entries(p.data);const menuRows=p.data.menu||entries.find(([k])=>k.toLowerCase().startsWith('menu'))?.[1]||[];const mejaRows=p.data.meja||entries.find(([k])=>k.toLowerCase().startsWith('meja'))?.[1]||[];if(!Array.isArray(menuRows)||!Array.isArray(mejaRows))throw Error('Struktur master tidak valid.');if(!menuRows.length&&!mejaRows.length)throw Error('File master tidak berisi menu atau meja.');let tambah=0,ubah=0;
 await tx(()=>{
  for(const m of menuRows){if(!m.nama_menu)continue;const old=q('SELECT menu_id FROM menu WHERE lower(nama_menu)=lower(?)',[m.nama_menu])[0];
   if(old){run('UPDATE menu SET harga=?,kategori=?,status_aktif=? WHERE menu_id=?',[Number(m.harga)||0,m.kategori||'',m.status_aktif??1,old.menu_id]);ubah++}
   else{run('INSERT INTO menu(nama_menu,harga,kategori,stok,status_aktif,gambar)VALUES(?,?,?,?,?,?)',[m.nama_menu,Number(m.harga)||0,m.kategori||'',0,m.status_aktif??1,m.gambar||null]);tambah++}
  }
  for(const m of mejaRows){const old=q('SELECT meja_id FROM meja WHERE meja_id=?',[m.meja_id])[0];if(old)run('UPDATE meja SET kapasitas=?,tipe=?,aktif=? WHERE meja_id=?',[m.kapasitas,m.tipe||'Reguler',m.aktif??1,m.meja_id]);else run('INSERT INTO meja(meja_id,kapasitas,tipe,status_okupansi,aktif)VALUES(?,?,?,?,?)',[m.meja_id,m.kapasitas,m.tipe||'Reguler',m.status_okupansi||'KOSONG',m.aktif??1])}
 });return{tambah,ubah};
}
export default function dataCenter(el){let preview=null,result='';const render=()=>{
 const logs=(()=>{ensure();return q('SELECT * FROM v26_import_log ORDER BY log_id DESC LIMIT 8')})();
 el.innerHTML=`<div class="owner-kepala"><div><span class="owner-eyebrow">OWNER / PUSAT DATA V26</span><h1>Pusat Data</h1><p>Kumpulkan data dari perangkat Kasir dan Management secara manual. Semua proses berjalan lokal/offline.</p></div><span class="owner-tag">Offline</span></div>
 <div class="owner-subgrid"><section class="owner-panel owner-subpanel"><h2>Terima data perangkat</h2><p>Impor file Excel (.xlsx) dari perangkat Kasir atau Manajemen. Data transaksi dari Kasir digabungkan ke laporan Owner tanpa mengimpor transaksi yang sama dua kali.</p><label class="dc-file">Pilih file Excel (.xlsx)<input id="dc-file" type="file" accept=".xlsx"></label><div id="dc-preview">${preview?`<div class="nota"><b>Pratinjau: ${esc(preview.type||'CSV')}</b><p>${preview.type==='SALES_DAILY'?`${(preview.data.transaksi||[]).length} transaksi · ${(preview.data.detail_transaksi||[]).length} detail`:`${Object.values(preview.data||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0)} baris data`}</p><button class="utama" id="dc-import">Impor sekarang</button><button id="dc-cancel">Batal</button></div>`:''}</div>${result?`<div class="nota"><b>Hasil proses</b><p>${esc(result)}</p></div>`:''}</section>
 <section class="owner-panel owner-subpanel"><h2>Kirim data</h2><p>Ekspor transaksi hari ini untuk dipindahkan ke Owner, atau bagikan master menu ke perangkat lain.</p><div class="dc-actions"><button class="utama" id="dc-sales-xlsx">Ekspor transaksi harian · Excel</button><button id="dc-master-xlsx">Ekspor master Owner · Excel</button></div></section></div>
 <section class="owner-panel"><h2>Master menu Owner</h2><p>Owner menetapkan nama, kategori, dan harga menu. Stok tetap dikelola Management.</p><form id="dc-menu-form" class="manajemen-form"><label>Nama menu<input name="nama" required maxlength="100"></label><label>Kategori<input name="kategori" maxlength="60"></label><label>Harga jual<input name="harga" type="number" min="0" step="1" required></label><button class="utama">Tambah ke master Owner</button></form><div class="manajemen-tabel-wrap"><table class="manajemen-tabel"><thead><tr><th>Menu</th><th>Kategori</th><th>Harga</th><th>Aksi</th></tr></thead><tbody>${q('SELECT * FROM menu ORDER BY nama_menu').map(m=>`<tr><td>${esc(m.nama_menu)}</td><td>${esc(m.kategori||'-')}</td><td>${rp(m.harga)}</td><td><button type="button" data-edit-menu="${m.menu_id}">Ubah</button></td></tr>`).join('')}</tbody></table></div></section>
 <section class="owner-panel"><h2>Master meja Owner</h2><p>Owner menetapkan kapasitas dan tipe meja. Status pemakaian tetap dikelola Kasir.</p><form id="dc-meja-form" class="manajemen-form"><label>Kapasitas kursi<input name="kapasitas" type="number" min="1" step="1" required></label><label>Tipe meja<select name="tipe"><option>Reguler</option><option>Indoor</option><option>Outdoor</option><option>VIP</option><option>Bar</option></select></label><button class="utama">Tambah meja</button></form><div class="manajemen-tabel-wrap"><table class="manajemen-tabel"><thead><tr><th>Meja</th><th>Kapasitas</th><th>Tipe</th><th>Aksi</th></tr></thead><tbody>${q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id').map(m=>`<tr><td>#${m.meja_id}</td><td>${m.kapasitas} kursi</td><td>${esc(m.tipe||'Reguler')}</td><td><button type="button" data-edit-meja="${m.meja_id}">Ubah</button></td></tr>`).join('')}</tbody></table></div></section>
 <section class="owner-panel"><div class="owner-panel-kepala"><div><h2>Riwayat impor</h2><p>Delapan aktivitas terakhir di perangkat ini</p></div></div><div class="manajemen-tabel-wrap"><table class="manajemen-tabel"><thead><tr><th>Waktu</th><th>Perangkat sumber</th><th>Jenis</th><th>Kunci data</th></tr></thead><tbody>${logs.map(x=>`<tr><td>${esc(x.imported_at)}</td><td>${esc(x.source_device)}</td><td>${esc(x.source_type)}</td><td>${esc(x.source_key)}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada impor.</td></tr>'}</tbody></table></div></section>
 <div class="owner-catatan"><b>ID perangkat ini</b><p>${esc(deviceId())}</p><b>Catatan format</b><p>Format pertukaran adalah Excel (.xlsx). Jangan mengubah nama sheet, judul kolom, atau kolom ID. Gambar menu tidak ikut diekspor dan tetap tersimpan di masing-masing perangkat.</p></div>`;
 const mf=el.querySelector('#dc-menu-form');mf.onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;try{await tx(()=>run('INSERT INTO menu(nama_menu,harga,kategori,stok,status_aktif)VALUES(?,?,?,0,1)',[f.nama.value.trim(),Number(f.harga.value),f.kategori.value.trim()]));render()}catch(err){alert(err.message)}};el.querySelectorAll('[data-edit-menu]').forEach(b=>b.onclick=async()=>{const m=q('SELECT * FROM menu WHERE menu_id=?',[+b.dataset.editMenu])[0];const nama=prompt('Nama menu',m.nama_menu);if(nama===null)return;const harga=prompt('Harga jual',m.harga);if(harga===null)return;const kategori=prompt('Kategori',m.kategori||'');if(kategori===null)return;if(!nama.trim()||!Number.isFinite(+harga)||+harga<0)return alert('Nama atau harga tidak valid.');try{await tx(()=>run('UPDATE menu SET nama_menu=?,harga=?,kategori=? WHERE menu_id=?',[nama.trim(),Math.round(+harga),kategori.trim(),m.menu_id]));render()}catch(err){alert(err.message)}});
 const tf=el.querySelector('#dc-meja-form');tf.onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;try{await tx(()=>run('INSERT INTO meja(kapasitas,tipe)VALUES(?,?)',[Math.floor(+f.kapasitas.value),f.tipe.value]));render()}catch(err){alert(err.message)}};el.querySelectorAll('[data-edit-meja]').forEach(b=>b.onclick=async()=>{const m=q('SELECT * FROM meja WHERE meja_id=?',[+b.dataset.editMeja])[0];const kapasitas=prompt('Kapasitas kursi',m.kapasitas);if(kapasitas===null)return;const tipe=prompt('Tipe meja (Reguler/Indoor/Outdoor/VIP/Bar)',m.tipe||'Reguler');if(tipe===null)return;if(!Number.isInteger(+kapasitas)||+kapasitas<1||!tipe.trim())return alert('Kapasitas atau tipe tidak valid.');try{await tx(()=>run('UPDATE meja SET kapasitas=?,tipe=? WHERE meja_id=?',[+kapasitas,tipe.trim(),m.meja_id]));render()}catch(err){alert(err.message)}});
 const file=el.querySelector('#dc-file');file.onchange=async()=>{try{const f=file.files[0];if(!f)return;const p=await readFile(f);validatePackage(p);preview=p;result='';render()}catch(e){alert(e.message)}};
 el.querySelector('#dc-cancel')?.addEventListener('click',()=>{preview=null;render()});el.querySelector('#dc-import')?.addEventListener('click',async()=>{try{if(preview.type==='SALES_DAILY'){const r=await importSales(preview);result=`${r.baru} transaksi baru, ${r.duplikat} duplikat dilewati, ${r.detailBaru} detail masuk.`+(r.missing.length?` Menu tidak ditemukan: ${r.missing.join(', ')}`:'')}else if(preview.type==='OWNER_MASTER'||preview.type==='CSV_TABLE'){const r=await importMaster(preview);result=`Master menu: ${r.tambah} ditambahkan, ${r.ubah} diperbarui.`}else if(preview.type==='PENGGUNA')throw Error('Ini file daftar pengguna. Impor lewat layar kunci atau Owner → Pengguna.');else throw Error('Jenis file ini belum didukung untuk impor Owner.');preview=null;render()}catch(e){alert(e.message)}});
 el.querySelector('#dc-sales-xlsx').onclick=()=>unduhPenjualan().catch(e=>alert(e.message));
 el.querySelector('#dc-master-xlsx').onclick=()=>unduhMaster().catch(e=>alert(e.message));
 };render();}

export function panelEksporKasir(el){
 const box=document.createElement('section');box.className='owner-panel';box.innerHTML='<h3>Ekspor data V26</h3><p>Ekspor transaksi hari ini ke file Excel untuk dikirim ke perangkat Owner.</p><div class="dc-actions"><button type="button" class="utama" id="kasir-xlsx">Ekspor transaksi harian · Excel</button></div>';
 box.querySelector('#kasir-xlsx').onclick=()=>unduhPenjualan().catch(e=>alert(e.message));
 el.append(box);
}

export function panelImporMaster(el){
 const box=document.createElement('section');box.className='owner-panel';box.innerHTML='<h3>Impor master dari Owner</h3><p>Pilih file master Excel (.xlsx) yang diekspor dari perangkat Owner (Owner → Pusat Data). Harga, kategori, dan status menu mengikuti master Owner; stok lokal tidak ditimpa.</p><label class="dc-file">Pilih file master Excel (.xlsx)<input type="file" accept=".xlsx"></label>';
 const input=box.querySelector('input');input.onchange=async()=>{try{const f=input.files[0];if(!f)return;const p=await readFile(f);validatePackage(p);cekJenisMaster(p);const r=await importMaster(p);alert(`Master diperbarui. ${r.tambah} menu baru, ${r.ubah} menu disesuaikan.`);location.reload()}catch(e){alert(e.message)}finally{input.value=''}};el.append(box);
}
