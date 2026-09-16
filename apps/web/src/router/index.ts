import { createRouter, createWebHistory } from "vue-router";
import { routes } from "./routes";
import { useAuthStore } from "../stores/auth";
import { Role } from "@omnimedix/shared";

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Set document title
  const pageTitle = to.meta["title"] as string | undefined;
  document.title = pageTitle
    ? `${pageTitle} | Omnimedix`
    : "Omnimedix Medical System";

  // Load user profile if token is present
  if (authStore.token && !authStore.user) {
    await authStore.fetchCurrentUser();
  }

  // Check authentication requirement
  if (to.meta["requiresAuth"]) {
    if (!authStore.isAuthenticated) {
      return next({
        path: "/auth/login",
        query: { redirect: to.fullPath },
      });
    }

    // Role-based navigation check (placeholder)
    const requiredRole = to.meta["role"] as Role | undefined;
    if (
      requiredRole &&
      authStore.userRole &&
      requiredRole !== authStore.userRole
    ) {
      // Super admin can access all dashboards
      if (authStore.userRole !== Role.ADMIN) {
        // Redirect to their respective authorized dashboard
        if (authStore.userRole === Role.PHARMACIST) return next("/pharmacist");
        if (authStore.userRole === Role.DOCTOR) return next("/doctor");
      }
    }
  }

  // Redirect authenticated user away from login
  if (to.path === "/auth/login" && authStore.isAuthenticated) {
    if (authStore.userRole === Role.ADMIN) return next("/admin");
    if (authStore.userRole === Role.PHARMACIST) return next("/pharmacist");
    return next("/doctor");
  }

  next();
});

export default router;
