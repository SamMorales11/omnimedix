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

Terapkan skema database dan masukkan data awal yang realistis untuk pengujian komprehensif (4 poliklinik, 12 akun pengguna, 12 profil pasien, 21 katalog obat, 28 antrean, 8 resep medis, dan riwayat mutasi stok):

```bash
# A. Terapkan skema database ke PostgreSQL Neon
pnpm db:push

# B. Masukkan data awal (Mode Idempotent - aman dijalankan berulang kali tanpa menduplikasi data)
pnpm db:seed

# C. Reset bersih dan seed ulang dari awal (Mode Fresh)
pnpm db:seed:fresh

# D. (Opsional) Buka antarmuka Drizzle Studio GUI di browser
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

## 🔑 Akun Pengujian Testing (Demo Credentials)

Database seed telah dilengkapi dengan **12 akun pengujian** yang siap digunakan untuk berbagai skenario rumah sakit dan poliklinik:

### 1. Administrator Sistem (Akses Penuh Master Data)
| Nama Akun | Email | Kata Sandi | Deskripsi Wewenang |
| :--- | :--- | :--- | :--- |
| **Administrator Omnimedix** | `admin@omnimedix.local` | `Admin123!` | Super Admin, Dashboard Rumah Sakit, CRUD User & Master Data |
| **Rizka Amelia, S.Kom** | `admin.klinik@omnimedix.local` | `Admin123!` | Administrasi Operasional RS & Manajemen Pasien |

### 2. Dokter Poliklinik (Pemeriksaan Medis & E-Resep)
| Nama Dokter | Email | Kata Sandi | Poliklinik & Spesialisasi |
| :--- | :--- | :--- | :--- |
| **dr. Budi Santoso, Sp.PD** | `dokter@omnimedix.local` | `Dokter123!` | Poli Umum / Penyakit Dalam |
| **dr. Farhan Maulana** | `dr.farhan@omnimedix.local` | `Dokter123!` | Poli Umum (Layanan Primer) |
| **drg. Nadia Sarah, Sp.KG** | `dr.nadia@omnimedix.local` | `Dokter123!` | Poli Gigi & Mulut (Konservasi Gigi) |
| **drg. Rizky Pratama** | `drg.rizky@omnimedix.local` | `Dokter123!` | Poli Gigi & Mulut (Estetika Gigi) |
| **dr. Anisa Rahmawati, Sp.A** | `dr.anisa@omnimedix.local` | `Dokter123!` | Poli Anak (Pediatri & Tumbuh Kembang) |
| **dr. Hendra Gunawan, Sp.PD** | `dr.hendra@omnimedix.local` | `Dokter123!` | Poli Penyakit Dalam (Internist) |

### 3. Tenaga Farmasi / Apoteker (Dispensing & Manajemen Stok)
| Nama Apoteker | Email | Kata Sandi | Posisi / Unit |
| :--- | :--- | :--- | :--- |
| **Siti Aminah, S.Farm., Apt.** | `apoteker@omnimedix.local` | `Apoteker123!` | Kepala Instalasi Farmasi |
| **Rahmat Hidayat, S.Farm., Apt.** | `apoteker.rahmat@omnimedix.local` | `Apoteker123!` | Apoteker Pelayanan Resep |
| **Diana Kusuma, S.Farm., Apt.** | `apoteker.diana@omnimedix.local` | `Apoteker123!` | Apoteker Pengendali Stok |
| **Fajar Ramadhan, S.Farm.** | `apoteker.fajar@omnimedix.local` | `Apoteker123!` | Tenaga Teknis Kefarmasian |

> [!TIP]
> Di halaman login (`/auth/login`), tersedia tombol **Quick Fill Demo** untuk Dokter, Apoteker, dan Admin untuk kemudahan testing tanpa perlu mengetik kredensial secara manual.

---

## 🧪 Alur Utama Sistem yang Siap Diuji (End-to-End)

Omnimedix telah diuji dan distabilkan secara end-to-end (`pnpm test:e2e`). Anda dapat memverifikasi skenario berikut:

### 1. Alur Pasien: Pendaftaran Antrean Online (Public Booking)
- [ ] Buka [http://localhost:5173](http://localhost:5173) dan klik **Daftar Antrean Sekarang** (atau langsung ke `/booking`).
- [ ] **Langkah 1**: Pilih poliklinik tujuan (misal: *Poli Umum* atau *Poli Penyakit Dalam*) dan pilih dokter bertugas.
- [ ] **Langkah 2**: Lengkapi data pasien (NIK 16 digit, Nama, Tanggal Lahir, Jenis Kelamin, No. HP). Jika pasien sudah pernah berobat, data Rekam Medis (No. RM) akan otomatis dihubungkan.
- [ ] **Langkah 3**: Konfirmasi data dan daftarkan antrean.
- [ ] Dapatkan **Kode Booking** (contoh: `BK-XXXXXX`) dan **Nomor Antrean** (contoh: `A-008`).
- [ ] Klik **Unduh Bukti (PNG)** untuk mengunduh tiket kartu antrean yang digenerate langsung melalui HTML5 Canvas.

### 2. Alur Pasien: Lacak Status Antrean Real-Time (Queue Tracking)
- [ ] Buka menu **Lacak Antrean** di navbar publik (`/track-queue`).
- [ ] Masukkan kode booking yang didapatkan dari pendaftaran sebelumnya (misal: `BK-XXXXXX`).
- [ ] Pantau status antrean secara real-time (*Menunggu*, *Sedang Diperiksa*, *Selesai*), nomor antrean yang sedang dipanggil dokter, estimasi jam pelayanan, serta opsi cetak/unduh ulang bukti tiket.

### 3. Alur Autentikasi & Role-Based Access Control (RBAC)
- [ ] Buka `/auth/login` dan gunakan tombol cepat untuk login sebagai salah satu peran.
- [ ] Sistem akan mengarahkan pengguna ke rute dashboard sesuai peran:
  - Admin → `/admin`
  - Dokter → `/doctor`
  - Apoteker → `/pharmacist`
- [ ] **Uji Perlindungan Rute (Router Guard)**:
  - Coba akses URL silang peran (misal: login sebagai Dokter lalu ketik `/admin` di URL). Sistem akan otomatis memblokir dan mengarahkan kembali ke dashboard yang diizinkan.
  - Akses `/auth/login` saat sudah login akan langsung dialihkan ke dashboard peran terkait tanpa perlu login ulang.
- [ ] Klik **Keluar** (Logout) di sidebar dashboard; sesi akan dibersihkan dan dialihkan kembali ke login.

### 4. Alur Dokter: Pemeriksaan Medis & E-Prescription
- [ ] Login sebagai **Dokter** (`dokter@omnimedix.local` / `Dokter123!`).
- [ ] Pada `/doctor`, periksa antrean hari ini (`QueueListView`) yang telah dilengkapi kartu statistik ringkasan, filter pencarian, dan state skeleton.
- [ ] Pilih salah satu antrean pasien yang berstatus *Menunggu*, lalu klik untuk masuk ke **Detail Pemeriksaan** (`QueueDetailView`).
- [ ] Klik **Panggil Pasien / Mulai Periksa** (status berubah menjadi *Sedang Diperiksa / in_progress*).
- [ ] Masukkan **Diagnosis** pasien (misal: *Faringitis Akut*) dan catatan pemeriksaan, lalu simpan.
- [ ] Tambahkan obat pada **Form Resep Elektronik**: pilih obat dari daftar stok, kuantitas, dosis, dan petunjuk pemakaian.
- [ ] Klik **Kirim Resep ke Farmasi** untuk menerbitkan resep elektronik.
- [ ] Klik **Selesaikan Pemeriksaan** (status antrean berubah menjadi *Selesai / completed*).

### 5. Alur Apoteker: Dispensing Resep & Manajemen Stok Obat
- [ ] Login sebagai **Apoteker** (`apoteker@omnimedix.local` / `Apoteker123!`).
- [ ] Pada menu **Antrean Resep** (`/pharmacist/prescriptions`), temukan resep yang diterbitkan dokter (status: *Menunggu / pending*).
- [ ] Buka detail resep (`PrescriptionDetailView`).
- [ ] Klik **Proses Penyiapan Obat** (status menjadi *Sedang Disiapkan / preparing*).
- [ ] Setelah selesai diracik, klik **Tandai Siap Diambil** (status menjadi *Siap Diambil / ready*).
- [ ] Saat pasien mengambil obat di loket apotek, serahkan obat dan klik **Serahkan ke Pasien** (status menjadi *Telah Diserahkan / taken*).
- [ ] Buka menu **Kelola Stok Obat** (`/pharmacist/medicines`) dan **Pencatatan Stok Masuk** (`/pharmacist/stock-in`):
  - Catat mutasi penerimaan obat masuk dari distributor.
  - Stok obat akan bertambah secara otomatis dan tercatat pada riwayat audit di **Laporan Stok** (`/pharmacist/reports`).

### 6. Alur Administrator: Dashboard, Manajemen Pengguna & Master Data
- [ ] Login sebagai **Admin** (`admin@omnimedix.local` / `Admin123!`).
- [ ] Buka **Dashboard Admin** (`/admin`): pantau metrik utama (total antrean, jumlah dokter aktif, total pasien, resep aktif, dan obat stok menipis) beserta log aktivitas.
- [ ] Buka **Kelola Pasien** (`/admin/patients`): lakukan penambahan, pencarian, dan pembaruan data pasien.
- [ ] Buka **Kelola Dokter** (`/admin/doctors`): kelola profil dokter, spesialisasi, dan jadwal poli.
- [ ] Buka **Kelola Akun** (`/admin/users`): tambah akun staf baru (Dokter/Apoteker) dan reset kata sandi.
- [ ] Buka **Master Obat** (`/admin/medicines`): tambah katalog obat baru, atur ambang batas stok minimum, serta pantau ketersediaan.

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
| `pnpm db:push` | Menerapkan skema Drizzle langsung ke basis data PostgreSQL Neon |
| `pnpm db:migrate` | Menjalankan migrasi SQL Drizzle |
| `pnpm db:seed` | Menjalankan seeding data demo (Idempotent) |
| `pnpm db:seed:fresh` | Membersihkan data lama dan melakukan seed ulang dari awal |
| `pnpm db:studio` | Membuka antarmuka Drizzle Studio GUI di peramban |
| `pnpm format` | Memformat seluruh kode sumber menggunakan Prettier |
| `pnpm lint` | Menjalankan linter ESLint pada seluruh berkas workspace |
