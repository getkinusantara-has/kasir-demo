import {q,run,tx} from './db.js';
const URL_XLSX='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const KOLOM=['menu_id','nama_menu','harga','kategori','stok','status_aktif'];
let lib;
const muat=()=>window.XLSX?Promise.resolve(window.XLSX):(lib||(lib=new Promise((ok,no)=>{
 const s=document.createElement('script');s.src=URL_XLSX;s.onload=()=>ok(window.XLSX);
 s.onerror=()=>{lib=null;no(Error('Pustaka Excel gagal dimuat. Cek internet lalu coba lagi.'))};
 document.head.appendChild(s)})));
export async function unduhMenu(){
 const X=await muat();
 const data=q('SELECT menu_id,nama_menu,harga,kategori,stok,status_aktif FROM menu ORDER BY menu_id');
 const ws=X.utils.json_to_sheet(data,{header:KOLOM});
 ws['!cols']=[{wch:9},{wch:28},{wch:10},{wch:14},{wch:8},{wch:13}];
 const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Menu');
 const b=X.write(wb,{type:'array',bookType:'xlsx'});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([b],{type:'application/octet-stream'}));
 a.download='menu-kafe.xlsx';a.click()}
const bulat=v=>v!==''&&v!=null&&Number.isInteger(Number(v))&&Number(v)>=0;
function aktif(v){const s=String(v).trim().toLowerCase();
 if(s==='')return null;if(['1','ya','aktif','true'].includes(s))return 1;
 if(['0','tidak','nonaktif','false'].includes(s))return 0;return NaN}
export async function bacaFile(file){
 const X=await muat();let baris;
 try{const wb=X.read(await file.arrayBuffer(),{type:'array'});
  baris=X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''})}
 catch{throw Error('File tidak bisa dibaca. Pakai file .xlsx')}
 const ada=q('SELECT menu_id,nama_menu FROM menu'),err=[],aksi=[],namaFile=new Set();let baru=0,ubah=0;
 baris.forEach((b,i)=>{
  const r={};for(const k in b)r[String(k).trim().toLowerCase()]=b[k];
  const n=i+2,nama=String(r.nama_menu??'').trim();
  if(!nama&&r.harga===''&&r.stok==='')return;
  if(!nama)err.push(`Baris ${n}: nama_menu kosong`);
  if(!bulat(r.harga))err.push(`Baris ${n}: harga harus angka bulat, 0 atau lebih`);
  if(!bulat(r.stok))err.push(`Baris ${n}: stok harus angka bulat, 0 atau lebih`);
  const a=aktif(r.status_aktif??'');
  if(Number.isNaN(a))err.push(`Baris ${n}: status_aktif isi 1 atau 0`);
  const kunci=nama.toLowerCase();
  if(nama&&namaFile.has(kunci))err.push(`Baris ${n}: nama "${nama}" muncul dua kali`);
  namaFile.add(kunci);
  let id=null;
  if(String(r.menu_id??'').trim()!==''){
   id=Number(r.menu_id);
   if(!ada.some(m=>m.menu_id===id))err.push(`Baris ${n}: menu_id ${r.menu_id} tidak ditemukan`)}
  else{const m=ada.find(m=>m.nama_menu.trim().toLowerCase()===kunci);if(m)id=m.menu_id}
  aksi.push({id,nama,harga:Number(r.harga),kategori:String(r.kategori??'').trim(),stok:Number(r.stok),aktif:a});
  id?ubah++:baru++});
 if(!aksi.length&&!err.length)err.push('Tidak ada baris menu di file ini');
 return{err,aksi,baru,ubah}}
export const terapkan=aksi=>tx(()=>{for(const a of aksi){
 if(a.id)run('UPDATE menu SET nama_menu=?,harga=?,kategori=?,stok=?,status_aktif=COALESCE(?,status_aktif) WHERE menu_id=?',[a.nama,a.harga,a.kategori,a.stok,a.aktif,a.id]);
 else run('INSERT INTO menu(nama_menu,harga,kategori,stok,status_aktif)VALUES(?,?,?,?,?)',[a.nama,a.harga,a.kategori,a.stok,a.aktif??1])}});
