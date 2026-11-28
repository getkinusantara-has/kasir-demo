import {q} from '../db.js';
import {rp,esc} from '../app.js';
import dataCenter from '../data-center.js';
import pengguna from './pengguna.js';

let bagian='strategi';

const angka=(v)=>Number(v||0).toLocaleString('id-ID');
const tanggal=(d)=>d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'});

function strategi(){
 const ringkas=q(`SELECT COUNT(*) transaksi,COALESCE(SUM(total_harga),0) penjualan
  FROM transaksi WHERE status='LUNAS' AND date(waktu_transaksi)>=date('now','localtime','start of month')`)[0];
 const menu=q(`SELECT d.nama_menu,SUM(d.qty) jumlah FROM detail_transaksi d
  JOIN transaksi t ON t.transaksi_id=d.transaksi_id
  WHERE t.status='LUNAS' AND date(t.waktu_transaksi)>=date('now','localtime','start of month')
  GROUP BY d.menu_id,d.nama_menu ORDER BY jumlah DESC LIMIT 1`)[0];
 const harian=q(`SELECT date(waktu_transaksi) tanggal,COALESCE(SUM(total_harga),0) penjualan
  FROM transaksi WHERE status='LUNAS' AND date(waktu_transaksi)>=date('now','localtime','-6 days')
  GROUP BY date(waktu_transaksi) ORDER BY tanggal`);
 const max=Math.max(1,...harian.map(x=>x.penjualan));
 const map=new Map(harian.map(x=>[x.tanggal,x.penjualan]));
 const bars=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const key=d.toLocaleDateString('sv');return{label:tanggal(d),nilai:map.get(key)||0}});
 return `<div class="owner-kepala"><div><span class="owner-eyebrow">OWNER / STRATEGI BISNIS</span><h1>Strategi Bisnis</h1><p>Pantau gambaran penjualan dan performa usaha dari data transaksi.</p></div><span class="owner-periode">Bulan ini</span></div>
 <div class="owner-metrik">
  <article class="owner-metrik-kartu"><span>Total penjualan</span><strong>${rp(ringkas.penjualan)}</strong><small>Akumulasi transaksi lunas bulan ini</small></article>
  <article class="owner-metrik-kartu"><span>Transaksi lunas</span><strong>${angka(ringkas.transaksi)}</strong><small>Jumlah transaksi bulan ini</small></article>
  <article class="owner-metrik-kartu"><span>Menu terlaris</span><strong class="owner-menu-terlaris">${menu?esc(menu.nama_menu):'Belum ada data'}</strong><small>${menu?`${angka(menu.jumlah)} item terjual bulan ini`:'Belum ada penjualan bulan ini'}</small></article>
 </div>
 <section class="owner-panel"><div class="owner-panel-kepala"><div><h2>Tren penjualan</h2><p>Penjualan harian selama 7 hari terakhir</p></div><span class="owner-tag">7 hari</span></div>
  <div class="owner-grafik">${bars.map(b=>`<div class="owner-kolom"><strong>${b.nilai?rp(b.nilai):'–'}</strong><div class="owner-batang-latar"><i style="height:${b.nilai?Math.max(4,b.nilai/max*100):0}%"></i></div><small>${b.label}</small></div>`).join('')}</div>
 </section>
 <div class="owner-catatan"><b>Catatan data</b><p>Angka di atas berasal dari transaksi berstatus LUNAS. Laba bersih belum dapat dihitung karena aplikasi belum menyimpan harga modal dan biaya operasional. Performa per cabang juga belum tersedia karena database saat ini belum memiliki data cabang.</p></div>`;
}

function pengelolaan(){
 const menu=q('SELECT COUNT(*) jumlah,COALESCE(SUM(status_aktif),0) aktif FROM menu')[0];
 const meja=q('SELECT COUNT(*) jumlah,COALESCE(SUM(aktif),0) aktif FROM meja')[0];
 const kategori=q("SELECT COUNT(DISTINCT COALESCE(NULLIF(trim(kategori),''),'Lainnya')) jumlah FROM menu")[0].jumlah;
 return `<div class="owner-kepala"><div><span class="owner-eyebrow">OWNER / PENGELOLAAN USAHA</span><h1>Pengelolaan Usaha</h1><p>Kelola data utama usaha dan tinjau pengajuan pembelian.</p></div></div>
 <div class="owner-subgrid">
  <section class="owner-panel owner-subpanel"><div class="owner-icon">▦</div><span class="owner-tag">Master data</span><h2>Data utama usaha</h2><p>Ringkasan data yang saat ini sudah tersedia di aplikasi.</p>
   <div class="owner-data-list"><div><span>Menu terdaftar</span><b>${angka(menu.jumlah)}</b></div><div><span>Menu aktif</span><b>${angka(menu.aktif)}</b></div><div><span>Kategori menu</span><b>${angka(kategori)}</b></div><div><span>Meja terdaftar</span><b>${angka(meja.jumlah)}</b></div><div><span>Meja aktif</span><b>${angka(meja.aktif)}</b></div></div>
   <small class="owner-keterangan">Pengaturan dan perubahan master data belum diaktifkan pada halaman Owner.</small>
  </section>
  <section class="owner-panel owner-subpanel"><div class="owner-icon">▤</div><span class="owner-tag owner-tag-amber">Persetujuan pembelian</span><h2>Pengajuan pembelian</h2><p>Tempat meninjau kebutuhan pembelian barang sebelum disetujui.</p>
   <div class="owner-kosong"><b>Belum ada pengajuan</b><span>Data pengajuan akan muncul di sini setelah modul pembelian tersedia.</span></div>
   <small class="owner-keterangan">Belum ada tabel pengajuan pembelian pada database versi ini.</small>
  </section>
 </div>
 <div class="owner-catatan"><b>Ruang lingkup saat ini</b><p>Halaman ini baru menampilkan ringkasan master data yang sudah ada dan area persetujuan pembelian. Fitur tambah, ubah, hapus, serta alur persetujuan belum mengubah database.</p></div>`;
}

export default function view(el){
 const render=()=>{
  el.innerHTML=`<section class="owner-wrap">
   <div class="owner-nav" role="tablist" aria-label="Menu Owner">
    <button type="button" role="tab" aria-selected="${bagian==='strategi'}" class="${bagian==='strategi'?'on':''}" data-bagian="strategi"><span>01</span>Strategi Bisnis</button>
    <button type="button" role="tab" aria-selected="${bagian==='pengelolaan'}" class="${bagian==='pengelolaan'?'on':''}" data-bagian="pengelolaan"><span>02</span>Pengelolaan Usaha</button>
   <button type="button" role="tab" aria-selected="${bagian==='pusatdata'}" class="${bagian==='pusatdata'?'on':''}" data-bagian="pusatdata"><span>03</span>Pusat Data</button>
   <button type="button" role="tab" aria-selected="${bagian==='pengguna'}" class="${bagian==='pengguna'?'on':''}" data-bagian="pengguna"><span>04</span>Pengguna</button>
   </div>
   <div class="owner-konten" id="owner-konten">${bagian==='strategi'?strategi():bagian==='pengelolaan'?pengelolaan():''}</div>
  </section>`;
  el.querySelectorAll('[data-bagian]').forEach(b=>b.onclick=()=>{bagian=b.dataset.bagian;render()});
  if(bagian==='pusatdata')dataCenter(el.querySelector('#owner-konten'));
  if(bagian==='pengguna')pengguna(el.querySelector('#owner-konten'));
 };
 render();
}
