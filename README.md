# Omnimedix

Sistem Informasi & Manajemen Pelayanan Medis Terpadu (**Hospital & Clinic Management System**) yang modern, ringan, dan cepat. Dirancang untuk mendigitalisasi alur pelayanan kesehatan mulai dari pendaftaran antrean mandiri oleh pasien, rekam medis dan e-resep oleh dokter, dispensing obat oleh farmasi, hingga pemantauan operasional oleh administrator.

<img width="1564" height="900" alt="omnimedix" src="https://github.com/user-attachments/assets/612a757d-7474-4505-9439-fdb949c26d1b" />

---

## 🚀 Tech Stack

- **Frontend**: [Vue 3](https://vuejs.org/) (Composition API), [Vite](https://vitejs.dev/), [Pinia](https://pinia.vuejs.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend API**: [Hono](https://hono.dev/) on [Node.js](https://nodejs.org/), [Zod](https://zod.dev/), [jose](https://github.com/panva/jose) (JWT)
- **Database & ORM**: [Neon Serverless PostgreSQL](https://neon.tech/), [Drizzle ORM](https://orm.drizzle.team/)
- **Monorepo Tooling**: [pnpm Workspaces](https://pnpm.io/), TypeScript strict mode

---

## ✨ Fitur Utama

### 🏥 Modul Pasien (Publik)
- **Booking Antrean Online**: Pendaftaran antrean rawat jalan berdasarkan poliklinik dan dokter.
- **Tiket Antrean Digital**: Pembuatan kartu bukti antrean digital dengan kode booking dan QR/Canvas yang dapat diunduh.
- **Lacak Antrean Real-time**: Pemantauan status panggilan dan estimasi pelayanan secara mandiri.

### 🩺 Modul Dokter
- **Daftar Antrean Pasien**: Monitoring antrean pasien aktif berdasarkan poliklinik per hari ini.
- **Pemeriksaan & Rekam Medis**: Pencatatan diagnosis pasien dan riwayat keluhan medis.
- **E-Prescription (Resep Elektronik)**: Pembuatan dan pengiriman resep obat terintegrasi langsung ke unit farmasi.

### 💊 Modul Apoteker & Farmasi
- **Antrean Resep Masuk**: Pengelolaan status pemrosesan resep (*Pending* → *Preparing* → *Ready* → *Taken*).
- **Manajemen Inventaris Obat**: Pemantauan stok obat aktif, obat kedaluwarsa, dan ambang batas stok minimum.
- **Pencatatan Mutasi Stok**: Riwayat obat masuk (*stock in*) dan audit pemakaian obat harian.

### ⚙️ Modul Administrator
- **Dashboard Rumah Sakit**: Ringkasan metrik statistik operasional harian dan log audit aktivitas.
- **Manajemen Master Data**: Pengelolaan data pasien, profil & jadwal dokter, serta katalog obat.
- **Manajemen Akun & Hak Akses (RBAC)**: Pengelolaan akun pengguna dan pembagian wewenang peran (*Admin*, *Dokter*, *Apoteker*).

---

## 📂 Struktur Monorepo

```text
omnimedix/
├── apps/
│   ├── api/          # REST API server (Hono)
│   └── web/          # Aplikasi frontend SPA (Vue 3 + Vite)
├── packages/
│   ├── config/       # Konfigurasi shared (TypeScript, linter, formatting)
│   ├── db/           # Skema Drizzle ORM, migrasi, dan seed database
│   └── shared/       # Skema validasi Zod, kontrak tipe TypeScript, dan konstanta
├── package.json
└── pnpm-workspace.yaml
```

---

## 🛠️ Panduan Memulai

### Prasyarat
- [Node.js](https://nodejs.org/) (versi 20 atau lebih baru)
- [pnpm](https://pnpm.io/) (versi 9 atau lebih baru)
- Database PostgreSQL (misal: [Neon Serverless Postgres](https://neon.tech/))

### 1. Kloning Repositori & Instalasi
```bash
git clone https://github.com/SamMorales11/omnimedix.git
cd omnimedix
pnpm install
```

### 2. Konfigurasi Environment
Salin berkas template environment:
```bash
cp .env.example .env
```
Sesuaikan variabel environment pada file `.env`:
```env
DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"
JWT_SECRET="ganti-dengan-kunci-rahasia-jwt-anda"
VITE_API_BASE_URL="http://localhost:3000"
```

### 3. Setup Basis Data
Terapkan skema database dan data awal:
```bash
# Terapkan skema tabel ke database
pnpm db:push

# Masukkan data awal master data
pnpm db:seed
```

### 4. Menjalankan Server Development
Jalankan backend API dan frontend web secara bersamaan:
```bash
pnpm dev
```
- **Aplikasi Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

---

## 📌 Catatan Proyek

Proyek ini dikembangkan sebagai prototipe sistem manajemen fasilitas kesehatan (**Minimum Viable Product / MVP**) untuk memvalidasi alur pelayanan pasien terintegrasi end-to-end. 

---

## 📄 Lisensi

Didistribusikan di bawah lisensi [MIT](LICENSE). Silakan gunakan dan kembangkan sesuai kebutuhan.
