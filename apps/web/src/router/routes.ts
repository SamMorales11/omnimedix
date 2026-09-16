import type { RouteRecordRaw } from "vue-router";
import { Role } from "@omnimedix/shared";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: () => import("../layouts/PublicLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("../pages/public/LandingPage.vue"),
        meta: { title: "Beranda" },
      },
      {
        path: ":pathMatch(.*)*",
        name: "not-found",
        component: () => import("../pages/public/NotFoundPage.vue"),
        meta: { title: "404 - Halaman Tidak Ditemukan" },
      },
    ],
  },
  {
    path: "/auth",
    component: () => import("../layouts/AuthLayout.vue"),
    children: [
      {
        path: "login",
        name: "login",
        component: () => import("../pages/auth/LoginPage.vue"),
        meta: { title: "Masuk Portal" },
      },
    ],
  },
  {
    path: "/",
    component: () => import("../layouts/DashboardLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "doctor",
        name: "doctor-dashboard",
        component: () => import("../pages/doctor/DoctorDashboard.vue"),
        meta: {
          title: "Konsol Dokter",
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
