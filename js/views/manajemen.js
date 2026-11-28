import {panelImporMaster} from '../data-center.js';
import {q,run,tx} from '../db.js';
import {rp,esc,coba} from '../app.js';

let bagian='inventori';
const angka=n=>Number(n||0).toLocaleString('id-ID');
const tanggal=s=>s?new Date(String(s).replace(' ','T')).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'-';

// Tabel tambahan bersifat aditif. Database lama dan tabel transaksi tidak diubah.
function siapkanLog(){
 run(`CREATE TABLE IF NOT EXISTS inventori_log(
  log_id INTEGER PRIMARY KEY,menu_id INTEGER,nama_menu TEXT NOT NULL,jenis TEXT NOT NULL,
  jumlah INTEGER NOT NULL,stok_sebelum INTEGER NOT NULL,stok_sesudah INTEGER NOT NULL,
  catatan TEXT,dibuat TEXT NOT NULL DEFAULT(datetime('now','localtime')))`);
}
function kepala(judul,deskripsi){return `<div class="owner-kepala"><div><span class="owner-eyebrow">MANAJEMEN / ${judul.toUpperCase()}</span><h1>${judul}</h1><p>${deskripsi}</p></div></div>`}
function inventori(){
 siapkanLog();
 const data=q('SELECT * FROM menu ORDER BY nama_menu');
 const total=data.reduce((a,m)=>a+Number(m.stok||0),0),rendah=data.filter(m=>m.stok<=10).length;
 const log=q('SELECT * FROM inventori_log ORDER BY log_id DESC LIMIT 8');
 return `${kepala('Inventori','Pantau persediaan, lakukan stock opname, dan catat penerimaan barang.')}
 <div class="owner-metrik"><article class="owner-metrik-kartu"><span>Jenis menu</span><strong>${angka(data.length)}</strong><small>Seluruh menu terdaftar</small></article><article class="owner-metrik-kartu"><span>Total stok</span><strong>${angka(total)}</strong><small>Akumulasi seluruh stok menu</small></article><article class="owner-metrik-kartu"><span>Stok rendah</span><strong>${angka(rendah)}</strong><small>Stok 10 atau kurang</small></article></div>
 <section class="owner-panel"><div class="owner-panel-kepala"><div><h2>Daftar persediaan</h2><p>Stok saat ini dari master menu kasir</p></div><span class="owner-tag">${data.length} menu</span></div>
 <div class="manajemen-tabel-wrap"><table class="manajemen-tabel"><thead><tr><th>Menu</th><th>Kategori</th><th>Stok</th><th>Status</th></tr></thead><tbody>${data.map(m=>`<tr><td><b>${esc(m.nama_menu)}</b></td><td>${esc(m.kategori||'Lainnya')}</td><td><b>${angka(m.stok)}</b></td><td><span class="manajemen-status ${m.stok<=10?'rendah':'aman'}">${m.stok<=10?'Perlu diperiksa':'Tersedia'}</span></td></tr>`).join('')||'<tr><td colspan="4">Belum ada menu.</td></tr>'}</tbody></table></div></section>
 <div class="manajemen-form-grid"><section class="owner-panel"><h2>Stock opname</h2><p class="manajemen-desc">Sesuaikan stok sistem dengan hasil penghitungan fisik.</p><form id="opname" class="manajemen-form"><label>Menu<select name="menu" required>${data.map(m=>`<option value="${m.menu_id}">${esc(m.nama_menu)} · stok ${m.stok}</option>`).join('')}</select></label><label>Jumlah fisik<input name="jumlah" type="number" min="0" step="1" required></label><label>Catatan<input name="catatan" maxlength="160" placeholder="Contoh: hasil hitung akhir shift"></label><button class="utama" ${data.length?'':'disabled'}>Simpan hasil opname</button></form></section>
 <section class="owner-panel"><h2>Penerimaan barang</h2><p class="manajemen-desc">Tambahkan jumlah barang yang diterima ke stok menu.</p><form id="terima" class="manajemen-form"><label>Menu<select name="menu" required>${data.map(m=>`<option value="${m.menu_id}">${esc(m.nama_menu)} · stok ${m.stok}</option>`).join('')}</select></label><label>Jumlah diterima<input name="jumlah" type="number" min="1" step="1" required></label><label>Catatan<input name="catatan" maxlength="160" placeholder="Contoh: penerimaan dari pemasok"></label><button class="utama" ${data.length?'':'disabled'}>Catat penerimaan</button></form></section></div>
 <section class="owner-panel manajemen-riwayat"><div class="owner-panel-kepala"><div><h2>Aktivitas inventori</h2><p>8 perubahan stok terakhir</p></div></div>${log.length?`<div class="manajemen-tabel-wrap"><table class="manajemen-tabel"><thead><tr><th>Waktu</th><th>Menu</th><th>Aktivitas</th><th>Perubahan</th><th>Catatan</th></tr></thead><tbody>${log.map(x=>`<tr><td>${tanggal(x.dibuat)}</td><td>${esc(x.nama_menu)}</td><td>${x.jenis==='OPNAME'?'Stock opname':'Penerimaan'}</td><td>${angka(x.stok_sebelum)} → <b>${angka(x.stok_sesudah)}</b></td><td>${esc(x.catatan||'-')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="manajemen-kosong">Belum ada aktivitas inventori yang dicatat.</div>'}</section>
 <div class="owner-catatan"><b>Catatan</b><p>Perubahan stok akan langsung memengaruhi jumlah stok yang tersedia di Kasir. Setiap perubahan dicatat pada riwayat inventori.</p></div>`;
}
function staf(){
 return `${kepala('Staf','Ruang pengelolaan jadwal kerja dan kehadiran karyawan.')}
 <div class="owner-subgrid"><section class="owner-panel owner-subpanel"><div class="owner-icon">♙</div><span class="owner-tag">Data karyawan</span><h2>Daftar staf</h2><p>Data identitas dan status karyawan.</p><div class="manajemen-kosong"><b>Data staf belum tersedia</b><span>Database versi ini belum memiliki tabel karyawan. Belum ada data yang bisa ditampilkan atau diubah.</span></div></section>
 <section class="owner-panel owner-subpanel"><div class="owner-icon">◷</div><span class="owner-tag">Kehadiran</span><h2>Jadwal & absensi</h2><p>Pengaturan shift dan pencatatan kehadiran.</p><div class="manajemen-kosong"><b>Modul belum diaktifkan</b><span>Jadwal, shift, dan absensi membutuhkan struktur data staf terlebih dahulu.</span></div></section></div>
 <div class="owner-catatan"><b>Pengembangan berikutnya</b><p>Modul Staf belum menyimpan data. Fitur ini sengaja tidak dibuat seolah-olah aktif sebelum struktur data karyawan, jadwal, dan absensi disepakati.</p></div>`;
}
function pengawasan(){
 const ringkas=q(`SELECT COUNT(*) total,SUM(CASE WHEN status='LUNAS' THEN 1 ELSE 0 END) lunas,SUM(CASE WHEN status<>'LUNAS' THEN 1 ELSE 0 END) nonlunas FROM transaksi`)[0];
 const data=q(`SELECT t.transaksi_id,t.waktu_transaksi,t.total_harga,t.status,t.alasan_void,t.waktu_void,m.meja_id FROM transaksi t LEFT JOIN meja m ON m.meja_id=t.meja_id ORDER BY t.transaksi_id DESC LIMIT 30`);
 return `${kepala('Pengawasan Kasir','Tinjau aktivitas transaksi dan pembatalan dari seluruh kasir.')}
 <div class="owner-metrik"><article class="owner-metrik-kartu"><span>Total transaksi</span><strong>${angka(ringkas.total)}</strong><small>Seluruh transaksi tercatat</small></article><article class="owner-metrik-kartu"><span>Transaksi lunas</span><strong>${angka(ringkas.lunas)}</strong><small>Berstatus LUNAS</small></article><article class="owner-metrik-kartu"><span>Void / lainnya</span><strong>${angka(ringkas.nonlunas)}</strong><small>Transaksi selain LUNAS</small></article></div>
 <section class="owner-panel"><div class="owner-panel-kepala"><div><h2>Riwayat transaksi</h2><p>30 transaksi terbaru untuk pemeriksaan</p></div><span class="owner-tag">Pemantauan</span></div>
 <div class="manajemen-tabel-wrap"><table class="manajemen-tabel"><thead><tr><th>ID</th><th>Waktu</th><th>Meja</th><th>Total</th><th>Status</th><th>Catatan void</th></tr></thead><tbody>${data.map(t=>`<tr><td>#${t.transaksi_id}</td><td>${tanggal(t.waktu_transaksi)}</td><td>${t.meja_id?'Meja '+t.meja_id:'-'} </td><td>${rp(t.total_harga)}</td><td><span class="manajemen-status ${t.status==='LUNAS'?'aman':'rendah'}">${esc(t.status)}</span></td><td>${esc(t.alasan_void||'-')}${t.waktu_void?`<small class="manajemen-waktu">${tanggal(t.waktu_void)}</small>`:''}</td></tr>`).join('')||'<tr><td colspan="6">Belum ada transaksi.</td></tr>'}</tbody></table></div></section>
 <div class="owner-catatan"><b>Batas akses</b><p>Halaman ini bersifat pemantauan. Database saat ini belum memiliki alur persetujuan diskon atau pembatalan oleh Manajemen, dan transaksi tidak dapat diubah dari halaman ini. Pembatalan yang sudah tercatat ditampilkan melalui status dan alasan void.</p></div>`;
}
export default function view(el){
 const render=()=>{
  const isi=bagian==='inventori'?inventori():bagian==='staf'?staf():pengawasan();
  el.innerHTML=`<section class="owner-wrap manajemen-wrap"><div class="owner-nav" role="tablist" aria-label="Menu Manajemen">
   <button type="button" role="tab" aria-selected="${bagian==='inventori'}" class="${bagian==='inventori'?'on':''}" data-bagian="inventori"><span>01</span>Inventori</button>
   <button type="button" role="tab" aria-selected="${bagian==='staf'}" class="${bagian==='staf'?'on':''}" data-bagian="staf"><span>02</span>Staf</button>
   <button type="button" role="tab" aria-selected="${bagian==='pengawasan'}" class="${bagian==='pengawasan'?'on':''}" data-bagian="pengawasan"><span>03</span>Pengawasan Kasir</button>
  </div><div class="owner-konten">${isi}</div></section>`;
  el.querySelectorAll('[data-bagian]').forEach(b=>b.onclick=()=>{bagian=b.dataset.bagian;render()});
  panelImporMaster(el.querySelector('.owner-konten'));
  const opname=el.querySelector('#opname');if(opname)opname.onsubmit=e=>{e.preventDefault();const f=e.currentTarget,menu=q('SELECT * FROM menu WHERE menu_id=?',[+f.menu.value])[0],baru=Math.floor(+f.jumlah.value);if(!menu||!Number.isSafeInteger(baru)||baru<0)return alert('Jumlah stok tidak valid.');coba(async()=>{await tx(()=>{run('UPDATE menu SET stok=? WHERE menu_id=?',[baru,menu.menu_id]);run('INSERT INTO inventori_log(menu_id,nama_menu,jenis,jumlah,stok_sebelum,stok_sesudah,catatan) VALUES(?,?,?,?,?,?,?)',[menu.menu_id,menu.nama_menu,'OPNAME',baru-menu.stok,menu.stok,baru,f.catatan.value.trim()])});render();});};
  const terima=el.querySelector('#terima');if(terima)terima.onsubmit=e=>{e.preventDefault();const f=e.currentTarget,menu=q('SELECT * FROM menu WHERE menu_id=?',[+f.menu.value])[0],jumlah=Math.floor(+f.jumlah.value);if(!menu||!Number.isSafeInteger(jumlah)||jumlah<1||menu.stok+jumlah>2147483647)return alert('Jumlah penerimaan tidak valid.');coba(async()=>{await tx(()=>{run('UPDATE menu SET stok=stok+? WHERE menu_id=?',[jumlah,menu.menu_id]);run('INSERT INTO inventori_log(menu_id,nama_menu,jenis,jumlah,stok_sebelum,stok_sesudah,catatan) VALUES(?,?,?,?,?,?,?)',[menu.menu_id,menu.nama_menu,'TERIMA',jumlah,menu.stok,menu.stok+jumlah,f.catatan.value.trim()])});render();});};
 };
 render();
}
