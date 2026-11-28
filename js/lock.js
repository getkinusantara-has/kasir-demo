// Layar kunci untuk peran Manajemen dan Owner. mintaAkses() mengembalikan {id,nama,jabatan} atau null bila dibatalkan.
import {statusPengguna,penggunaBoleh,masukDenganPin,buatOwnerPertama,pulihkanOwner,semuaPengguna,adaKodePemulihan,bacaPenggunaExcel,terapkanPengguna,sisaTahan} from './auth.js';
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);
const NAMA={owner:'Owner',manajemen:'Manajemen'};
let buka=false;
export function mintaAkses(peran){
 if(buka)return Promise.resolve(null);buka=true;
 return new Promise(selesai=>{
  const lapis=document.createElement('div');lapis.id='kunci-layar';lapis.setAttribute('role','dialog');lapis.setAttribute('aria-modal','true');
  const kotak=document.createElement('div');kotak.className='kp-kotak';lapis.append(kotak);document.body.append(lapis);
  const tutup=hasil=>{lapis.remove();buka=false;document.removeEventListener('keydown',esc_);selesai(hasil)};
  const esc_=e=>{if(e.key==='Escape')tutup(null)};document.addEventListener('keydown',esc_);
  const $=s=>kotak.querySelector(s);
  const pesan=(t,ok)=>{const e=$('#kp-err');if(e){e.textContent=t||'';e.className='kp-err'+(ok?' ok':'')}};
  const sibuk=(tombol,fn)=>async ev=>{ev?.preventDefault?.();if(tombol.disabled)return;tombol.disabled=true;
   try{await fn()}catch(e){pesan(e.message)}finally{tombol.disabled=false}};
  const tautanImpor=()=>`<button type="button" class="kp-link" id="kp-impor">Impor daftar pengguna (Excel)</button><input type="file" id="kp-berkas" accept=".xlsx" hidden>`;
  const pasangImpor=()=>{
   const b=$('#kp-impor'),f=$('#kp-berkas');if(!b)return;
   b.onclick=()=>f.click();
   f.onchange=async()=>{const berkas=f.files[0];f.value='';if(!berkas)return;
    try{const hasil=await bacaPenggunaExcel(berkas);
     const ada=statusPengguna().total;
     if(ada&&!confirm(`Daftar pengguna di perangkat ini (${ada} akun) akan DIGANTI dengan isi file (${hasil.length} akun). Lanjutkan?`))return;
     await terapkanPengguna(hasil);layarMasuk();setTimeout(()=>pesan(`Daftar pengguna diperbarui (${hasil.length} akun).`,true),0)}
    catch(e){pesan(e.message)}}};
  const kodeTampil=(kode,judul,lanjut)=>{
   kotak.innerHTML=`<h2>${esc(judul)}</h2><p>Catat kode pemulihan ini dan simpan di tempat aman. Kode hanya ditampilkan sekali dan dipakai bila PIN Owner terlupa.</p><div class="kp-kode" id="kp-kode">${esc(kode)}</div><button type="button" class="utama" id="kp-lanjut">Saya sudah mencatat kode</button>`;
   $('#kp-lanjut').onclick=lanjut};
  const layarSetup=()=>{
   kotak.innerHTML=`<h2>Buat akun Owner pertama</h2><p>Perangkat ini belum punya pengguna. Gunakan hanya di perangkat Owner. Perangkat lain menerima daftar pengguna lewat file Excel dari Owner.</p>
   <form id="kp-f"><label>Nama<input id="kp-nama" maxlength="60" required autocomplete="off"></label><label>PIN (6 digit)<input id="kp-pin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="new-password"></label><label>Ulangi PIN<input id="kp-pin2" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="new-password"></label>
   <div class="kp-err" id="kp-err" role="alert"></div><button class="utama" id="kp-ok">Buat akun</button><button type="button" id="kp-batal">Batal</button></form><div class="kp-tautan">${tautanImpor()}</div>`;
   $('#kp-batal').onclick=()=>tutup(null);pasangImpor();
   $('#kp-f').onsubmit=sibuk($('#kp-ok'),async()=>{
    const r=await buatOwnerPertama($('#kp-nama').value,$('#kp-pin').value,$('#kp-pin2').value);
    kodeTampil(r.kode,'Simpan kode pemulihan',()=>tutup(r.user))});
   $('#kp-nama').focus()};
  const layarKosong=()=>{
   kotak.innerHTML=`<h2>Belum ada akun ${NAMA[peran]}</h2><p>Perangkat ini belum punya akun ${peran==='owner'?'Owner':'Manajemen atau Owner'} yang aktif. Impor daftar pengguna dari perangkat Owner.</p><div class="kp-err" id="kp-err" role="alert"></div><div class="kp-tautan">${tautanImpor()}</div><button type="button" id="kp-batal">Batal</button>`;
   $('#kp-batal').onclick=()=>tutup(null);pasangImpor()};
  const layarPulih=()=>{
   const owner=semuaPengguna().filter(u=>u.jabatan==='Owner'&&u.aktif);
   kotak.innerHTML=`<h2>Lupa PIN Owner</h2><p>Masukkan kode pemulihan yang dicatat saat akun Owner dibuat, lalu pilih PIN baru.</p>
   <form id="kp-f"><label>Kode pemulihan<input id="kp-kode-in" autocomplete="off" required placeholder="XXXX-XXXX-XXXX-XXXX"></label><label>Akun Owner<select id="kp-user">${owner.map(u=>`<option value="${u.pengguna_id}">${esc(u.nama)}</option>`).join('')}</select></label>
   <label>PIN baru (6 digit)<input id="kp-pin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="new-password"></label><label>Ulangi PIN baru<input id="kp-pin2" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="new-password"></label>
   <div class="kp-err" id="kp-err" role="alert"></div><button class="utama" id="kp-ok">Atur ulang PIN</button><button type="button" id="kp-kembali">Kembali</button></form>`;
   $('#kp-kembali').onclick=layarMasuk;
   $('#kp-f').onsubmit=sibuk($('#kp-ok'),async()=>{
    const r=await pulihkanOwner($('#kp-kode-in').value,+$('#kp-user').value,$('#kp-pin').value,$('#kp-pin2').value);
    kodeTampil(r.kode,'PIN diganti. Catat kode pemulihan baru',layarMasuk)})};
  function layarMasuk(){
   const st=statusPengguna(),boleh=penggunaBoleh(peran);
   if(!boleh.length){if(peran==='owner'&&st.total===0)return layarSetup();return layarKosong()}
   kotak.innerHTML=`<h2>Masuk sebagai ${NAMA[peran]}</h2>${peran==='manajemen'?'<p class="kp-kecil">Akun Owner juga bisa membuka halaman Manajemen.</p>':''}
   <form id="kp-f"><label>Pengguna<select id="kp-user">${boleh.map(u=>`<option value="${u.pengguna_id}">${esc(u.nama)} (${esc(u.jabatan)})</option>`).join('')}</select></label>
   <label>PIN<input id="kp-pin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required autocomplete="off" placeholder="6 digit"></label>
   <div class="kp-err" id="kp-err" role="alert"></div><button class="utama" id="kp-ok">Masuk</button><button type="button" id="kp-batal">Batal</button></form>
   <div class="kp-tautan">${tautanImpor()}<button type="button" class="kp-link" id="kp-lupa">Lupa PIN Owner</button></div>`;
   $('#kp-batal').onclick=()=>tutup(null);pasangImpor();
   $('#kp-lupa').onclick=()=>{if(!adaKodePemulihan()){pesan('Kode pemulihan belum diatur di perangkat ini. Gunakan perangkat Owner yang membuat akun.');return}layarPulih()};
   $('#kp-f').onsubmit=sibuk($('#kp-ok'),async()=>{
    const u=await masukDenganPin(+$('#kp-user').value,$('#kp-pin').value,peran);tutup(u)});
   $('#kp-pin').focus();
   const s=sisaTahan();if(s>0)pesan(`Terlalu banyak percobaan salah. Coba lagi dalam ${s} detik.`)}
  layarMasuk()})}
