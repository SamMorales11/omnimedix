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
│   ├── api/                  # Backend REST API (Hono)
│   │   ├── src/
│   │   │   ├── lib/          # Auth JWT/bcrypt & database client
│   │   │   ├── middleware/   # JWT verification & RBAC guards
│   │   │   ├── routes/       # Rute API (/api/auth/login, /api/auth/me)
│   │   │   ├── services/     # Business logic layer
│   │   │   ├── app.ts        # Inisialisasi Hono app, CORS, error handler
│   │   │   └── index.ts      # Server entry point
│   │   └── package.json
│   └── web/                  # Frontend Web App (Vue 3)
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

## 🚀 Panduan Memulai (First-Time Setup)

### 1. Prasyarat

- **Node.js**: `v20+` atau `v22+`
- **pnpm**: `v9+` atau `v10+`

### 2. Instalasi Dependensi

Jalankan di root folder:

```bash
pnpm install
```

### 3. Konfigurasi Environment

Salin file `.env.example` ke `.env` (atau edit file `.env` yang sudah ada):

```bash
cp .env.example .env
```

Pastikan `DATABASE_URL` mengarah ke database Neon PostgreSQL Anda.

### 4. Setup Skema Database (Drizzle ORM)

Generate file migrasi atau push skema ke database:

```bash
# Generate file migrasi SQL
pnpm db:generate

# ATAU push langsung skema ke Neon DB
pnpm db:push

# (Opsional) Membuka Drizzle Studio di browser
pnpm db:studio
```

### 5. Menjalankan Server Development

Jalankan backend API dan frontend web secara bersamaan:

```bash
pnpm dev
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 📜 Daftar Script Workspace

| Perintah           | Keterangan                                                       |
| :----------------- | :--------------------------------------------------------------- |
| `pnpm dev`         | Menjalankan API (`:3000`) & Web (`:5173`) secara paralel         |
| `pnpm dev:api`     | Hanya menjalankan server backend Hono API                        |
| `pnpm dev:web`     | Hanya menjalankan frontend Vue 3 + Vite                          |
| `pnpm build`       | Mengompilasi seluruh package dan aplikasi di monorepo            |
| `pnpm typecheck`   | Menjalankan pemeriksaan tipe TypeScript mode strict (`--noEmit`) |
| `pnpm db:generate` | Menghasilkan migrasi SQL Drizzle dari skema TypeScript           |
| `pnpm db:push`     | Menerapkan skema Drizzle langsung ke Neon database               |
| `pnpm db:migrate`  | Menjalankan migrasi SQL                                          |
| `pnpm db:studio`   | Membuka antarmuka Drizzle Studio GUI                             |
| `pnpm format`      | Memformat kode menggunakan Prettier                              |
| `pnpm lint`        | Menjalankan ESLint pada workspace                                |
