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

  // Initialize auth on startup if not yet done
  if (!authStore.isInitialized) {
    await authStore.initAuth();
  }

  // 1. If route is guestOnly (e.g. /auth/login) and user is already logged in -> redirect to role dashboard
  if (to.meta["guestOnly"] && authStore.isAuthenticated) {
    if (authStore.userRole === Role.ADMIN) return next("/admin");
    if (authStore.userRole === Role.PHARMACIST) return next("/pharmacist");
    if (authStore.userRole === Role.DOCTOR) return next("/doctor");
    return next("/");
  }

  // 2. Check if route requires authentication
  if (to.matched.some((record) => record.meta["requiresAuth"])) {
    if (!authStore.isAuthenticated) {
      return next({
        path: "/auth/login",
        query: { redirect: to.fullPath },
      });
    }

    // 3. Check role authorization
    const requiredRole = to.meta["role"] as Role | undefined;
    if (requiredRole && authStore.userRole) {
      // Super admin can inspect all dashboards
      if (
        authStore.userRole !== Role.ADMIN &&
        authStore.userRole !== requiredRole
      ) {
        if (authStore.userRole === Role.DOCTOR) return next("/doctor");
        if (authStore.userRole === Role.PHARMACIST) return next("/pharmacist");
        return next("/");
      }
    }
  }

  next();
});

export default router;
