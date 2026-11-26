import {q,ekspor,impor} from '../db.js';import {batalkan} from '../logic.js';import {cetak,sambung} from '../printer.js';import {rp,esc,coba} from '../app.js';
export default function view(el,tgl=new Date().toLocaleDateString('sv')){
 const w="date(waktu_transaksi)=? AND status='LUNAS'";
 const r=q(`SELECT count(*) n,coalesce(sum(total_harga),0) t FROM transaksi WHERE ${w}`,[tgl])[0];
 el.innerHTML=`<input type="date" value="${tgl}" id="tgl"><h2>${rp(r.t)} dari ${r.n} transaksi</h2>
 ${q(`SELECT metode_pembayaran m,sum(total_harga) t FROM transaksi WHERE ${w} GROUP BY 1`,[tgl]).map(x=>`<div class="baris">${x.m}<b>${rp(x.t)}</b></div>`).join('')}
 <h3>Menu terjual</h3>${q(`SELECT d.nama_menu n,sum(qty) j FROM detail_transaksi d JOIN transaksi USING(transaksi_id) WHERE ${w} GROUP BY 1 ORDER BY 2 DESC`,[tgl]).map(x=>`<div class="baris">${esc(x.n)}<b>${x.j}</b></div>`).join('')}
 <h3>Transaksi</h3>${q('SELECT * FROM transaksi WHERE date(waktu_transaksi)=? ORDER BY 1 DESC',[tgl]).map(t=>`<div class="baris"><span>#${t.transaksi_id} ${rp(t.total_harga)} ${t.status}</span><span><button data-c="${t.transaksi_id}">Cetak</button> ${t.status==='LUNAS'?`<button data-v="${t.transaksi_id}">Void</button>`:''}</span></div>`).join('')}
 <h3>Alat</h3><button id="bt">Sambungkan printer Bluetooth</button> <button id="bk">Unduh backup</button> <label>Pulihkan backup <input type="file" id="pl" accept=".sqlite"></label>`;
 const $=s=>el.querySelector(s);$('#tgl').onchange=e=>view(el,e.target.value);
 el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>coba(()=>cetak(+b.dataset.c)));
 el.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const pin=prompt('PIN void (isian pertama menjadi PIN toko)');if(!pin)return;const a=prompt('Alasan void');if(a)coba(async()=>{await batalkan(+b.dataset.v,pin,a);view(el,tgl)})});
 $('#bt').onclick=()=>coba(async()=>{await sambung();alert('Printer tersambung')});
 $('#bk').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ekspor()]));a.download=`kasir-${tgl}.sqlite`;a.click()};
 $('#pl').onchange=e=>{const f=e.target.files[0];if(f&&confirm('Data sekarang akan diganti. Lanjutkan?'))coba(async()=>{await impor(new Uint8Array(await f.arrayBuffer()));view(el)})}}
