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
        name: "pharmacist-dashboard",
        component: () => import("../pages/pharmacist/PharmacistDashboard.vue"),
        meta: {
          title: "Konsol Farmasi",
          requiresAuth: true,
          role: Role.PHARMACIST,
        },
      },
      {
        path: "admin",
        name: "admin-dashboard",
        component: () => import("../pages/admin/AdminDashboard.vue"),
        meta: {
          title: "Panel Admin",
          requiresAuth: true,
          role: Role.ADMIN,
        },
      },
    ],
  },
];
