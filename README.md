# Kasir Kafe
PWA kasir satu perangkat. Data SQLite (sql.js) disimpan di IndexedDB perangkat. Tanpa server aplikasi.

## Hosting di GitHub Pages
1. Buat repository kosong di GitHub.
2. Di folder ini: `git remote add origin URL_REPO` lalu `git push -u origin main`.
3. Settings > Pages > Deploy from a branch > main, / (root).
4. Buka link-nya di Chrome/Edge, pilih "Instal aplikasi" / "Tambahkan ke layar utama".

Uji lokal: `python -m http.server`, buka http://localhost:8000

## Catatan
- Buka pertama kali butuh internet; setelah itu offline.
- Menghapus data browser menghapus data kasir. Unduh backup setiap tutup kasir.
- Bluetooth hanya untuk printer BLE. Printer lain: pakai dialog cetak (driver sistem).
- Setelah mengubah kode, naikkan versi `V` di sw.js, lalu tutup dan buka ulang aplikasi.
- Excel (tab Menu) memuat pustaka SheetJS dari CDN saat tombolnya dipakai pertama kali, jadi butuh internet.
- Meja yang dihapus hanya disembunyikan agar riwayat transaksi tetap utuh.
- PIN void hanya pengaman input, bukan keamanan penuh.
