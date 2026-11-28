# Kasir Kafe V26 — Offline Manual Exchange

V26 dibangun dari proyek V25. Aplikasi tetap memakai database lokal SQLite (sql.js) di IndexedDB pada setiap perangkat; tidak ada backend, server cloud, atau sinkronisasi otomatis.

## Fitur V26 yang ditambahkan

- Halaman **Owner → Pusat Data**.
- Ekspor transaksi harian Kasir dalam JSON untuk dikirim ke perangkat Owner.
- Impor transaksi ke Owner dengan ID perangkat + ID transaksi sumber agar impor berulang tidak menggandakan transaksi.
- Detail transaksi dipetakan ke menu berdasarkan nama menu; jika master menu belum cocok, impor dibatalkan.
- Ekspor master Owner (menu dan meja) dalam JSON dan CSV.
- Impor master Owner di halaman Menu (Kasir) dan halaman Management. Harga/kategori/status menu mengikuti Owner; stok lokal tidak ditimpa.
- Ekspor tabel CSV agar dapat dibuka dan diedit dengan Microsoft Excel atau aplikasi spreadsheet lain.
- Riwayat impor lokal pada perangkat Owner.
- Service worker cache version dinaikkan ke kasir-v26-t1.

## Alur kerja manual

1. Owner mengatur master menu dan meja, lalu mengekspor `master-owner.json` atau CSV menu.
2. Management dan Kasir mengimpor file master dari Owner.
3. Kasir melakukan transaksi seperti biasa.
4. Saat tutup kasir, buka **Laporan → Ekspor data V26** lalu ekspor JSON transaksi harian.
5. Kirim file JSON ke Owner (USB, WhatsApp, Drive, atau media lain).
6. Owner buka **Owner → Pusat Data**, pilih file, periksa pratinjau, lalu impor.
7. Jika file yang sama diimpor ulang dari perangkat yang sama, transaksi yang sudah masuk dilewati.

## Batasan yang perlu diketahui

- Setiap perangkat memiliki database sendiri. Tidak ada sinkronisasi otomatis dan Owner hanya melihat data yang sudah diimpor.
- Pertukaran transaksi harian menggunakan JSON. CSV disediakan untuk ekspor tabel/master dan pengolahan spreadsheet; CSV transaksi terpisah belum menjadi format impor gabungan.
- Impor master saat ini mencakup menu dan meja. Modul master bahan baku, barang, resep, karyawan, payroll, dan forecasting belum dibangun pada tahap fondasi ini.
- File master yang diimpor pada perangkat lain harus berasal dari Owner. Jangan mengedit ID menu secara manual.
- Jika nama menu pada transaksi tidak cocok dengan master Owner, impor transaksi ditolak agar detail penjualan tidak hilang.
- Library sql.js masih dimuat dari CDN pada instalasi pertama dan dicache oleh service worker saat tersedia internet. Karena dependensi belum dibundel lokal, pemasangan pertama tetap membutuhkan koneksi internet.
- Fitur Excel `.xlsx` lama masih memakai pustaka SheetJS dari CDN. CSV bisa dibuka melalui Excel secara offline, tetapi impor/ekspor `.xlsx` belum dijamin offline.
- Aplikasi belum memakai autentikasi akun. Pemilihan peran adalah pemisah tampilan, bukan keamanan akses.

## Menjalankan lokal

Jalankan server statis, misalnya `python -m http.server`, lalu buka `http://localhost:8000`.

## Catatan migrasi

Jangan menghapus data browser sebelum membuat backup `.sqlite` dari halaman Laporan. Database V25 tetap dipakai dan tabel `v26_import_log` dibuat secara aditif saat Pusat Data digunakan.

## Tahap 0 — PIN per orang dan kerangka Excel

- Manajemen dan Owner wajib PIN 6 digit per orang; Kasir sementara tetap terbuka. Akun Owner bisa membuka halaman Manajemen.
- Owner membuat akun di **Owner → Pengguna**, lalu mengekspornya ke Excel. Perangkat Manajemen/Kasir mengimpor lewat tombol "Impor daftar pengguna" di layar kunci (impor menggantikan seluruh daftar di perangkat itu).
- Perangkat Owner yang masih kosong meminta pembuatan akun Owner pertama dan menampilkan **kode pemulihan** satu kali. Catat kode itu: dipakai lewat "Lupa PIN Owner".
- Salah PIN 5 kali: ditahan 30 detik. Layar terkunci kembali saat pindah peran, tombol KUNCI, atau 10 menit tanpa aktivitas.
- PIN disimpan sebagai hash PBKDF2 + garam. File Excel pengguna berisi hash tersebut: perlakukan sebagai rahasia.
- `js/xlsx-kit.js` adalah kerangka impor/ekspor Excel bersama (sheet `_info` sebagai penanda format, jenis, versi). Dipakai modul-modul berikutnya.
- PIN void di Kasir (tabel `pengaturan`) masih terpisah dan akan disatukan pada tahap berikutnya.

### Pembaruan t1 — semua pertukaran data memakai Excel (.xlsx)
- Ekspor/impor master Owner (menu, meja) dan transaksi harian Kasir sekarang Excel; JSON/CSV tidak lagi dipakai untuk ekspor.
- Satu file per jenis: `master-owner-TANGGAL.xlsx` (sheet menu, meja), `transaksi-kasir-TANGGAL.xlsx` (sheet transaksi, detail_transaksi), `pengguna-TANGGAL.xlsx`. Jangan ubah nama sheet, judul kolom, atau kolom ID.
- Gambar menu tidak ikut diekspor (batas ukuran sel Excel); gambar tetap tersimpan di tiap perangkat.
- File yang salah jenis ditolak dengan pesan yang jelas.
