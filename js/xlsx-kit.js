// Kerangka impor/ekspor Excel bersama untuk semua modul (Tahap 0).
// Format: satu file .xlsx per jenis data, satu sheet per tabel, ditambah sheet "_info" sebagai penanda.
const URL_XLSX='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
export const FORMAT='KIN-KASIR-XLSX',VERSI=1,MAKS_BYTE=5*1024*1024;
let lib;
export const muatXlsx=()=>window.XLSX?Promise.resolve(window.XLSX):(lib||(lib=new Promise((ok,no)=>{
 const s=document.createElement('script');s.src=URL_XLSX;s.onload=()=>ok(window.XLSX);
 s.onerror=()=>{lib=null;no(Error('Pustaka Excel gagal dimuat. Cek internet lalu coba lagi.'))};
 document.head.appendChild(s)})));
const KEY='kasir_v26_device_id';
export const deviceId=()=>{let id;try{id=localStorage.getItem(KEY)}catch{}
 if(!id){id='DEV-'+(globalThis.crypto?.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));try{localStorage.setItem(KEY,id)}catch{}}
 return id};
export const tanggalTag=()=>new Date().toLocaleDateString('sv');
// tabel: {namaSheet:{kolom:['a','b'],baris:[{a:1,b:2}]}}
export async function unduhExcel(namaFile,jenis,tabel){
 const X=await muatXlsx(),wb=X.utils.book_new();
 for(const [nama,t] of Object.entries(tabel)){
  const ws=X.utils.json_to_sheet(t.baris,{header:t.kolom});
  if(!t.baris.length)X.utils.sheet_add_aoa(ws,[t.kolom],{origin:'A1'});
  ws['!cols']=t.kolom.map(k=>({wch:Math.min(40,Math.max(10,k.length+2))}));
  X.utils.book_append_sheet(wb,ws,nama)}
 const info=[['kunci','nilai'],['format',FORMAT],['jenis',jenis],['versi',VERSI],['perangkat',deviceId()],['dibuat',new Date().toISOString()]];
 X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet(info),'_info');
 const b=X.write(wb,{type:'array',bookType:'xlsx'});
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([b],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 a.download=namaFile;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
// Mengembalikan {info:{...},sheets:{nama:[baris...]}}; melempar Error dengan pesan jelas bila file tidak cocok.
export async function bacaExcel(file,jenis){
 if(!file)throw Error('Pilih file Excel dulu');
 if(!/\.xlsx$/i.test(file.name))throw Error('Format file harus .xlsx (Excel)');
 if(file.size>MAKS_BYTE)throw Error('File terlalu besar (maksimal 5 MB)');
 const X=await muatXlsx();let wb;
 try{wb=X.read(await file.arrayBuffer(),{type:'array'})}catch{throw Error('File tidak bisa dibaca. Pastikan ini file .xlsx yang utuh')}
 const w=wb.Sheets._info;if(!w)throw Error('File ini bukan hasil ekspor aplikasi (sheet _info tidak ada)');
 const info={};for(const r of X.utils.sheet_to_json(w,{defval:''}))info[String(r.kunci)]=r.nilai;
 if(info.format!==FORMAT)throw Error('File ini bukan format pertukaran data aplikasi');
 if(Number(info.versi)!==VERSI)throw Error('Versi file tidak didukung');
 if(jenis&&info.jenis!==jenis)throw Error(`Jenis file tidak sesuai. Diharapkan "${jenis}", file ini "${info.jenis}"`);
 const sheets={};for(const n of wb.SheetNames)if(n!=='_info')sheets[n]=X.utils.sheet_to_json(wb.Sheets[n],{defval:''});
 return{info,sheets}}
