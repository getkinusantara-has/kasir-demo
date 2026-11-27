const CDN='https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
let SQL,db;
const idb=(mode,fn)=>new Promise((ok,no)=>{const o=indexedDB.open('kasir',1);
 o.onupgradeneeded=()=>o.result.createObjectStore('f');o.onerror=()=>no(o.error);
 o.onsuccess=()=>{const t=o.result.transaction('f',mode),r=fn(t.objectStore('f'));
 t.oncomplete=()=>{o.result.close();ok(r.result)};t.onabort=()=>no(t.error)}});
const BOOKING=`CREATE TABLE booking(booking_id INTEGER PRIMARY KEY,meja_id INTEGER NOT NULL REFERENCES meja,nama TEXT NOT NULL,hp TEXT,jumlah_orang INTEGER,mulai TEXT NOT NULL,durasi_menit INTEGER NOT NULL DEFAULT 120,toleransi_menit INTEGER NOT NULL DEFAULT 15,dp INTEGER NOT NULL DEFAULT 0,catatan TEXT,status TEXT NOT NULL DEFAULT 'MENUNGGU' CHECK(status IN('MENUNGGU','DATANG','BATAL','SELESAI')),dibuat TEXT NOT NULL DEFAULT(datetime('now','localtime')),transaksi_id INTEGER,dp_nasib TEXT CHECK(dp_nasib IN('KEMBALI','HANGUS')))`;
const SKEMA=`
CREATE TABLE menu(menu_id INTEGER PRIMARY KEY,nama_menu TEXT NOT NULL,harga INTEGER NOT NULL CHECK(harga>=0),kategori TEXT,stok INTEGER NOT NULL CHECK(stok>=0),status_aktif INTEGER NOT NULL DEFAULT 1,gambar TEXT);
CREATE TABLE meja(meja_id INTEGER PRIMARY KEY,kapasitas INTEGER NOT NULL,status_okupansi TEXT NOT NULL DEFAULT 'KOSONG' CHECK(status_okupansi IN('KOSONG','TERISI')),aktif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE transaksi(transaksi_id INTEGER PRIMARY KEY,meja_id INTEGER REFERENCES meja,total_harga INTEGER NOT NULL,metode_pembayaran TEXT NOT NULL,uang_diterima INTEGER NOT NULL,kembalian INTEGER NOT NULL,waktu_transaksi TEXT NOT NULL DEFAULT(datetime('now','localtime')),status TEXT NOT NULL DEFAULT 'LUNAS',alasan_void TEXT,waktu_void TEXT,dp_dipakai INTEGER NOT NULL DEFAULT 0);
CREATE TABLE detail_transaksi(detail_id INTEGER PRIMARY KEY,transaksi_id INTEGER NOT NULL REFERENCES transaksi,menu_id INTEGER NOT NULL REFERENCES menu,nama_menu TEXT,harga_satuan INTEGER,qty INTEGER CHECK(qty>0));
CREATE TABLE pengaturan(kunci TEXT PRIMARY KEY,nilai TEXT);
INSERT INTO meja(kapasitas)VALUES(2),(2),(4),(4),(4),(6);
INSERT INTO menu(nama_menu,harga,kategori,stok)VALUES('Kopi Susu Aren',18000,'Minuman',50),('Americano',15000,'Minuman',50),('Es Teh',8000,'Minuman',80),('Roti Bakar',17000,'Makanan',20);`;
export function q(sql,p=[]){const s=db.prepare(sql),h=[];s.bind(p);while(s.step())h.push(s.getAsObject());s.free();return h}
export const run=(sql,p)=>db.run(sql,p);
function migrasiBooking(){
 const ada=q("SELECT sql FROM sqlite_master WHERE type='table' AND name='booking'")[0];
 if(!ada){db.run(BOOKING);return}
 const sql=String(ada.sql||'').replace(/\s/g,'').toUpperCase();
 if(sql.includes("'SELESAI'"))return;
 const cols=q("SELECT name FROM pragma_table_info('booking')").map(x=>x.name);
 const punya=n=>cols.includes(n)?n:'NULL';
 db.run('PRAGMA foreign_keys=OFF');
 try{
  db.run('ALTER TABLE booking RENAME TO booking_lama_migrasi');
  db.run(BOOKING);
  db.run(`INSERT INTO booking(booking_id,meja_id,nama,hp,jumlah_orang,mulai,durasi_menit,toleransi_menit,dp,catatan,status,dibuat,transaksi_id,dp_nasib)
   SELECT ${['booking_id','meja_id','nama','hp','jumlah_orang','mulai','durasi_menit','toleransi_menit','dp','catatan','status','dibuat','transaksi_id','dp_nasib'].map(punya).join(',')}
   FROM booking_lama_migrasi`);
  db.run('DROP TABLE booking_lama_migrasi');
 }finally{db.run('PRAGMA foreign_keys=ON')}
}
function muat(bytes){
 db=new SQL.Database(bytes);db.run('PRAGMA foreign_keys=ON');
 if(bytes&&!q("SELECT 1 FROM pragma_table_info('meja') WHERE name='aktif'").length)db.run('ALTER TABLE meja ADD COLUMN aktif INTEGER NOT NULL DEFAULT 1');
 if(bytes&&!q("SELECT 1 FROM pragma_table_info('menu') WHERE name='gambar'").length)db.run('ALTER TABLE menu ADD COLUMN gambar TEXT');
 if(bytes&&!q("SELECT 1 FROM pragma_table_info('transaksi') WHERE name='dp_dipakai'").length)db.run('ALTER TABLE transaksi ADD COLUMN dp_dipakai INTEGER NOT NULL DEFAULT 0');
 migrasiBooking();
}
export const ekspor=()=>{const b=db.export();db.run('PRAGMA foreign_keys=ON');return b};
const simpan=()=>{const b=ekspor();return idb('readwrite',s=>s.put(b,'db'))};
export async function init(){SQL=await initSqlJs({locateFile:f=>CDN+f});const b=await idb('readonly',s=>s.get('db'));muat(b);if(!b){db.run(SKEMA);await simpan()}else await simpan()}
export async function tx(fn){db.run('BEGIN IMMEDIATE');let h;
 try{h=fn();db.run('COMMIT')}catch(e){db.run('ROLLBACK');throw e}
 try{await simpan()}catch(e){muat(await idb('readonly',s=>s.get('db')));throw e}return h}
export async function impor(b){const t=new SQL.Database(b);t.exec('SELECT 1 FROM menu,meja,transaksi,detail_transaksi,pengaturan LIMIT 1');t.close();muat(b);await simpan()}
