import {q} from '../db.js';import {daftar,buat,ubah,tamuDatang,batalBooking,TAHAN_MAKS} from '../booking.js';import {rp,esc,coba} from '../app.js';
const hariIni=()=>new Date().toLocaleDateString('sv');
const geser=(t,n)=>{const d=new Date(t+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('sv')};
let tgl=hariIni(),edit=null,batal=null;
const NASIB={KEMBALI:'DP dikembalikan ke tamu',HANGUS:'DP hangus (ditahan)'};
export default function view(el){
 const meja=q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id'),data=daftar(tgl);
 if(edit&&!data.some(b=>b.booking_id===edit.booking_id&&b.status==='MENUNGGU')&&!q("SELECT 1 FROM booking WHERE booking_id=? AND status='MENUNGGU'",[edit.booking_id]).length)edit=null;
 const v=edit?{nama:edit.nama,hp:edit.hp||'',tgl:edit.mulai.slice(0,10),jam:edit.mulai.slice(11,16),meja:edit.meja_id,orang:edit.jumlah_orang||'',durasi:edit.durasi_menit,tol:edit.toleransi_menit,dp:edit.dp||'',catatan:edit.catatan||''}:{nama:'',hp:'',tgl,jam:'',meja:meja[0]?.meja_id,orang:'',durasi:TAHAN_MAKS,tol:15,dp:'',catatan:''};
 const b0=batal&&data.find(b=>b.booking_id===batal);if(!b0)batal=null;
 const tombol=b=>b.status==='BATAL'?`<small>Dibatalkan${b.dp?' · '+(NASIB[b.dp_nasib]||'DP belum dicatat'):''}</small>`:b.status==='DATANG'?`<small>${b.transaksi_id?'Sudah dibayar #'+b.transaksi_id:'Sudah datang'}</small>${b.transaksi_id?'':` <button data-b="${b.booking_id}">Batal</button>`}`:`<button class="utama" data-d="${b.booking_id}">Tamu datang</button> <button data-u="${b.booking_id}">Ubah</button> <button data-b="${b.booking_id}">Batal</button>`;
 el.innerHTML=`<div class="baris"><b>Booking</b><span><button id="kmrn" aria-label="Hari sebelumnya">‹</button> <input type="date" id="tgl" value="${tgl}"> <button id="bsk" aria-label="Hari berikutnya">›</button> <button id="ini">Hari ini</button></span></div>
 ${b0?`<div class="nota" id="pbatal"><b>Batalkan booking ${esc(b0.nama)} (Meja ${b0.meja_id}, ${b0.jam})?</b><div class="merah">Tamu ini sudah membayar DP ${rp(b0.dp)}. Pilih nasib uang DP-nya:</div><button class="utama" data-n="KEMBALI">DP dikembalikan ke tamu</button><button data-n="HANGUS">DP hangus (ditahan)</button><button id="tutup">Jangan batalkan</button></div>`:''}
 <form id="fb" class="nota">${edit?`<div class="fl" style="flex:1 1 100%"><b>Ubah booking ${esc(edit.nama)}</b></div>`:''}<label class="fl">Nama pemesan<input name="nama" required value="${esc(v.nama)}"></label><label class="fl">No. HP (opsional)<input name="hp" type="tel" inputmode="tel" value="${esc(v.hp)}"></label>
 <label class="fl">Tanggal<input name="tgl" type="date" value="${v.tgl}" required></label><label class="fl">Jam<input name="jam" type="time" value="${v.jam}" required></label>
 <label class="fl">Meja<select name="meja">${meja.map(m=>`<option value="${m.meja_id}"${m.meja_id===v.meja?' selected':''}>Meja ${m.meja_id} (${m.kapasitas} kursi)</option>`).join('')}</select></label><label class="fl">Jumlah orang (opsional)<input name="orang" type="number" min="1" inputmode="numeric" value="${v.orang}"></label>
 <label class="fl">Meja ditahan selama<select name="durasi">${[30,60,90,TAHAN_MAKS].map(n=>`<option value="${n}"${n===v.durasi?' selected':''}>${n<60?n+' menit':(n/60)+' jam'}</option>`).join('')}</select></label>
 <label class="fl">Batal otomatis jika telat<select name="toleransi"><option value="15"${v.tol===15?' selected':''}>15 menit</option><option value="30"${v.tol===30?' selected':''}>30 menit</option></select></label>
 <label class="fl">DP (opsional)<input name="dp" type="number" min="0" inputmode="numeric" placeholder="0" value="${v.dp}"></label><label class="fl">Catatan (opsional)<input name="catatan" value="${esc(v.catatan)}"></label>
 <button class="utama" ${meja.length?'':'disabled'}>${edit?'Simpan perubahan':'Simpan booking'}</button>${edit?'<button type="button" id="batalubah" style="flex:1 1 100%">Batal ubah</button>':''}</form>
 <h3>Booking ${new Date(tgl+'T12:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3>
 ${meja.map(m=>{const l=data.filter(b=>b.meja_id===m.meja_id);return `<div class="nota"><b>Meja ${m.meja_id}</b> <small>${m.kapasitas} kursi</small>${l.map(b=>`<div class="baris bk ${b.status}"><span><b>${b.jam}-${b.selesai}</b> ${esc(b.nama)}${b.hp?' · '+esc(b.hp):''}${b.jumlah_orang?' · '+b.jumlah_orang+' orang':''}${b.dp?' · DP '+rp(b.dp):''}${b.catatan?`<br><small>${esc(b.catatan)}</small>`:''}${b.hangus?'<br><small class="merah">Tidak datang, meja sudah dibebaskan</small>':''}</span><span class="aksi">${tombol(b)}</span></div>`).join('')||'<div class="baris"><small>Belum ada booking</small></div>'}</div>`}).join('')}`;
 const $=s=>el.querySelector(s),pindah=t=>{if(t){tgl=t;view(el)}};
 $('#tgl').onchange=e=>pindah(e.target.value);$('#kmrn').onclick=()=>pindah(geser(tgl,-1));$('#bsk').onclick=()=>pindah(geser(tgl,1));$('#ini').onclick=()=>pindah(hariIni());
 el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>coba(async()=>{await tamuDatang(+b.dataset.d);view(el)}));
 el.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{edit=q('SELECT * FROM booking WHERE booking_id=?',[+b.dataset.u])[0];tgl=edit.mulai.slice(0,10);view(el);scrollTo(0,0)});
 if($('#batalubah'))$('#batalubah').onclick=()=>{edit=null;view(el)};
 el.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const id=+b.dataset.b,r=data.find(x=>x.booking_id===id);
  if(r.dp>0){batal=id;view(el);scrollTo(0,0)}else if(confirm('Batalkan booking ini?'))coba(async()=>{await batalBooking(id);view(el)})});
 if(b0){$('#tutup').onclick=()=>{batal=null;view(el)};
  el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>coba(async()=>{await batalBooking(batal,b.dataset.n);batal=null;view(el)}))}
 $('#fb').onsubmit=e=>{e.preventDefault();const x=e.target.elements,m=meja.find(r=>r.meja_id===+x.meja.value);
  if(+x.orang.value>m.kapasitas&&!confirm(`Meja ${m.meja_id} hanya ${m.kapasitas} kursi, tamu ${x.orang.value} orang. Lanjutkan?`))return;
  if(new Date(`${x.tgl.value}T${x.jam.value}`)<new Date()&&!confirm('Waktu booking sudah lewat. Lanjutkan?'))return;
  const isi={nama:x.nama.value,hp:x.hp.value,tgl:x.tgl.value,jam:x.jam.value,meja:+x.meja.value,orang:x.orang.value,durasi:x.durasi.value,toleransi:x.toleransi.value,dp:x.dp.value,catatan:x.catatan.value};
  coba(async()=>{if(edit){await ubah(edit.booking_id,isi);edit=null}else await buat(isi);tgl=x.tgl.value;view(el)})}}
