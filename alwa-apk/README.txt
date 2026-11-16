ALWA AI — ASISTEN BELAJAR (WEB + APK ANDROID)
=============================================

ISI PROYEK
- www/            Aplikasi (index.html, app.js, style.css) — ini yang dibungkus jadi APK
- server.js       Backend AI (API key disimpan di sini, TIDAK di APK)
- capacitor.config.json, assets/   Konfigurasi APK dan ikon
- .github/workflows/build-apk.yml  Build APK otomatis di GitHub (tanpa install apa pun)

CARA A — PALING MUDAH: BUILD APK GRATIS DI GITHUB (tanpa Android Studio)
1. Buat repositori baru di github.com, unggah SEMUA isi folder ini (termasuk folder .github).
2. Buka tab Actions > "Build APK" > Run workflow (atau otomatis saat push).
3. Tunggu ±5–8 menit. Unduh "ALWA-AI-apk" di bagian Artifacts, ekstrak, dapat app-debug.apk.
4. Kirim ke HP, aktifkan "Instal dari sumber tidak dikenal", lalu instal.

CARA B — BUILD DI LAPTOP
Butuh Node.js 18+, JDK 17, dan Android SDK (via Android Studio).
  ./build-apk.sh          (Mac/Linux)
  atau jalankan manual: npm install, npx cap add android, npx capacitor-assets generate --android,
  npx cap sync android, lalu di folder android: gradlew assembleDebug
Hasil: android/app/build/outputs/apk/debug/app-debug.apk

MENGAKTIFKAN AI SUNGGUHAN DI APK
APK tidak boleh berisi API key. Jalankan server.js di komputer/hosting, lalu isi alamatnya di aplikasi.
1. npm install, salin .env.example menjadi .env, isi OPENAI_API_KEY.
2. npm start (berjalan di port 3000).
3. Di aplikasi: tombol ⚙ (pojok kanan atas) > isi alamat server > Tes koneksi > Simpan.
   - Satu Wi-Fi: http://IP-LAPTOP:3000 (cek IP dengan ipconfig / ifconfig)
   - Agar bisa dipakai di mana saja: pasang server.js di hosting (Render, Railway, VPS) dan pakai alamat https-nya.
Tanpa server, aplikasi tetap jalan dalam Mode Demo (indikator kuning di atas).

YANG DIPERBAIKI
- Jawaban demo sebelumnya menampilkan teks "\n" mentah; kini baris baru benar.
- server.js: regex yang menyebabkan error sintaks diperbaiki; file rahasia (.env, server.js) tidak lagi bisa diunduh publik.
- Keamanan server: pembatasan ukuran permintaan, rate limit, validasi pesan, timeout.
- AI kini mengingat konteks percakapan (12 pesan terakhir); riwayat dan tema tersimpan.
- Pengaturan alamat server + indikator status AI aktif / Mode demo.
- Format **tebal** dan `kode` pada jawaban; tombol Enter aman untuk keyboard IME HP.
- Tampilan aman untuk layar berponi (safe area); ikon dan splash screen aplikasi.

CATATAN
- APK debug cukup untuk dipakai pribadi. Untuk Google Play perlu build release bertanda tangan (keystore) sendiri.
- Font Google dimuat dari internet; saat offline tampilan memakai font sistem.
- ALWA untuk pendamping belajar, bukan untuk mengisi ujian aktif.
