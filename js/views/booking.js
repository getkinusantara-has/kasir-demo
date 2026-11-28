import {q} from '../db.js';import {daftar,buat,ubah,tamuDatang,batalBooking,selesaiBooking,ketersediaan,nomorWA,pesanFollowUp,TAHAN_MIN,TAHAN_MAKS,TAHAN_DEF} from '../booking.js';import {rp,esc,coba} from '../app.js';
const hariIni=()=>new Date().toLocaleDateString('sv');
const jamNow=()=>new Date().toTimeString().slice(0,5);
const geser=(t,n)=>{const d=new Date(t+'T12:00:00');d.setDate(d.getDate()+n);return d.toLocaleDateString('sv')};
let tgl=hariIni(),edit=null,batal=null,fu=null,cari='',filter='SEMUA',cek={tgl:hariIni(),jam:'',durasi:TAHAN_DEF};
const NASIB={KEMBALI:'DP dikembalikan ke tamu',HANGUS:'DP hangus (ditahan)'};
const STATUS=[['SEMUA','Semua'],['MENUNGGU','Menunggu'],['DATANG','Datang'],['BATAL','Batal'],['SELESAI','Selesai']];
export default function view(el){
 const meja=q('SELECT * FROM meja WHERE aktif=1 ORDER BY meja_id'),data=daftar(tgl);
 if(edit&&!q("SELECT 1 FROM booking WHERE booking_id=? AND status='MENUNGGU'",[edit.booking_id]).length)edit=null;
 if(!cek.jam)cek.jam=jamNow();
 const v=edit?{nama:edit.nama,hp:edit.hp||'',tgl:edit.mulai.slice(0,10),jam:edit.mulai.slice(11,16),meja:edit.meja_id,orang:edit.jumlah_orang||'',durasi:edit.durasi_menit,tol:edit.toleransi_menit,dp:edit.dp||'',catatan:edit.catatan||''}:{nama:'',hp:'',tgl,jam:'',meja:meja[0]?.meja_id,orang:'',durasi:TAHAN_DEF,tol:15,dp:'',catatan:''};
 const b0=batal&&data.find(b=>b.booking_id===batal);if(!b0)batal=null;
 const f0=fu&&data.find(b=>b.booking_id===fu&&b.status==='MENUNGGU'&&nomorWA(b.hp));if(!f0)fu=null;
 const tombol=b=>{const id=b.booking_id;
  if(b.status==='BATAL')return `<small>Dibatalkan${b.dp?' · '+(NASIB[b.dp_nasib]||'DP belum dicatat'):''}</small>`;
  if(b.status==='SELESAI')return `<small>Selesai${b.transaksi_id?' · dibayar #'+b.transaksi_id:''}</small>`;
  if(b.status==='DATANG')return `<small>${b.transaksi_id?'Sudah dibayar #'+b.transaksi_id:'Sudah datang'}</small> <button class="utama" data-c="${id}">Checkout</button>${b.transaksi_id?'':` <button data-b="${id}">Batal</button>`}`;
  return `<button class="utama" data-d="${id}">Tamu datang</button> ${nomorWA(b.hp)?`<button data-w="${id}">Follow up</button>`:`<button disabled>Follow up</button><small>HP belum diisi</small>`} <button data-u="${id}">Ubah</button> <button data-b="${id}">Batal</button>`};
 const kartu=b=>`<div class="baris bk ${b.status}"><span><b>${b.jam}-${b.selesai}</b> ${esc(b.nama)}${b.hp?' · '+esc(b.hp):''}${b.jumlah_orang?' · '+b.jumlah_orang+' orang':''}${b.dp?' · DP '+rp(b.dp):''}${b.catatan?`<br><small>${esc(b.catatan)}</small>`:''}${b.hangus?'<br><small class="merah">Tidak datang, meja sudah dibebaskan</small>':''}</span><span class="aksi">${tombol(b)}</span></div>`;
 el.innerHTML=`<div class="baris"><b>Booking</b><span><button id="kmrn" aria-label="Hari sebelumnya">‹</button> <input type="date" id="tgl" value="${tgl}"> <button id="bsk" aria-label="Hari berikutnya">›</button> <button id="ini">Hari ini</button></span></div>
 ${b0?`<div class="nota" id="pbatal"><b>Batalkan booking ${esc(b0.nama)} (Meja ${b0.meja_id}, ${b0.jam})?</b><div class="merah">Tamu ini sudah membayar DP ${rp(b0.dp)}. Pilih nasib uang DP-nya:</div><button class="utama" data-n="KEMBALI">DP dikembalikan ke tamu</button><button data-n="HANGUS">DP hangus (ditahan)</button><button id="tutup">Jangan batalkan</button></div>`:''}
 ${f0?`<div class="nota" id="pfu"><b>Follow up WhatsApp: ${esc(f0.nama)}</b><small>Edit pesan kalau perlu. WhatsApp terbuka di tab baru, lalu kamu tekan kirim sendiri.</small><textarea id="fut" rows="5" style="font:inherit;padding:10px;border:1px solid #9bb0a3;border-radius:6px">${esc(pesanFollowUp(f0))}</textarea><a class="utama" id="fuk" target="_blank" rel="noopener" href="https://wa.me/${nomorWA(f0.hp)}?text=${encodeURIComponent(pesanFollowUp(f0))}">Buka WhatsApp</a><button id="futup">Tutup</button></div>`:''}
 <div class="nota" id="cek"><b>Cek ketersediaan meja</b><div class="rf"><label class="fl">Tanggal<input type="date" id="ctgl" value="${cek.tgl}"></label><label class="fl">Jam<input type="time" id="cjam" value="${cek.jam}"></label><label class="fl">Durasi (menit)<input type="number" id="cdur" min="${TAHAN_MIN}" max="${TAHAN_MAKS}" step="1" inputmode="numeric" value="${esc(cek.durasi)}"></label></div><div class="grid" id="cekhasil"></div><small>Ketuk meja yang tersedia untuk mengisi form booking di bawah.</small></div>
 <form id="fb" class="nota">${edit?`<div class="fl" style="flex:1 1 100%"><b>Ubah booking ${esc(edit.nama)}</b></div>`:''}<label class="fl">Nama pemesan<input name="nama" required value="${esc(v.nama)}"></label><label class="fl">No. HP (opsional)<input name="hp" type="tel" inputmode="tel" value="${esc(v.hp)}"></label>
 <label class="fl">Tanggal<input name="tgl" type="date" value="${v.tgl}" required></label><label class="fl">Jam<input name="jam" type="time" value="${v.jam}" required></label>
 <label class="fl">Meja<select name="meja">${meja.map(m=>`<option value="${m.meja_id}"${m.meja_id===v.meja?' selected':''}>Meja ${m.meja_id} (${m.kapasitas} kursi)</option>`).join('')}</select></label><label class="fl">Jumlah orang (opsional)<input name="orang" type="number" min="1" inputmode="numeric" value="${v.orang}"></label>
 <label class="fl">Meja ditahan selama (menit, ${TAHAN_MIN}-${TAHAN_MAKS})<input name="durasi" type="number" min="${TAHAN_MIN}" max="${TAHAN_MAKS}" step="1" inputmode="numeric" required value="${v.durasi}"></label>
 <label class="fl">Batal otomatis jika telat (menit)<input name="toleransi" type="number" min="0" step="1" inputmode="numeric" required value="${v.tol}"></label>
 <label class="fl">DP (opsional)<input name="dp" type="number" min="0" inputmode="numeric" placeholder="0" value="${v.dp}"></label><label class="fl">Catatan (opsional)<input name="catatan" value="${esc(v.catatan)}"></label>
 <button class="utama" ${meja.length?'':'disabled'}>${edit?'Simpan perubahan':'Simpan booking'}</button>${edit?'<button type="button" id="batalubah" style="flex:1 1 100%">Batal ubah</button>':''}</form>
 <h3>Booking ${new Date(tgl+'T12:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h3>
 <input id="cari" type="search" autocomplete="off" placeholder="Cari nama, no. HP, atau no. meja" value="${esc(cari)}" style="width:100%">
 <div class="filt">${STATUS.map(([k,t])=>`<button type="button" data-f="${k}" class="${k===filter?'on':''}">${t}</button>`).join('')}</div>
 <div id="dl"></div>`;
 const $=s=>el.querySelector(s),pindah=t=>{if(t){tgl=t;view(el)}};
 // --- Cek ketersediaan ---
 const isiCek=()=>{const r=ketersediaan(cek.tgl,cek.jam,cek.durasi),H=$('#cekhasil');
  H.innerHTML=r.length?r.map(m=>`<button type="button" class="mj ${m.st==='TERSEDIA'?'kosong':m.st==='DIBOOKING'?'jb':'terisi'}" data-p="${m.meja_id}" ${m.st==='TERSEDIA'?'':'disabled'}>Meja ${m.meja_id}<br><small>${m.kapasitas} kursi</small><br><b>${m.st}</b>${m.st==='DIBOOKING'?`<br><small>${m.jam}-${m.selesai} · ${esc(m.nama)}</small>`:''}</button>`).join(''):'<small>Isi tanggal dan jam dulu.</small>';
  H.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const x=$('#fb').elements;
   x.meja.value=b.dataset.p;x.tgl.value=cek.tgl;x.jam.value=cek.jam;
   x.durasi.value=Math.min(Math.max(Math.floor(+cek.durasi)||TAHAN_DEF,TAHAN_MIN),TAHAN_MAKS);
   $('#fb').scrollIntoView({behavior:'auto'});x.nama.focus({preventScroll:true})})};
 const ubahCek=()=>{cek={tgl:$('#ctgl').value,jam:$('#cjam').value,durasi:$('#cdur').value};isiCek()};
 ['#ctgl','#cjam','#cdur'].forEach(s=>{$(s).oninput=ubahCek;$(s).onchange=ubahCek});
 // --- Daftar + pencarian ---
 const cocok=b=>{const s=cari.trim().toLowerCase(),d=s.replace(/\D/g,''),mj=s.replace(/^meja\s*/,'');
  if(filter!=='SEMUA'&&b.status!==filter)return false;if(!s)return true;
  const hp=String(b.hp||'').replace(/\D/g,'');
  return b.nama.toLowerCase().includes(s)||String(b.meja_id)===mj||(d.length>=3&&hp&&(hp.includes(d)||nomorWA(hp).includes(d.replace(/^0/,''))))};
 const isiDaftar=()=>{const aktif=cari.trim()||filter!=='SEMUA',L=$('#dl');
  const h=meja.map(m=>{const l=data.filter(b=>b.meja_id===m.meja_id&&cocok(b));if(aktif&&!l.length)return '';
   return `<div class="nota"><b>Meja ${m.meja_id}</b> <small>${m.kapasitas} kursi</small>${l.map(kartu).join('')||'<div class="baris"><small>Belum ada booking</small></div>'}</div>`}).join('');
  L.innerHTML=h||'<p>Tidak ada booking yang cocok.</p>';
  L.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>coba(async()=>{await tamuDatang(+b.dataset.d);view(el)}));
  L.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const r=data.find(x=>x.booking_id===+b.dataset.c);
   if(confirm(`Checkout ${r.nama}? Booking ditandai selesai dan Meja ${r.meja_id} jadi kosong.`))coba(async()=>{await selesaiBooking(r.booking_id);view(el)})});
  L.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{fu=+b.dataset.w;view(el);scrollTo(0,0)});
  L.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{edit=q('SELECT * FROM booking WHERE booking_id=?',[+b.dataset.u])[0];tgl=edit.mulai.slice(0,10);view(el);scrollTo(0,0)});
  L.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{const id=+b.dataset.b,r=data.find(x=>x.booking_id===id);
   if(r.dp>0){batal=id;view(el);scrollTo(0,0)}else if(confirm('Batalkan booking ini?'))coba(async()=>{await batalBooking(id);view(el)})})};
 $('#cari').oninput=e=>{cari=e.target.value;isiDaftar()};
 el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filter=b.dataset.f;el.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('on',x===b));isiDaftar()});
 $('#tgl').onchange=e=>pindah(e.target.value);$('#kmrn').onclick=()=>pindah(geser(tgl,-1));$('#bsk').onclick=()=>pindah(geser(tgl,1));$('#ini').onclick=()=>pindah(hariIni());
 if($('#batalubah'))$('#batalubah').onclick=()=>{edit=null;view(el)};
 if(b0){$('#tutup').onclick=()=>{batal=null;view(el)};
  el.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>coba(async()=>{await batalBooking(batal,b.dataset.n);batal=null;view(el)}))}
 if(f0){const wa=t=>`https://wa.me/${nomorWA(f0.hp)}?text=${encodeURIComponent(t)}`;
  $('#fut').oninput=e=>{$('#fuk').href=wa(e.target.value)};
  $('#fuk').onclick=()=>setTimeout(()=>{fu=null;view(el)},400);
  $('#futup').onclick=()=>{fu=null;view(el)}}
 $('#fb').onsubmit=e=>{e.preventDefault();const x=e.target.elements,m=meja.find(r=>r.meja_id===+x.meja.value);
  if(+x.orang.value>m.kapasitas&&!confirm(`Meja ${m.meja_id} hanya ${m.kapasitas} kursi, tamu ${x.orang.value} orang. Lanjutkan?`))return;
  if(new Date(`${x.tgl.value}T${x.jam.value}`)<new Date()&&!confirm('Waktu booking sudah lewat. Lanjutkan?'))return;
  const isi={nama:x.nama.value,hp:x.hp.value,tgl:x.tgl.value,jam:x.jam.value,meja:+x.meja.value,orang:x.orang.value,durasi:x.durasi.value,toleransi:x.toleransi.value,dp:x.dp.value,catatan:x.catatan.value};
  coba(async()=>{if(edit){await ubah(edit.booking_id,isi);edit=null}else await buat(isi);tgl=x.tgl.value;view(el)})};
 isiCek();isiDaftar()}
