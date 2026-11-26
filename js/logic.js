import {q,run,tx} from './db.js';import {datangBooking} from './booking.js';
export const checkout=(keranjang,meja,metode,uang)=>tx(()=>{
 if(!keranjang.size)throw Error('Pesanan masih kosong');
 if(meja&&!q("SELECT 1 FROM meja WHERE meja_id=? AND status_okupansi='KOSONG'",[meja]).length)throw Error('Meja sudah terisi');
 const item=[...keranjang].map(([id,qty])=>{const m=q('SELECT * FROM menu WHERE menu_id=? AND status_aktif=1',[id])[0];
  if(!m||m.stok<qty)throw Error('Stok tidak cukup atau menu nonaktif');return{...m,qty}});
 const total=item.reduce((a,i)=>a+i.harga*i.qty,0);
 const bk=meja?datangBooking(meja):null,dp=bk?Math.min(bk.dp,total):0,due=total-dp;
 if(metode!=='Tunai'||due===0)uang=due;
 if(uang<due)throw Error('Uang diterima kurang');
 run('INSERT INTO transaksi(meja_id,total_harga,metode_pembayaran,uang_diterima,kembalian,dp_dipakai)VALUES(?,?,?,?,?,?)',[meja,total,metode,uang,uang-due,dp]);
 const id=q('SELECT last_insert_rowid() id')[0].id;
 if(bk)run('UPDATE booking SET transaksi_id=? WHERE booking_id=?',[id,bk.booking_id]);
 for(const i of item){run('INSERT INTO detail_transaksi(transaksi_id,menu_id,nama_menu,harga_satuan,qty)VALUES(?,?,?,?,?)',[id,i.menu_id,i.nama_menu,i.harga,i.qty]);
  run('UPDATE menu SET stok=stok-? WHERE menu_id=?',[i.qty,i.menu_id])}
 if(meja)run("UPDATE meja SET status_okupansi='TERISI' WHERE meja_id=?",[meja]);return id});
export const batalkan=(id,pin,alasan)=>tx(()=>{
 const p=q("SELECT nilai FROM pengaturan WHERE kunci='pin'")[0];
 if(!p)run("INSERT INTO pengaturan VALUES('pin',?)",[pin]);else if(p.nilai!==pin)throw Error('PIN salah');
 if(!q("SELECT 1 FROM transaksi WHERE transaksi_id=? AND status='LUNAS'",[id]).length)throw Error('Transaksi sudah di-void');
 run("UPDATE transaksi SET status='VOID',alasan_void=?,waktu_void=datetime('now','localtime') WHERE transaksi_id=?",[alasan,id]);
 run('UPDATE booking SET transaksi_id=NULL WHERE transaksi_id=?',[id]);
 for(const d of q('SELECT * FROM detail_transaksi WHERE transaksi_id=?',[id]))run('UPDATE menu SET stok=stok+? WHERE menu_id=?',[d.qty,d.menu_id])});
