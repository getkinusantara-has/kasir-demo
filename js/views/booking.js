import {q} from '../db.js';
import {daftar,buat,ubah,tamuDatang,batalBooking,checkoutBooking,TAHAN_MAKS,ketersediaan} from '../booking.js';
import {rp,esc,coba} from '../app.js';
const hariIni=()=>new Date().toLocaleDateString('sv');
const geser=(t,n)=>{const d=new Date(t+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('sv')};
let tgl=hariIni(),edit=null,batal=null,cari='',filter='SEMUA',cekTgl=hariIni(),cekJam='19:00',cekDur=120;
const NASIB={KEMBALI:'DP dikembalikan ke tamu',HANGUS:'DP hangus (ditahan)'};
const nomorWA=s=>{let n=String(s||'').replace(/[\s+\-().]/g,'');if(n.startsWith('0'))n='62'+n.slice(1);else if(n.startsWith('8'))n='62'+n;return n};
const tanggal=s=>new Date(s+'T12:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
export default function view(el){
 const meja=q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id'),data=daftar(tgl);
 if(edit&&!q("SELECT 1 FROM booking WHERE booking_id=? AND status='MENUNGGU'",[edit.booking_id]).length)edit=null;
 const v=edit?{nama:edit.nama,hp:edit.hp||'',tgl:edit.mulai.slice(0,10),jam:edit.mulai.slice(11,16),meja:edit.meja_id,orang:edit.jumlah_orang||'',durasi:edit.durasi_menit,tol:edit.toleransi_menit,dp:edit.dp||'',catatan:edit.catatan||''}:{nama:'',hp:'',tgl,jam:'',meja:meja[0]?.meja_id,orang:'',durasi:120,tol:15,dp:'',catatan:''};
 const b0=batal&&data.find(b=>b.booking_id===batal);if(!b0)batal=null;
 const hasil=data.filter(b=>(filter==='SEMUA'||b.status===filter)&&(!cari||[b.nama,b.hp,b.meja_id].some(x=>String(x??'').toLowerCase().includes(cari.toLowerCase()))));
 const usaha=q("SELECT nilai FROM pengaturan WHERE kunci='nama_usaha'")[0]?.nilai||'Kasir Demo';
 const tombol=b=>{
  if(b.status==='SELESAI')return '<small>Selesai</small>';
  if(b.status==='BATAL')return `<small>Dibatalkan${b.dp?' · '+(NASIB[b.dp_nasib]||'DP belum dicatat'):''}</small>`;
  if(b.status==='DATANG')return `<small>${b.transaksi_id?'Sudah dibayar #'+b.transaksi_id:'Sudah datang'}</small> <button class="utama" data-x="${b.booking_id}">Checkout</button> ${b.transaksi_id?'':`<button data-b="${b.booking_id}">Batal</button>`}`;
  const wa=nomorWA(b.hp);
  return `<button class="utama" data-d="${b.booking_id}">Tamu datang</button> <button data-u="${b.booking_id}">Ubah</button> <button data-b="${b.booking_id}">Batal</button> ${wa?`<button data-wa="${b.booking_id}">Follow up</button>`:'<button disabled title="HP belum diisi">Follow up</button><small>HP belum diisi</small>'}`;
 };
 const tersedia=ketersediaan(cekTgl,cekJam,cekDur);
 el.innerHTML=`<div class="baris"><b>Booking</b><span><button id="kmrn" aria-label="Hari sebelumnya">‹</button> <input type="date" id="tgl" value="${tgl}"> <button id="bsk" aria-label="Hari berikutnya">›</button> <button id="ini">Hari ini</button></span></div>
 <section class="nota"><h3>Cek ketersediaan</h3><div class="form-grid"><label class="fl">Tanggal<input type="date" id="ctgl" value="${esc(cekTgl)}"></label><label class="fl">Jam<input type="time" id="cjam" value="${esc(cekJam)}"></label><label class="fl">Durasi (menit)<input type="number" id="cdur" min="15" max="${TAHAN_MAKS}" value="${cekDur}"></label></div>
 <div class="grid" id="ketersediaan">${tersedia.map(m=>`<button type="button" class="mj ${m.status==='TERSEDIA'?'kosong':m.status==='DIBOOKING'?'dibooking':'terisi'}" data-pilih="${m.meja_id}" ${m.status!=='TERSEDIA'?'disabled':''}>Meja ${m.meja_id}<br><small>${m.kapasitas} kursi</small><br><b>${m.status}</b>${m.status==='DIBOOKING'?`<br><small>${esc(m.jam)} · ${esc(m.nama)}</small>`:''}</button>`).join('')}</div></section>
 ${b0?`<div class="nota" id="pbatal"><b>Batalkan booking ${esc(b0.nama)} (Meja ${b0.meja_id}, ${b0.jam})?</b><div class="merah">Tamu ini sudah membayar DP ${rp(b0.dp)}. Pilih nasib uang DP-nya:</div><button class="utama" data-n="KEMBALI">DP dikembalikan ke tamu</button><button data-n="HANGUS">DP hangus (ditahan)</button><button id="tutup">Jangan batalkan</button></div>`:''}
 <form id="fb" class="nota">${edit?`<div class="fl" style="flex:1 1 100%"><b>Ubah booking ${esc(edit.nama)}</b></div>`:''}<label class="fl">Nama pemesan<input name="nama" required value="${esc(v.nama)}"></label><label class="fl">No. HP (opsional)<input name="hp" type="tel" inputmode="tel" value="${esc(v.hp)}"></label>
 <label class="fl">Tanggal<input name="tgl" type="date" value="${esc(v.tgl)}" required></label><label class="fl">Jam<input name="jam" type="time" value="${esc(v.jam)}" required></label>
 <label class="fl">Meja<select name="meja">${meja.map(m=>`<option value="${m.meja_id}"${m.meja_id===v.meja?' selected':''}>Meja ${m.meja_id} (${m.kapasitas} kursi)</option>`).join('')}</select></label><label class="fl">Jumlah orang (opsional)<input name="orang" type="number" min="1" inputmode="numeric" value="${esc(v.orang)}"></label>
 <label class="fl">Meja ditahan selama (15-${TAHAN_MAKS} menit)<input name="durasi" type="number" min="15" max="${TAHAN_MAKS}" step="1" inputmode="numeric" value="${v.durasi}" required></label>
 <label class="fl">Batal otomatis jika telat (menit)<input name="toleransi" type="number" min="0" step="1" inputmode="numeric" value="${v.tol}" required></label>
 <label class="fl">DP (opsional)<input name="dp" type="number" min="0" inputmode="numeric" placeholder="0" value="${esc(v.dp)}"></label><label class="fl">Catatan (opsional)<input name="catatan" value="${esc(v.catatan)}"></label>
 <button class="utama" ${meja.length?'':'disabled'}>${edit?'Simpan perubahan':'Simpan booking'}</button>${edit?'<button type="button" id="batalubah" style="flex:1 1 100%">Batal ubah</button>':''}</form>
 <h3>Booking ${tanggal(tgl)}</h3>
 <div class="baris"><input id="cari" type="search" placeholder="Cari nama, nomor HP, atau meja..." value="${esc(cari)}" aria-label="Cari booking"><select id="status"><option value="SEMUA">Semua status</option><option value="MENUNGGU">Menunggu</option><option value="DATANG">Datang</option><option value="BATAL">Batal</option><option value="SELESAI">Selesai</option></select></div>
 ${meja.map(m=>{const l=hasil.filter(b=>b.meja_id===m.meja_id);return `<div class="nota"><b>Meja ${m.meja_id}</b> <small>${m.kapasitas} kursi</small>${l.map(b=>`<div class="baris bk ${b.status}"><span><b>${esc(b.jam)}-${esc(b.selesai)}</b> ${esc(b.nama)}${b.hp?' · '+esc(b.hp):''}${b.jumlah_orang?' · '+b.jumlah_orang+' orang':''}${b.dp?' · DP '+rp(b.dp):''}${b.catatan?`<br><small>${esc(b.catatan)}</small>`:''}${b.hangus?'<br><small class="merah">Terlambat melewati toleransi</small>':''}</span><span class="aksi">${tombol(b)}</span></div>`).join('')||'<div class="baris"><small>Belum ada booking yang cocok</small></div>'}</div>`}).join('')}`;
 const $=s=>el.querySelector(s),pindah=t=>{if(t){tgl=t;view(el)}};
 $('#tgl').onchange=e=>pindah(e.target.value);$('#kmrn').onclick=()=>pindah(geser(tgl,-1));$('#bsk').onclick=()=>pindah(geser(tgl,1));$('#ini').onclick=()=>pindah(hariIni());
 $('#ctgl').onchange=e=>{cekTgl=e.target.value;view(el)};$('#cjam').onchange=e=>{cekJam=e.target.value;view(el)};$('#cdur').onchange=e=>{cekDur=Math.min(480,Math.max(15,Math.floor(+e.target.value)||15));view(el)};
 el.querySelectorAll('[data-pilih]').forEach(b=>b.onclick=()=>{const m=meja.find(x=>x.meja_id===+b.dataset.pilih);edit=null;tgl=cekTgl;const f={meja:m.meja_id,tgl:cekTgl,jam:cekJam};view(el);const form=$('#fb');form.elements.meja.value=f.meja;form.elements.tgl.value=f.tgl;form.elements.jam.value=f.jam;form.elements.nama.focus();form.scrollIntoView({behavior:'smooth',block:'start'})});
 $('#cari').oninput=e=>{cari=e.target.value;const pos=e.target.selectionStart;view(el);$('#cari').focus();$('#cari').setSelectionRange(pos,pos)};
 $('#status').value=filter;$('#status').onchange=e=>{filter=e.target.value;view(el)};
 el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>coba(async()=>{await tamuDatang(+b.dataset.d);view(el)}));
 el.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{if(confirm('Selesaikan booking ini dan kosongkan meja?'))coba(async()=>{await checkoutBooking(+b.dataset.x);view(el)})});
 el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{edit=q('SELECT * FROM booking WHERE booking_id=?',[+b.dataset.u])[0];tgl=edit.mulai.slice(0,10);view(el);scrollTo(0,0)});
 el.querySelectorAll('[data-wa]').forEach(b=>b.onclick=()=>{const r=data.find(x=>x.booking_id===+b.dataset.wa);if(!r?.hp)return;
  const n=nomorWA(r.hp),orang=r.jumlah_orang?` untuk ${r.jumlah_orang} orang`:'';
  const msg=`Halo kak ${r.nama}, kami dari ${usaha} mau konfirmasi booking Meja ${r.meja_id} tanggal ${tanggal(r.mulai.slice(0,10))} jam ${r.jam}${orang}. Apakah jadi datang? Terima kasih.`;
  const editMsg=prompt('Edit pesan WhatsApp sebelum membuka chat:',msg);if(editMsg!==null)window.open(`https://wa.me/${n}?text=${encodeURIComponent(editMsg)}`,'_blank','noopener');
 });
 if($('#batalubah'))$('#batalubah').onclick=()=>{edit=null;view(el)};
 el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const id=+b.dataset.b,r=data.find(x=>x.booking_id===id);
  if(r.dp>0){batal=id;view(el);scrollTo(0,0)}else if(confirm('Batalkan booking ini?'))coba(async()=>{await batalBooking(id);view(el)})});
 if(b0){$('#tutup').onclick=()=>{batal=null;view(el)};
  el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>coba(async()=>{await batalBooking(batal,b.dataset.n);batal=null;view(el)}))}
 $('#fb').onsubmit=e=>{e.preventDefault();const x=e.target.elements,m=meja.find(r=>r.meja_id===+x.meja.value);
  if(+x.orang.value>m.kapasitas&&!confirm(`Meja ${m.meja_id} hanya ${m.kapasitas} kursi, tamu ${x.orang.value} orang. Lanjutkan?`))return;
  if(new Date(`${x.tgl.value}T${x.jam.value}`)<new Date()&&!confirm('Waktu booking sudah lewat. Lanjutkan?'))return;
  const isi={nama:x.nama.value,hp:x.hp.value,tgl:x.tgl.value,jam:x.jam.value,meja:+x.meja.value,orang:x.orang.value,durasi:x.durasi.value,toleransi:x.toleransi.value,dp:x.dp.value,catatan:x.catatan.value};
  coba(async()=>{if(edit){await ubah(edit.booking_id,isi);edit=null}else await buat(isi);tgl=x.tgl.value;view(el)})}
}
