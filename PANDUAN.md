# PANDUAN Vidlust v0.7

Generator video ilustrasi & motion graphic siap submit ke Adobe Stock.
18 template prosedural + Motion Studio + Batch + AI video + aplikasi desktop (ffmpeg lokal).

---

## 1. Cara Menjalankan

| Cara | Langkah | Kegunaan |
|---|---|---|
| **Desktop (disarankan)** | Dobel-klik `release\Vidlust-0.7.0-win.exe` | Produksi: convert MP4/ProRes/GIF + simpan batch ke folder |
| **Localhost** | `cd F:\GILANG\vidlust` → `npm run dev` → buka `http://127.0.0.1:5173/` | Development |
| **Build web** | `npm run build` → hosting folder `dist/` | Publish ke internet |

> Selalu pakai **Chrome/Edge**. Firefox tidak bisa MP4 H.264 & render offline.
> Port bentrok? `npm run dev -- --port 5174`.

---

## 2. Alur Kerja Standar (5 menit per aset)

1. Pilih template → atur resolusi/durasi → tekan Play.
2. **⬇ Export** → Download video.
3. Tab **📝 Meta** → Download CSV.
4. Upload video ke Adobe Stock Contributor → tempel judul/deskripsi/keywords → Submit.

---

## 3. Mode 🎛 Generator

### 3.1 Header

- Tombol pindah mode: **🎛 Generator** / **🎬 Motion Studio**.
- Badge `Siap submit` (hijau) / `Cek setting` (merah) / tambahan `ALPHA` saat transparan.
- Ringkasan: resolusi · fps · durasi · estimasi MB · format output.

### 3.2 Kolom Template (18)

Klik untuk ganti. Template bertanda `◻ alpha-first` (Pop Elements, Light Dust)
otomatis mengalihkan background ke transparan.

| Kelompok | Template |
|---|---|
| Background & loop | Geometric Loop, Particle Flow, Gradient Waves, Aurora Borealis, Mesh Gradient, Neon Grid Retro |
| Data & bisnis | Infographic Bars, Donut Stats Board, Tech HUD Interface |
| Karakter & edukasi | Blob Character, Doodle Lines |
| Broadcast | Logo Reveal, Lower Third Broadcast, Kinetic Typography |
| Overlay | Confetti Celebration, Pop Elements Pack, Light Dust Overlay |
| Generatif | Flow Field |

**💾 Project:** simpan / buka / hapus setting. Setting terakhir otomatis tersimpan
di browser.

### 3.3 Preview, Export & Kepatuhan

- Canvas preview = persis yang direkam. Tombol: Play/Pause, Ulangi, 🎲 Acak varian.
- **Mode solid:** `⬇ Export MP4 · frame-exact` (render offline frame-by-frame:
  tercepat & timing presisi) + cadangan `⏺ Realtime`.
- **Mode transparan:** `⬇ Export WebM Alpha` (H.264 tidak mendukung alpha).
- Hasil export: nama file, ukuran MB, tombol Download/Unduh ulang, thumbnail
  otomatis (PNG bila alpha, JPG bila solid).
- ⚠️ **Catatan alpha (penting):** encoder VP9 browser sering menyimpan WebM
  sebagai `yuv420p` opak (alpha hilang). Cara yang dijamin: di app desktop klik
  **🎞 PNG seq → ProRes 4444** — me-render ulang frame-by-frame ke PNG lalu
  merakit MOV alpha asli via ffmpeg lokal. Selalu verifikasi sebelum submit.
- **Kepatuhan Adobe Stock (otomatis):** resolusi, durasi 5–60 detik, fps standar,
  codec & format, background, lisensi komersial. Merah = harus dibetulkan dulu.

### 3.4 Tab ⚙ Setting

- **Resolusi:** tombol cepat FHD 1920×1080 · Vertical 1080×1920 · Square 1080×1080 ·
  4K 3840×2160, dropdown preset Adobe lengkap, kolom custom W×H (320–4096,
  H.264 butuh angka genap — otomatis dijepit).
- **Frame rate:** tombol cepat 24/25/30/50/60 + opsi broadcast 23.98/29.97/59.94.
- **Durasi:** tombol 5/10/12/15/30/60 + slider + angka (dikunci 5–60).
- **Background:** Solid vs Transparan/Alpha. Alpha → export otomatis WebM agar
  transparansi terjaga; color picker nonaktif otomatis.
- **Warna:** 12 palet kurasi 1-klik + 4 warna manual + slider kecepatan & kepadatan.
- **Teks overlay:** opsional. Kosongkan agar timeless. Khusus Lower Third,
  pisahkan baris dengan `|` contoh: `NAMA SAYA|CEO Perusahaan`.

### 3.5 Tab 📦 Batch

- Render 1–12 varian sekaligus (variasi template / palet / seed).
- Job solid → offline MP4 (lebih cepat dari durasi). Job transparan → WebM realtime.
- Progress per job, bisa dibatalkan. Download satuan / semua + **CSV gabungan**.
- Mode desktop: simpan semua langsung ke folder.

### 3.6 Tab ✨ Ide AI & 🎁 AI Video Gratis

- **Ide AI:** tulis ide bahasa Indonesia → jadi 3 prompt siap tempel
  ke generator gratis di tab 🎁 AI Video Gratis + judul + keywords. Semua bisa disalin.
- **AI Video Gratis:** ambil kunci gratis di enter.pollinations.ai (tanpa kartu kredit,
  dapat Pollen gratis) → tempel kunci → pilih model (WAN / Seedance / Veo) → Generate →
  preview → download. Antrean bisa 1–10 menit. Tidak ada biaya apa pun di aplikasi ini.
- Video AI wajib centang **"Created using generative AI"** saat submit.
  Wajah/tempat nyata butuh release.

### 3.7 Tab 📝 Meta

Judul (maks 200 karakter), deskripsi, ±30–49 keywords, kategori — otomatis dari
template + setting + mode alpha. Tombol **⬇ CSV Adobe** dan **📋 Salin semua**.

---

## 4. Mode 🎬 Motion Studio (animasi rakitan sendiri)

### 4.1 Mulai

Pilih 1 dari 3 scene starter (Judul Kinetik, Lower Third Pro, Logo Bumper)
atau mulai kosong lalu tambah layer sendiri.

### 4.2 Layer (6 jenis)

Teks multi-baris · Kotak · Elips · Bintang · Gambar upload (otomatis dikecilkan
agar simpanan aman, PNG transparan didukung) · Particle emitter.
Operasi: tambah, tampil/sembunyi, susun atas-bawah (atas = paling depan),
duplikat, hapus.

### 4.3 Keyframe & easing

- Slider transform (posisi X/Y, skala, rotasi, opacity, warna) **mengedit langsung
  keyframe aktif (◆)** secara live.
- `＋ Key` merekam transformasi saat ini di posisi playhead.
- Klik marker ◆ di timeline untuk melompat ke keyframe tersebut.
- **Easing per segmen:** Linear, Ease In/Out, Pop (Back), Bounce.
- **Preset animasi** (diterapkan di playhead, durasi bisa diatur):
  Fade In, Geser Kiri, Geser Atas, Pop, Spin In, Fade Out.

### 4.4 Timeline & scene

Play/pause, scrub per frame (step = 1/fps), penanda keyframe, display waktu.
Bar scene: nama, resolusi cepat + custom, fps, durasi, background solid/alpha,
simpan/buka/hapus scene (localStorage).

### 4.5 Export studio

Sama seperti generator: MP4 frame-exact offline / WebM alpha realtime /
aksi desktop + thumbnail. Plus panel **Kepatuhan Adobe Stock** dan
**metadata + CSV otomatis** (kategori Graphics, filename `vidlust_studio_…`).

### 4.6 Generate scene dari ide (AI) ✨

Di Motion Studio, buka panel **✨ Generate scene dari ide (AI)**:

1. Tulis ide bahasa Indonesia (cth: `kopi hangat di pagi hari untuk intro cafe`).
2. Pilih gaya (Otomatis/Corporate/Neon/Pastel/Broadcast) + durasi 5–30 detik.
3. Klik **✨ Generate dengan AI** — gratis via Pollinations (pakai kunci yang sama
   seperti tab 🎁 AI Video). AI merancang layer + keyframe (maks 6 layer,
   tanpa layer gambar), hasilnya langsung bisa diedit, disimpan & di-export
   seperti scene biasa.
4. Tanpa internet/kunci? Klik **🎲 Offline** — preset starter di-remix
   (teks + warna disesuaikan dari ide) tanpa AI.

---

## 5. Fitur 🖥 Desktop (hanya di file .exe)

Muncul otomatis di bawah hasil export / batch:

| Tombol | Fungsi |
|---|---|
| 💾 Simpan file | Simpan ke folder output (bisa ganti & buka folder) |
| 🎞 → MP4 H.264 | Convert WebM (mis. hasil Firefox) jadi MP4 siap Adobe |
| ✨ → MOV ProRes 4444 | Convert WebM alpha jadi MOV alpha siap Adobe (tidak bisa dilakukan browser!) |
| 🎞 PNG seq → ProRes 4444 | **Disarankan untuk alpha asli:** render ulang PNG per frame → MOV (WebM browser sering opak) |
| 🖼 GIF preview | Video jadi GIF kecil untuk portofolio |
| 🖥 Simpan N file | Simpan seluruh hasil batch sekaligus |

Folder default: `Videos\Vidlust`.

---

## 6. Tips Lolos Kurasi Adobe Stock

1. Tanpa teks = timeless, laku ke banyak niche.
2. Durasi **10–15 detik** paling laris untuk loop (semua template seamless).
3. Render **HD untuk tes**, **4K untuk upload final** (harga lebih tinggi).
4. Prosedural/template/studio = 100% milikmu, **tanpa release**.
5. Video AI = centang generative-AI; orang/tempat nyata perlu release.
6. WebM alpha **wajib** convert ke MOV (ProRes 4444) sebelum upload.
7. Syarat teknis: MP4/MOV, 5–60 detik, resolusi standar
   (1920×1080 s/d 4096×2304 landscape, 1080×1920 vertical, 1080×1080 square),
   fps standar, maks 3,9 GB.

---

## 7. Troubleshooting

| Gejala | Solusi |
|---|---|
| Exe terbuka hitam (versi lama) | Pakai `Vidlust-0.7.0-win.exe` (versi terbaru, sudah diperbaiki via base path relatif) |
| Export gagal / tombol nonaktif | Pakai Chrome/Edge terbaru (butuh WebCodecs untuk offline) |
| Hasil .webm bukan .mp4 | Normal di Firefox → convert via app desktop, atau render di Chrome |
| Alpha hilang setelah convert | Pastikan sumbernya WebM dari mode transparan, convert via ProRes |
| Scene gagal tersimpan | Gambar terlalu besar → pakai gambar lebih kecil |
| Butuh bukti boot bermasalah | Cek `%TEMP%\vidlust-ready.log` dan `vidlust-error.log` |

---

## 8. Cara Tanpa Membayar (jalur gratis)

1. **Gratis selamanya (disarankan untuk produksi):** 18 template prosedural +
   Motion Studio — tanpa token, tanpa antre, tanpa batas. Ini satu-satunya jalur
   gratis yang skalabel untuk portofolio Adobe Stock.
2. **AI gratis terbatas:** tab 🎁 AI Video Gratis → daftar gratis di
   `enter.pollinations.ai/keys` (tanpa kartu kredit) → tempel kunci → pilih model
   (WAN hemat / Seedance sinematik / Veo premium) → Generate. Dapat Pollen gratis
   untuk testing; antrean bisa 1–10 menit; bila Pollen habis, tunggu/quest.
3. **Trial platform lain** (Luma/Pika/Runway/Kling, kredit Hugging Face): bisa untuk
   coba-coba, TAPI sering ber-watermark atau berlisensi non-komersial → **tidak bisa
   dijual di Adobe Stock**. Selalu cek lisensi + hapus watermark sebelum submit.

## 9. Perintah developer

```
npm install          # install dependensi (sekali saja)
npm run dev          # localhost:5173
npm run build        # build web → folder dist/
npm run preview      # pratinjau hasil build
npm run electron:dev   # jalankan versi desktop dari source
npm run electron:build # packaging → release\Vidlust-<versi>-win.exe (portable)
```
