import { useAuthStore } from "../stores/auth";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";

export function useAuth() {
  const authStore = useAuthStore();
  const { user, token, isLoading, error, isAuthenticated, userRole } =
    storeToRefs(authStore);
  const router = useRouter();

  async function handleLogout() {
    authStore.logout();
    await router.push("/auth/login");
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    userRole,
    login: authStore.login,
    fetchCurrentUser: authStore.fetchCurrentUser,
    logout: authStore.logout,
    handleLogout,
  };
}
