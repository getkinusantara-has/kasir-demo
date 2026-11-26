import {q} from './db.js';
const UUID=['000018f0-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455'];
let ch;
export function teks(id){const t=q('SELECT * FROM transaksi WHERE transaksi_id=?',[id])[0];
 const kol=(a,b)=>a+' '.repeat(Math.max(1,32-a.length-String(b).length))+b;
 return['KASIR KAFE',`No ${id}  ${t.waktu_transaksi}`,t.meja_id?'Meja '+t.meja_id:'Bawa pulang','-'.repeat(32),
 ...q('SELECT * FROM detail_transaksi WHERE transaksi_id=?',[id]).flatMap(d=>[d.nama_menu,kol(`${d.qty} x ${d.harga_satuan}`,d.qty*d.harga_satuan)]),
 '-'.repeat(32),kol('Total',t.total_harga),kol(t.metode_pembayaran,t.uang_diterima),kol('Kembali',t.kembalian),t.status==='VOID'?'** VOID **':'Terima kasih'].join('\n')}
export async function sambung(){if(!navigator.bluetooth)throw Error('Browser ini tidak mendukung Web Bluetooth');
 const d=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:UUID});const g=await d.gatt.connect();
 for(const s of await g.getPrimaryServices())for(const c of await s.getCharacteristics())if(c.properties.write||c.properties.writeWithoutResponse){ch=c;d.addEventListener('gattserverdisconnected',()=>ch=null);return}
 throw Error('Printer tidak cocok')}
export async function cetak(id){const s=teks(id);
 if(!ch){document.querySelector('#struk').textContent=s;return print()}
 const b=new TextEncoder().encode('\x1b@'+s+'\n\n\n\n');
 for(let i=0;i<b.length;i+=20){const p=b.slice(i,i+20);await(ch.properties.write?ch.writeValueWithResponse(p):ch.writeValueWithoutResponse(p))}}
