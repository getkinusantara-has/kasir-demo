import {q,run,tx} from './db.js';
export const TAHAN_MAKS=120;
const MENUNGGU_MASIH="status='MENUNGGU' AND datetime('now','localtime')<=datetime(mulai,'+'||toleransi_menit||' minutes')";
const HANGUS="status='MENUNGGU' AND datetime('now','localtime')>datetime(mulai,'+'||toleransi_menit||' minutes')";
export const infoMeja=()=>{const m=new Map();
 for(const b of q(`SELECT *,substr(mulai,12,5) jam FROM booking WHERE (${MENUNGGU_MASIH} AND datetime('now','localtime')>=datetime(mulai,'-60 minutes')) OR (status='DATANG' AND transaksi_id IS NULL AND date(mulai)=date('now','localtime')) ORDER BY mulai`))if(!m.has(b.meja_id))m.set(b.meja_id,b);return m};
export const datangBooking=id=>q("SELECT * FROM booking WHERE meja_id=? AND status='DATANG' AND transaksi_id IS NULL AND date(mulai)=date('now','localtime') ORDER BY mulai LIMIT 1",[id])[0];
export const daftar=tgl=>q(`SELECT *,substr(mulai,12,5) jam,substr(datetime(mulai,'+'||durasi_menit||' minutes'),12,5) selesai,(${HANGUS}) hangus FROM booking WHERE date(mulai)=? ORDER BY meja_id,mulai`,[tgl]);
const siap=(b,abaikan)=>{
 const nama=String(b.nama||'').trim();if(!nama)throw Error('Nama pemesan wajib diisi');
 const meja=q('SELECT meja_id FROM meja WHERE meja_id=? AND aktif=1',[b.meja])[0];if(!meja)throw Error('Meja tidak ditemukan');
 const mulai=`${b.tgl} ${b.jam}:00`;if(!/^\d{4}-\d\d-\d\d \d\d:\d\d:00$/.test(mulai))throw Error('Tanggal atau jam belum diisi');
 const dur=Math.min(Math.max(Math.floor(+b.durasi)||TAHAN_MAKS,15),TAHAN_MAKS),tol=+b.toleransi===30?30:15;
 const dp=Math.max(Math.round(+b.dp)||0,0),orang=Math.floor(+b.orang)||null;
 const x=q(`SELECT nama,substr(mulai,12,5) jam,substr(datetime(mulai,'+'||durasi_menit||' minutes'),12,5) selesai FROM booking WHERE booking_id<>? AND meja_id=? AND status<>'BATAL' AND NOT(${HANGUS}) AND mulai<datetime(?,'+'||?||' minutes') AND datetime(mulai,'+'||durasi_menit||' minutes')>? ORDER BY mulai LIMIT 1`,[abaikan,b.meja,mulai,dur,mulai])[0];
 if(x)throw Error(`Meja ${b.meja} sudah dibooking ${x.jam}-${x.selesai} a.n. ${x.nama}`);
 return [b.meja,nama,String(b.hp||'').trim()||null,orang,mulai,dur,tol,dp,String(b.catatan||'').trim()||null]};
export const buat=b=>tx(()=>run('INSERT INTO booking(meja_id,nama,hp,jumlah_orang,mulai,durasi_menit,toleransi_menit,dp,catatan)VALUES(?,?,?,?,?,?,?,?,?)',siap(b,0)));
export const ubah=(id,b)=>tx(()=>{
 if(!q("SELECT 1 FROM booking WHERE booking_id=? AND status='MENUNGGU'",[id]).length)throw Error('Hanya booking yang masih menunggu yang bisa diubah');
 run('UPDATE booking SET meja_id=?,nama=?,hp=?,jumlah_orang=?,mulai=?,durasi_menit=?,toleransi_menit=?,dp=?,catatan=? WHERE booking_id=?',[...siap(b,id),id])});
export const tamuDatang=id=>tx(()=>{
 const b=q("SELECT * FROM booking WHERE booking_id=? AND status='MENUNGGU'",[id])[0];if(!b)throw Error('Booking tidak ditemukan');
 if(q("SELECT 1 FROM meja WHERE meja_id=? AND status_okupansi='TERISI'",[b.meja_id]).length)throw Error(`Meja ${b.meja_id} masih terisi. Kosongkan dulu di halaman Meja.`);
 run("UPDATE booking SET status='DATANG' WHERE booking_id=?",[id])});
export const batalBooking=(id,nasib)=>tx(()=>{
 const b=q("SELECT dp FROM booking WHERE booking_id=? AND status IN('MENUNGGU','DATANG') AND transaksi_id IS NULL",[id])[0];if(!b)throw Error('Booking ini tidak bisa dibatalkan');
 if(b.dp>0&&!['KEMBALI','HANGUS'].includes(nasib))throw Error('Pilih dulu: DP dikembalikan atau DP hangus');
 run("UPDATE booking SET status='BATAL',dp_nasib=? WHERE booking_id=?",[b.dp>0?nasib:null,id])});
