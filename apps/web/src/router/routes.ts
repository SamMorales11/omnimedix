import type { RouteRecordRaw } from "vue-router";
import { Role } from "@omnimedix/shared";

export const routes: RouteRecordRaw[] = [
  // 1. Public Layout Routes
  {
    path: "/",
    component: () => import("../layouts/PublicLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("../pages/public/HomeView.vue"),
        meta: { title: "Beranda - Layanan Pasien" },
      },
      {
        path: "booking",
        name: "booking",
        component: () => import("../pages/public/BookingView.vue"),
        meta: { title: "Pendaftaran Antrean Online" },
      },
      {
        path: "track-queue",
        name: "track-queue",
        alias: ["track"],
        component: () => import("../pages/public/TrackQueueView.vue"),
        meta: { title: "Lacak Antrean & Status Resep" },
      },
      {
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: () => import("../pages/public/NotFoundPage.vue"),
        meta: { title: "404 - Halaman Tidak Ditemukan" },
      },
    ],
  },

  // 2. Authentication Routes (Public)
  {
    path: "/auth",
    redirect: "/auth/login",
  },
  {
    path: "/auth/login",
    name: "login",
    component: () => import("../pages/auth/LoginView.vue"),
    meta: { title: "Masuk Portal Medis", guestOnly: true },
  },

  // 3. Protected Dashboard Routes (Role-based)
  {
    path: "/",
    component: () => import("../layouts/DashboardLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "doctor",
        name: "doctor-dashboard",
        alias: ["doctor/queues"],
        component: () => import("../pages/doctor/QueueListView.vue"),
        meta: {
          title: "Konsol Dokter - Antrean Pasien",
          requiresAuth: true,
          role: Role.DOCTOR,
        },
      },
      {
        path: "doctor/queues/:id",
        name: "doctor-queue-detail",
        component: () => import("../pages/doctor/QueueDetailView.vue"),
        meta: {
          title: "Penanganan Pasien & Resep",
          requiresAuth: true,
          role: Role.DOCTOR,
        },
      },
      {
        path: "pharmacist",
        name: "pharmacist-prescriptions",
        alias: ["pharmacist/prescriptions"],
        component: () => import("../pages/pharmacist/PrescriptionListView.vue"),
        meta: {
          title: "Konsol Farmasi - Daftar Resep",
          requiresAuth: true,
          role: Role.PHARMACIST,
        },
      },
      {
        path: "pharmacist/prescriptions/:id",
        name: "pharmacist-prescription-detail",
        component: () =>
          import("../pages/pharmacist/PrescriptionDetailView.vue"),
        meta: {
          title: "Detail Resep Farmasi",
          requiresAuth: true,
          role: Role.PHARMACIST,
        },
      },
      {
        path: "pharmacist/medicines",
        name: "pharmacist-medicines",
        component: () => import("../pages/pharmacist/MedicineListView.vue"),
        meta: {
          title: "Katalog & Stok Obat Farmasi",
          requiresAuth: true,
          role: Role.PHARMACIST,
        },
      },
      {
        path: "pharmacist/stock-in",
        name: "pharmacist-stock-in",
        component: () => import("../pages/pharmacist/StockInView.vue"),
        meta: {
          title: "Pencatatan Obat Masuk",
          requiresAuth: true,
          role: Role.PHARMACIST,
        },
      },
      {
        path: "pharmacist/reports/stock",
        name: "pharmacist-stock-report",
        alias: ["pharmacist/stock-report", "pharmacist/reports"],
        component: () => import("../pages/pharmacist/StockReportView.vue"),
        meta: {
          title: "Laporan Stok Farmasi",
          requiresAuth: true,
          role: Role.PHARMACIST,
        },
      },
      {
        path: "admin",
        name: "admin-dashboard",
        component: () => import("../pages/admin/DashboardView.vue"),
        meta: {
          title: "Dashboard Admin",
          requiresAuth: true,
          role: Role.ADMIN,
        },
      },
      {
        path: "admin/patients",
        name: "admin-patients",
        component: () => import("../pages/admin/PatientListView.vue"),
        meta: {
          title: "Data Pasien",
          requiresAuth: true,
          role: Role.ADMIN,
        },
      },
      {
        path: "admin/doctors",
        name: "admin-doctors",
        component: () => import("../pages/admin/DoctorListView.vue"),
        meta: {
          title: "Data Dokter",
          requiresAuth: true,
          role: Role.ADMIN,
        },
      },
      {
        path: "admin/users",
        name: "admin-users",
        component: () => import("../pages/admin/UserListView.vue"),
        meta: {
          title: "Kelola Akun Pengguna",
          requiresAuth: true,
          role: Role.ADMIN,
        },
      },
      {
        path: "admin/medicines",
        name: "admin-medicines",
        component: () => import("../pages/admin/MedicineListView.vue"),
        meta: {
          title: "Master Data Obat",
          requiresAuth: true,
          role: Role.ADMIN,
        },
      },
    ],
  },
];
