# Omnimedix Monorepo

Sistem Informasi & Manajemen Pelayanan Medis Terpadu (**Hospital & Clinical Management System**) yang modern, modular, dan cepat.

---

## 🛠️ Arsitektur Teknologi

- **Frontend (`apps/web`)**: [Vue 3](https://vuejs.org/) (Composition API) + [Vite](https://vitejs.dev/) + [Pinia](https://pinia.vuejs.org/) + [Tailwind CSS](https://tailwindcss.com/) + [ofetch](https://github.com/unjs/ofetch)
- **Backend API (`apps/api`)**: [Hono](https://hono.dev/) di [Node.js](https://nodejs.org/) (`@hono/node-server`) + [jose](https://github.com/panva/jose) (JWT) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
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
│   │   │   ├── routes/       # Rute API (/api/auth/login, /api/auth/me)
│   │   │   ├── services/     # Business logic layer
│   │   │   ├── app.ts        # Inisialisasi Hono app, safe CORS, error handler
│   │   │   └── index.ts      # Server entry point
│   │   └── package.json
│   └── web/                  # Frontend Web App (Vue 3 + Vite - Port 5173)
│       ├── src/
│       │   ├── components/   # Reusable UI & Layout components
│       │   ├── composables/  # Vue 3 composables (useAuth)
│       │   ├── layouts/      # PublicLayout, AuthLayout, DashboardLayout
│       │   ├── pages/        # Modul Dokter, Farmasi, Admin, Auth, Publik
│       │   ├── router/       # Vue Router dengan Role navigation guards
│       │   ├── stores/       # Pinia Auth Store
│       │   ├── utils/        # ofetch API client
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
│       │   ├── schemas/      # Zod loginSchema, createUserSchema
│       │   ├── types/        # User, Patient, Doctor, Medicine, Queue, Prescription
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

Jalankan di root monorepo:

```bash
pnpm install
```

### 3. Konfigurasi Environment (`.env`)

Salin file `.env.example` ke `.env` (jika belum ada):

```bash
cp .env.example .env
```

Pastikan variabel berikut terisi di `.env`:

- `DATABASE_URL`: URL PostgreSQL Neon Anda (dengan mode pooler dan `?sslmode=require`).
- `JWT_SECRET`: Kunci rahasia untuk menandatangani token JWT.
- `VITE_API_BASE_URL`: `http://localhost:3000` (untuk koneksi web ke api).

### 4. Menjalankan Database Migration & Seed

Terapkan skema database dan masukkan data awal (poliklinik, akun demo, obat-obatan):

```bash
# A. Terapkan skema database ke Neon PostgreSQL
pnpm db:push

# B. Masukkan data awal (Admin, Dokter, Apoteker, Poli, Obat)
pnpm db:seed

# C. (Opsional) Buka Drizzle Studio GUI di browser
pnpm db:studio
```

### 5. Menjalankan Aplikasi

Anda dapat menjalankan backend dan frontend secara terpisah atau bersamaan:

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

## 🧪 Pengujian Autentikasi Manual (Step-by-Step)

### Akun Bawaan (Seed):

| Peran        | Email                      | Kata Sandi     | Halaman Utama |
| :----------- | :------------------------- | :------------- | :------------ |
| **Dokter**   | `dokter@omnimedix.local`   | `Dokter123!`   | `/doctor`     |
| **Apoteker** | `apoteker@omnimedix.local` | `Apoteker123!` | `/pharmacist` |
| **Admin**    | `admin@omnimedix.local`    | `Admin123!`    | `/admin`      |

### Skenario Pengujian:

1. **Login Sesuai Peran**:
   - Buka `http://localhost:5173/auth/login`.
   - Gunakan tombol preset demo (🩺 Dokter, 💊 Farmasi, ⚙️ Admin) atau masukkan email dan password manual.
   - Klik **Masuk ke Sistem**.
   - Verifikasi bahwa browser mengarahkan ke dashboard yang sesuai peran (`/doctor`, `/pharmacist`, atau `/admin`).
2. **Verifikasi `GET /api/auth/me`**:
   - Buka DevTools Network tab saat login / setelah refresh.
   - Amati panggilan `GET /api/auth/me` yang membawa header `Authorization: Bearer <token>`.
   - Pastikan response mengembalikan profil pengguna dan `doctorProfile` (jika dokter), serta **tidak membocorkan** kolom `passwordHash`.
3. **Pencegahan Akses Silang Peran (Router Guard)**:
   - Login sebagai **Dokter** (`/doctor`).
   - Ubah URL di address bar browser secara manual ke `http://localhost:5173/admin` atau `http://localhost:5173/pharmacist`.
   - Verifikasi bahwa router guard secara otomatis memblokir akses dan mengembalikan user ke `/doctor`.
4. **Proteksi Halaman Tamu (Guest Only)**:
   - Saat sedang dalam keadaan login, coba buka `http://localhost:5173/auth/login`.
   - Router guard akan langsung mengarahkan Anda kembali ke dashboard peran Anda.
5. **Logout**:
   - Klik tombol **Keluar** di navbar / sidebar.
   - Verifikasi `omnimedix_token` terhapus dari `localStorage` dan user dialihkan ke `/auth/login`.

---

## 📜 Daftar Script Workspace

| Perintah           | Keterangan                                                       |
| :----------------- | :--------------------------------------------------------------- |
| `pnpm dev`         | Menjalankan API (`:3000`) & Web (`:5173`) secara paralel         |
| `pnpm dev:api`     | Menjalankan server backend Hono API di port 3000                 |
| `pnpm dev:web`     | Menjalankan frontend Vue 3 + Vite di port 5173                   |
| `pnpm build`       | Mengompilasi seluruh package dan aplikasi di monorepo            |
| `pnpm typecheck`   | Menjalankan pemeriksaan tipe TypeScript mode strict (`--noEmit`) |
| `pnpm db:generate` | Menghasilkan migrasi SQL Drizzle dari skema TypeScript           |
| `pnpm db:push`     | Menerapkan skema Drizzle langsung ke database Neon               |
| `pnpm db:migrate`  | Menjalankan migrasi SQL Drizzle                                  |
| `pnpm db:seed`     | Menjalankan seeding data awal ke database                        |
| `pnpm db:studio`   | Membuka antarmuka Drizzle Studio GUI di browser                  |
| `pnpm format`      | Memformat seluruh kode menggunakan Prettier                      |
| `pnpm lint`        | Menjalankan linter ESLint pada workspace                         |
