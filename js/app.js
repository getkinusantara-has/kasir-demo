import {init} from './db.js';
export const rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>`&#${c.charCodeAt(0)};`);
export const coba=async fn=>{try{await fn()}catch(e){alert(e.message)}};
const $=s=>document.querySelector(s);
const setMode=p=>{
 document.body.classList.toggle('awal',!p);
 document.body.classList.toggle('kasir',p==='kasir');
};
const hr=()=>{
 const e=$('#jam');if(!e)return;
 const d=new Date();
 e.textContent=d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
};
hr();setInterval(hr,1000);
let peran=null;

async function buka(){
 const n=['kasir','meja','booking','menu','laporan'].find(x=>'#'+x===location.hash)||'kasir';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+n));
 const m=await import(`./views/${n}.js`),el=document.createElement('div');
 $('main').replaceChildren(el);m.default(el);
}
function tutupMenu(){
 const panel=$('#menu-peran-panel'),toggle=$('#menu-toggle');
 panel.hidden=true;toggle.setAttribute('aria-expanded','false');
}
function toggleMenu(){
 const panel=$('#menu-peran-panel'),toggle=$('#menu-toggle');
 panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
}
function pilihPeran(){
 peran=null;setMode(null);tutupMenu();
 history.replaceState(null,'',location.pathname+location.search);
 $('main').innerHTML='<section class="landing"><h1>Selamat datang</h1><p>Pilih peran melalui menu untuk mulai menggunakan aplikasi.</p></section>';
}
function masuk(p){
 tutupMenu();
 if(p==='kasir'){
  peran=p;setMode(p);history.replaceState(null,'','#kasir');coba(buka);return;
 }
 peran=p;setMode(p);
 history.replaceState(null,'',location.pathname+location.search);
 $('main').innerHTML=`<section class="peran"><h1>${p==='owner'?'Owner':'Manajemen'}</h1><div class="nota"><b>Dalam pembuatan</b><small>Halaman ini belum tersedia.</small></div></section>`;
}
$('#menu-toggle').addEventListener('click',toggleMenu);
document.querySelectorAll('[data-peran]').forEach(b=>b.addEventListener('click',()=>masuk(b.dataset.peran)));
document.addEventListener('click',e=>{
 if(!e.target.closest('.menu-peran'))tutupMenu();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')tutupMenu()});
addEventListener('hashchange',()=>{if(peran==='kasir')coba(buka)});

navigator.locks.request('kasir',{ifAvailable:true},async l=>{
 const sp=$('#splash');
 if(!l){sp?.classList.add('off');$('main').textContent='Kasir sudah terbuka di tab lain. Tutup tab ini.';return}
 try{
  const jeda=new Promise(r=>setTimeout(r,600));
  await init();navigator.storage?.persist?.();
  await jeda;pilihPeran();sp?.classList.add('off');
 }catch(e){
  const s=$('.spin'),t=$('#splash-teks');if(s)s.hidden=true;
  const pesan='Gagal memuat data: '+e.message+'. Muat ulang halaman.';
  if(t)t.textContent=pesan;else $('main').textContent=pesan;
 }
 await new Promise(()=>{});
});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
