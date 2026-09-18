# Omnimedix Monorepo

Sistem Informasi & Manajemen Pelayanan Medis Terpadu (**Hospital & Clinical Management System**) yang modern, modular, dan cepat. Dibangun menggunakan arsitektur monorepo dengan teknologi modern full-stack TypeScript.

---

## 🛠️ Arsitektur Teknologi

- **Frontend (`apps/web`)**: [Vue 3](https://vuejs.org/) (Composition API) + [Vite](https://vitejs.dev/) + [Pinia](https://pinia.vuejs.org/) + [Tailwind CSS](https://tailwindcss.com/) + [ofetch](https://github.com/unjs/ofetch) + HTML5 Canvas Ticket Generator
- **Backend API (`apps/api`)**: [Hono](https://hono.dev/) di [Node.js](https://nodejs.org/) (`@hono/node-server`) + [jose](https://github.com/panva/jose) (JWT) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) + [Zod](https://zod.dev/)
- **Database (`packages/db`)**: [Neon Serverless PostgreSQL](https://neon.tech/) + [Drizzle ORM](https://orm.drizzle.team/)
- **Shared Models (`packages/shared`)**: Tipe data TypeScript strict & validasi skema [Zod](https://zod.dev/)
- **Shared Config (`packages/config`)**: Konfigurasi dasar TypeScript (`tsconfig.base.json`), ESLint, dan Prettier
- **Package Manager**: [pnpm](https://pnpm.io/) Workspaces

---

## 📂 Struktur Monorepo

```text
omnimedix/
├── apps/
│   ├── api/                  # Backend REST API (Hono - Port 3000)
│   │   ├── src/
│   │   │   ├── lib/          # Auth JWT/bcrypt & database client
│   │   │   ├── middleware/   # JWT verification & RBAC guards
│   │   │   ├── routes/       # Rute API: /auth, /public, /doctor, /pharmacist, /admin
│   │   │   ├── services/     # Business logic layer (auth, public, doctor, pharmacist, admin)
│   │   │   ├── app.ts        # Inisialisasi Hono app, safe CORS, error handler
│   │   │   └── index.ts      # Server entry point
│   │   └── package.json
│   └── web/                  # Frontend Web App (Vue 3 + Vite - Port 5173)
│       ├── src/
│       │   ├── components/   # Reusable UI (Button, Input, Badge, Table, Modal, Skeleton, Ticket)
│       │   ├── composables/  # Vue 3 composables (useAuth)
│       │   ├── layouts/      # PublicLayout, AuthLayout, DashboardLayout
│       │   ├── pages/        # Modul Publik, Dokter, Farmasi, Admin, Auth
│       │   ├── router/       # Vue Router dengan Navigation Guards & RBAC
│       │   ├── stores/       # Pinia Auth Store & State Management
│       │   ├── utils/        # ofetch API client & downloadTicket (HTML5 Canvas)
│       │   ├── App.vue
│       │   └── main.ts
│       └── package.json
├── packages/
│   ├── config/               # Base tsconfig, eslint, prettier
│   ├── db/                   # Drizzle ORM schema & Neon client
│   │   ├── src/schema/       # Tabel users, polis, doctors, patients, queues,
│   │   │                     # medicines, prescriptions, stock_movements, audit_logs
│   │   ├── src/seed.ts       # Script idempoten seed data awal
│   │   ├── drizzle/          # Migrasi SQL yang digenerate
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   └── shared/               # Domain interfaces, Enums, Zod validation schemas
│       ├── src/
│       │   ├── constants/    # Enum Role, QueueStatus, PrescriptionStatus
│       │   ├── schemas/      # Zod validation schemas (public, doctor, pharmacist, admin, auth)
│       │   ├── types/        # TypeScript interfaces & types
│       │   └── index.ts
│       └── package.json
├── .env                      # Environment variables lokal
├── .env.example              # Template environment variables
├── .gitignore
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 🚀 Panduan Menjalankan & Setup Awal

### 1. Prasyarat

- **Node.js**: `v20+` atau `v22+`
- **pnpm**: `v9+` atau `v10+`

### 2. Instalasi Dependensi

Jalankan perintah berikut di root monorepo:

```bash
pnpm install
```

### 3. Konfigurasi Environment (`.env`)

Salin file `.env.example` ke `.env` pada root monorepo:

```bash
cp .env.example .env
```

Pastikan variabel-variabel berikut terisi dengan benar di `.env`:

```env
# Database Neon PostgreSQL (Gunakan connection string dengan sslmode=require)
DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"

# JWT Secret untuk otentikasi token
JWT_SECRET="omnimedix-super-secret-jwt-key-change-in-production"

# Base URL API untuk Frontend Web
VITE_API_BASE_URL="http://localhost:3000"
```

### 4. Menjalankan Database Migration & Seed

Terapkan skema database dan masukkan data awal (poliklinik, akun demo, dokter spesialis, obat-obatan):

```bash
# A. Terapkan skema database ke PostgreSQL Neon
pnpm db:push

# B. Masukkan data awal (Admin, Dokter, Apoteker, Poli, Obat)
pnpm db:seed

# C. (Opsional) Buka antarmuka Drizzle Studio GUI di browser
pnpm db:studio
```

### 5. Menjalankan Server Development

Anda dapat menjalankan backend dan frontend secara bersamaan atau terpisah:

```bash
# Menjalankan Backend API (Port 3000) & Frontend Web (Port 5173) sekaligus:
pnpm dev

# ATAU jalankan secara terpisah di terminal berbeda:
pnpm dev:api    # Hanya Backend API (http://localhost:3000)
pnpm dev:web    # Hanya Frontend Web (http://localhost:5173)
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 🔑 Akun Pengujian Demo (Test Credentials)

Database seed telah menyediakan 3 akun pengujian utama dengan peran berbeda. Anda dapat login manual atau menggunakan tombol quick-fill (Demo Account) di halaman login:

| Peran | Email | Kata Sandi | Halaman Utama | Deskripsi Wewenang |
| :--- | :--- | :--- | :--- | :--- |
| **Dokter** | `dokter@omnimedix.local` | `Dokter123!` | `/doctor` | Pemeriksaan pasien, diagnosis, & peresepan obat elektronik |
| **Apoteker** | `apoteker@omnimedix.local` | `Apoteker123!` | `/pharmacist` | Penyiapan resep obat, penyerahan obat, & kelola stok |
| **Admin** | `admin@omnimedix.local` | `Admin123!` | `/admin` | Dashboard rumah sakit, CRUD pasien, dokter, akun, & obat |

---

## 🧪 Checklist Pengujian End-to-End (E2E) Alur Utama

Berikut adalah panduan pengujian alur bisnis menyeluruh (end-to-end) sistem OmniMedix dari sisi pasien hingga tenaga medis dan administrator:

### 1. Alur Pasien: Pendaftaran Antrean Online (Public Booking)
- [ ] Buka halaman utama [http://localhost:5173](http://localhost:5173) dan klik tombol **Daftar Antrean Sekarang** (mengarahkan ke `/booking`).
- [ ] **Langkah 1 (Pilih Poli & Dokter)**: Pilih poliklinik tujuan (misal: *Poli Umum*) dan pilih dokter yang bertugas. Verifikasi kuota antrean dan jadwal praktik ditampilkan.
- [ ] **Langkah 2 (Data Pasien)**: Masukkan NIK (16 digit), Nama Lengkap, Tanggal Lahir / Umur, Jenis Kelamin, dan Nomor Telepon.
- [ ] **Langkah 3 (Konfirmasi & Submit)**: Klik **Konfirmasi & Daftarkan Antrean**.
- [ ] Verifikasi modal atau kartu sukses pendaftaran muncul menampilkan **Kode Booking** (misal: `BK-XXXXXX`) dan **Nomor Antrean** (misal: `A-001`).
- [ ] Klik **Unduh Bukti (PNG)** atau **Cetak Tiket** untuk memvalidasi fitur pembuatan tiket antrean visual.

### 2. Alur Pasien: Lacak Status Antrean (Queue Tracking)
- [ ] Buka menu **Lacak Antrean** di navbar publik (`/track-queue`).
- [ ] Masukkan Kode Booking yang didapatkan dari pendaftaran sebelumnya (misal: `BK-XXXXXX`) lalu klik tombol cari.
- [ ] Verifikasi detail antrean ditampilkan: Nomor antrean, nama poli, nama dokter, status saat ini (*Menunggu*, *Sedang Diperiksa*, *Selesai*), estimasi waktu, serta informasi pasien (dengan sensor NIK/Nama untuk privasi).
- [ ] Klik tombol **Cetak / Unduh Bukti** untuk membuka modal tiket antrean dan unduh kartu PNG / cetak format thermal.

### 3. Alur Autentikasi & Role-Based Access Control (RBAC)
- [ ] Buka halaman login di `/auth/login`.
- [ ] Coba klik salah satu tombol preset demo (misal: *Dokter*), pastikan form terisi otomatis, lalu klik **Masuk ke Sistem**.
- [ ] Verifikasi pengalihan otomatis ke dashboard yang sesuai peran (`/doctor`, `/pharmacist`, atau `/admin`).
- [ ] **Uji Router Guard**: Saat login sebagai Dokter, ketikkan `/admin` atau `/pharmacist` di address bar browser. Verifikasi bahwa sistem otomatis menolak akses dan mengembalikan ke `/doctor`.
- [ ] **Uji Guest Guard**: Saat posisi login, buka `/auth/login`. Verifikasi sistem mengarahkan kembali ke dashboard peran aktif.
- [ ] Klik tombol **Keluar** (Logout) di sidebar / navbar, verifikasi token dihapus dan dialihkan ke `/auth/login`.

### 4. Alur Dokter (Pemeriksaan Medis & E-Prescription)
- [ ] Login sebagai **Dokter** (`dokter@omnimedix.local` / `Dokter123!`).
- [ ] Pada dashboard `/doctor`, periksa daftar antrean hari ini (`QueueListView`).
- [ ] Pilih salah satu antrean berstatus *Menunggu*, lalu klik untuk membuka detail antrean (`QueueDetailView`).
- [ ] Klik tombol **Panggil Pasien / Mulai Periksa** (status berubah menjadi *Sedang Diperiksa / in_progress*).
- [ ] Masukkan **Diagnosis** (misal: *Faringitis Akut*) dan **Catatan Penanganan / Instruksi**. Klik **Simpan Rekam Medis**.
- [ ] Tambahkan resep obat elektronik: pilih obat dari daftar obat aktif, tentukan kuantitas, dosis (misal: *3x1 tablet*), dan instruksi pemakaian.
- [ ] Klik **Kirim Resep ke Farmasi** (membuat e-resep dan meneruskannya ke modul Apoteker).
- [ ] Klik tombol **Selesaikan Pemeriksaan** (status antrean berubah menjadi *Selesai / completed*).

### 5. Alur Apoteker (Dispensing Resep & Manajemen Stok Obat)
- [ ] Login sebagai **Apoteker** (`apoteker@omnimedix.local` / `Apoteker123!`).
- [ ] Pada menu **Antrean Resep** (`/pharmacist/prescriptions`), verifikasi resep yang baru saja diterbitkan oleh dokter muncul dengan status *Menunggu / pending*.
- [ ] Buka detail resep (`PrescriptionDetailView`).
- [ ] Klik **Proses Penyiapan Obat** (status berubah menjadi *Sedang Disiapkan / preparing*).
- [ ] Setelah obat selesai diracik/dikemas, klik **Tandai Siap Diambil** (status berubah menjadi *Siap Diambil / ready*).
- [ ] Saat pasien menyerahkan bukti nomor antrean di loket farmasi, serahkan obat dan klik **Serahkan ke Pasien** (status berubah menjadi *Telah Diserahkan / taken*).
- [ ] Buka menu **Kelola Stok Obat** (`/pharmacist/medicines`) dan **Pencatatan Stok Masuk** (`/pharmacist/stock-in`):
  - Masukkan mutasi stok masuk (Restock dari distributor).
  - Verifikasi jumlah stok terupdate secara otomatis dan tercatat di riwayat mutasi stok (`/pharmacist/reports`).

### 6. Alur Admin (Master Data & Manajemen Sistem)
- [ ] Login sebagai **Admin** (`admin@omnimedix.local` / `Admin123!`).
- [ ] Buka **Dashboard Admin** (`/admin`):
  - Periksa indikator ringkasan: Total Antrean Hari Ini, Pasien Terdaftar, Dokter Aktif, Obat Stok Rendah, dan Resep Aktif.
  - Periksa log aktivitas sistem terbaru.
- [ ] Buka menu **Data Pasien** (`/admin/patients`):
  - Uji fitur pencarian pasien berdasarkan nama / NIK.
  - Uji penambahan pasien baru, edit data pasien, serta tombol aktifkan/nonaktifkan status pasien.
- [ ] Buka menu **Data Dokter** (`/admin/doctors`):
  - Lihat daftar dokter beserta poli terkait.
  - Uji penambahan dokter baru (terintegrasi dengan akun login dokter) dan toggle aktif/nonaktif praktik.
- [ ] Buka menu **Kelola Akun** (`/admin/users`):
  - Filter daftar pengguna berdasarkan peran (*DOKTER* atau *APOTEKER*).
  - Tambah akun tenaga medis baru, reset kata sandi, dan toggle status akun aktif/nonaktif.
- [ ] Buka menu **Master Obat** (`/admin/medicines`):
  - Tambah master obat baru, ubah kategori/satuan/harga/stok minimum, serta toggle status obat.

---

## 📜 Daftar Script Workspace

| Perintah | Keterangan |
| :--- | :--- |
| `pnpm dev` | Menjalankan API (`:3000`) & Frontend Web (`:5173`) secara paralel |
| `pnpm dev:api` | Menjalankan backend server Hono API di port 3000 |
| `pnpm dev:web` | Menjalankan frontend Vue 3 + Vite di port 5173 |
| `pnpm build` | Mengompilasi seluruh package dan aplikasi di monorepo |
| `pnpm typecheck` | Menjalankan pemeriksaan tipe TypeScript mode strict (`--noEmit`) |
| `pnpm test:e2e` | Menjalankan pengujian otomatis 6 alur end-to-end terintegrasi |
| `pnpm db:generate` | Menghasilkan berkas migrasi SQL Drizzle dari skema TypeScript |
| `pnpm db:push` | Menerapkan skema Drizzle langsung ke basis data PostgreSQL |
| `pnpm db:migrate` | Menjalankan migrasi SQL Drizzle |
| `pnpm db:seed` | Menjalankan seeding data demo ke basis data |
| `pnpm db:studio` | Membuka antarmuka Drizzle Studio GUI di peramban |
| `pnpm format` | Memformat seluruh kode sumber menggunakan Prettier |
| `pnpm lint` | Menjalankan linter ESLint pada seluruh berkas workspace |
