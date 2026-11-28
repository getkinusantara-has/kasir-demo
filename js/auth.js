// Akun dan PIN per orang. PIN tidak pernah disimpan; hanya hash PBKDF2 + garam.
import {q,run,tx} from './db.js';
import {unduhExcel,bacaExcel,tanggalTag} from './xlsx-kit.js';
export const JABATAN=['Kasir','Manajemen','Owner'];
export const PIN_RE=/^\d{6}$/;
const MAX_SALAH=5,TAHAN_DETIK=30,ITERASI=150000,JENIS_EXCEL='PENGGUNA';
const enc=new TextEncoder();
const b2h=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const h2b=h=>new Uint8Array(h.match(/../g).map(x=>parseInt(x,16)));
const acak=n=>b2h(crypto.getRandomValues(new Uint8Array(n)));
export async function hashPin(pin,garamHex){
 if(!globalThis.crypto?.subtle)throw Error('Browser ini tidak mendukung pengamanan PIN. Buka aplikasi lewat alamat HTTPS.');
 const k=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);
 return b2h(await crypto.subtle.deriveBits({name:'PBKDF2',salt:h2b(garamHex),iterations:ITERASI,hash:'SHA-256'},k,256))}
const cekPin=(pin,ulang)=>{if(!PIN_RE.test(String(pin)))throw Error('PIN harus 6 digit angka');
 if(ulang!==undefined&&String(ulang)!==String(pin))throw Error('Pengulangan PIN tidak sama')};
// --- Pembatas percobaan salah (per perangkat) ---
const KS='kasir_pin_salah';
const baca=()=>{try{return JSON.parse(localStorage.getItem(KS))||{n:0,sampai:0}}catch{return{n:0,sampai:0}}};
const tulis=v=>{try{localStorage.setItem(KS,JSON.stringify(v))}catch{}};
export const sisaTahan=()=>Math.max(0,Math.ceil((baca().sampai-Date.now())/1000));
const cekTahan=()=>{const s=sisaTahan();if(s>0)throw Error(`Terlalu banyak percobaan salah. Coba lagi dalam ${s} detik.`)};
function gagal(apa){const b=baca();b.n=(b.n||0)+1;let sisa=MAX_SALAH-b.n;
 if(b.n>=MAX_SALAH){b.n=0;b.sampai=Date.now()+TAHAN_DETIK*1000;sisa=0}tulis(b);
 return Error(sisa>0?`${apa} Sisa percobaan: ${sisa}.`:`${apa} Terlalu banyak percobaan, tunggu ${TAHAN_DETIK} detik.`)}
const berhasil=()=>tulis({n:0,sampai:0});
// --- Pembacaan ---
export const semuaPengguna=()=>q("SELECT pengguna_id,kode,nama,jabatan,aktif FROM pengguna ORDER BY CASE jabatan WHEN 'Owner' THEN 0 WHEN 'Manajemen' THEN 1 ELSE 2 END,lower(nama)");
export const statusPengguna=()=>({total:q('SELECT COUNT(*) n FROM pengguna')[0].n,owner:q("SELECT COUNT(*) n FROM pengguna WHERE jabatan='Owner'")[0].n});
// Peran 'owner' hanya untuk Owner; 'manajemen' untuk Manajemen dan Owner (Owner boleh membuka halaman Manajemen).
export const penggunaBoleh=peran=>q(`SELECT pengguna_id,nama,jabatan FROM pengguna WHERE aktif=1 AND jabatan IN (${peran==='owner'?"'Owner'":"'Manajemen','Owner'"}) ORDER BY lower(nama)`);
const ambil=id=>q('SELECT * FROM pengguna WHERE pengguna_id=?',[id])[0];
export async function masukDenganPin(id,pin,peran){
 cekTahan();cekPin(pin);
 const u=ambil(id);if(!u||!u.aktif)throw Error('Pengguna tidak ditemukan atau tidak aktif');
 if(!penggunaBoleh(peran).some(x=>x.pengguna_id===u.pengguna_id))throw Error('Pengguna ini tidak berhak membuka halaman tersebut');
 if(await hashPin(String(pin),u.salt)!==u.pin_hash)throw gagal('PIN salah.');
 berhasil();return{id:u.pengguna_id,nama:u.nama,jabatan:u.jabatan}}
// --- Penulisan ---
const kodeBaru=()=>'U-'+acak(8);
function cekNama(nama,abaikan=0){const n=String(nama||'').trim();if(!n)throw Error('Nama wajib diisi');if(n.length>60)throw Error('Nama maksimal 60 karakter');
 if(q('SELECT 1 FROM pengguna WHERE lower(nama)=lower(?) AND pengguna_id<>?',[n,abaikan]).length)throw Error('Nama sudah dipakai pengguna lain');return n}
export async function tambahPengguna(nama,jabatan,pin,ulang){
 const n=cekNama(nama);if(!JABATAN.includes(jabatan))throw Error('Jabatan tidak valid');cekPin(pin,ulang);
 const garam=acak(16),h=await hashPin(String(pin),garam);
 return tx(()=>{cekNama(n);run('INSERT INTO pengguna(kode,nama,jabatan,pin_hash,salt)VALUES(?,?,?,?,?)',[kodeBaru(),n,jabatan,h,garam]);return q('SELECT last_insert_rowid() id')[0].id})}
export async function ubahPin(id,pin,ulang){
 cekPin(pin,ulang);if(!ambil(id))throw Error('Pengguna tidak ditemukan');
 const garam=acak(16),h=await hashPin(String(pin),garam);
 await tx(()=>run("UPDATE pengguna SET pin_hash=?,salt=?,diubah=datetime('now','localtime') WHERE pengguna_id=?",[h,garam,id]))}
export async function setAktif(id,aktif){
 const u=ambil(id);if(!u)throw Error('Pengguna tidak ditemukan');
 if(!aktif&&u.jabatan==='Owner'&&q("SELECT COUNT(*) n FROM pengguna WHERE jabatan='Owner' AND aktif=1 AND pengguna_id<>?",[id])[0].n<1)throw Error('Tidak bisa menonaktifkan Owner terakhir yang aktif');
 await tx(()=>run("UPDATE pengguna SET aktif=?,diubah=datetime('now','localtime') WHERE pengguna_id=?",[aktif?1:0,id]))}
// --- Kode pemulihan Owner ---
const ABJAD='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function buatKode(){const b=crypto.getRandomValues(new Uint8Array(16));let s='';for(const x of b)s+=ABJAD[x%ABJAD.length];return s.match(/.{4}/g).join('-')}
const rapikanKode=k=>String(k||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const simpanKode=async kode=>{const g=acak(16),h=await hashPin(rapikanKode(kode),g);return[g,h]};
const tulisKode=(g,h)=>{run("INSERT OR REPLACE INTO pengaturan(kunci,nilai)VALUES('pemulihan_salt',?)",[g]);run("INSERT OR REPLACE INTO pengaturan(kunci,nilai)VALUES('pemulihan_hash',?)",[h])};
const ambilPeng=k=>q('SELECT nilai FROM pengaturan WHERE kunci=?',[k])[0]?.nilai;
export const adaKodePemulihan=()=>!!(ambilPeng('pemulihan_hash')&&ambilPeng('pemulihan_salt'));
export async function buatOwnerPertama(nama,pin,ulang){
 if(statusPengguna().total>0)throw Error('Perangkat ini sudah punya pengguna');
 const n=cekNama(nama);cekPin(pin,ulang);
 const garam=acak(16),h=await hashPin(String(pin),garam),kode=buatKode(),[kg,kh]=await simpanKode(kode);
 const id=await tx(()=>{if(statusPengguna().total>0)throw Error('Perangkat ini sudah punya pengguna');
  run('INSERT INTO pengguna(kode,nama,jabatan,pin_hash,salt)VALUES(?,?,?,?,?)',[kodeBaru(),n,'Owner',h,garam]);tulisKode(kg,kh);return q('SELECT last_insert_rowid() id')[0].id});
 return{user:{id,nama:n,jabatan:'Owner'},kode}}
export async function pulihkanOwner(kode,id,pinBaru,ulang){
 cekTahan();cekPin(pinBaru,ulang);
 if(!adaKodePemulihan())throw Error('Kode pemulihan belum diatur di perangkat ini');
 const u=ambil(id);if(!u||u.jabatan!=='Owner'||!u.aktif)throw Error('Pilih akun Owner yang aktif');
 if(await hashPin(rapikanKode(kode),ambilPeng('pemulihan_salt'))!==ambilPeng('pemulihan_hash'))throw gagal('Kode pemulihan salah.');
 berhasil();
 const garam=acak(16),h=await hashPin(String(pinBaru),garam),baru=buatKode(),[kg,kh]=await simpanKode(baru);
 await tx(()=>{run("UPDATE pengguna SET pin_hash=?,salt=?,diubah=datetime('now','localtime') WHERE pengguna_id=?",[h,garam,id]);tulisKode(kg,kh)});
 return{kode:baru}}
// --- Pertukaran daftar pengguna lewat Excel ---
const KOLOM=['kode','nama','jabatan','pin_hash','salt','aktif'];
export const barisPengguna=()=>q('SELECT kode,nama,jabatan,pin_hash,salt,aktif FROM pengguna ORDER BY pengguna_id');
export const eksporPenggunaExcel=()=>unduhExcel(`pengguna-${tanggalTag()}.xlsx`,JENIS_EXCEL,{pengguna:{kolom:KOLOM,baris:barisPengguna()}});
export function validasiPengguna(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('Sheet "pengguna" kosong');
 const kode=new Set(),nama=new Set(),hasil=[];
 rows.forEach((r,i)=>{const n=i+2,e=m=>{throw Error(`Baris ${n}: ${m}`)};
  const k=String(r.kode??'').trim(),nm=String(r.nama??'').trim(),jb=String(r.jabatan??'').trim(),ph=String(r.pin_hash??'').trim().toLowerCase(),sl=String(r.salt??'').trim().toLowerCase(),ak=Number(r.aktif);
  if(!k)e('kode kosong');if(kode.has(k))e(`kode "${k}" muncul dua kali`);kode.add(k);
  if(!nm)e('nama kosong');if(nama.has(nm.toLowerCase()))e(`nama "${nm}" muncul dua kali`);nama.add(nm.toLowerCase());
  if(!JABATAN.includes(jb))e(`jabatan harus salah satu dari ${JABATAN.join('/')}`);
  if(!/^[0-9a-f]{64}$/.test(ph))e('pin_hash tidak valid (jangan edit kolom ini)');
  if(!/^[0-9a-f]{32}$/.test(sl))e('salt tidak valid (jangan edit kolom ini)');
  if(ak!==0&&ak!==1)e('aktif harus 1 atau 0');
  hasil.push({kode:k,nama:nm,jabatan:jb,pin_hash:ph,salt:sl,aktif:ak})});
 if(!hasil.some(x=>x.jabatan==='Owner'&&x.aktif))throw Error('File harus memuat minimal satu Owner yang aktif');
 return hasil}
// Mengganti SELURUH daftar pengguna perangkat ini dengan isi file.
export async function terapkanPengguna(hasil){
 await tx(()=>{run('DELETE FROM pengguna');for(const x of hasil)run('INSERT INTO pengguna(kode,nama,jabatan,pin_hash,salt,aktif)VALUES(?,?,?,?,?,?)',[x.kode,x.nama,x.jabatan,x.pin_hash,x.salt,x.aktif])});
 return hasil.length}
export async function bacaPenggunaExcel(file){const {sheets}=await bacaExcel(file,JENIS_EXCEL);return validasiPengguna(sheets.pengguna)}
