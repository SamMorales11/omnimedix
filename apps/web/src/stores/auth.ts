import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Role } from "@omnimedix/shared";
import { apiClient } from "../utils/api";

export interface AuthStateUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: AuthStateUser;
  };
}

interface MeResponse {
  success: boolean;
  data: {
    user: AuthStateUser;
  };
}

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("omnimedix_token"));
  const user = ref<AuthStateUser | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const userRole = computed(() => user.value?.role ?? null);

  async function login(email: string, password: string): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await apiClient<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (response.success && response.data.token) {
        token.value = response.data.token;
        user.value = response.data.user;
        localStorage.setItem("omnimedix_token", response.data.token);
        return true;
      }
      return false;
    } catch (err: unknown) {
      const fetchError = err as {
        data?: { message?: string; error?: { message?: string } };
        message?: string;
      };
      error.value =
        fetchError.data?.error?.message ||
        fetchError.data?.message ||
        fetchError.message ||
        "Login gagal. Cek kembali kredensial.";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser(): Promise<void> {
    if (!token.value) return;

    isLoading.value = true;
    try {
      const response = await apiClient<MeResponse>("/auth/me");
      if (response.success && response.data.user) {
        user.value = response.data.user;
      }
    } catch {
      logout();
    } finally {
      isLoading.value = false;
    }
  }

  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem("omnimedix_token");
  }

  return {
    token,
    user,
    isLoading,
    error,
    isAuthenticated,
    userRole,
    login,
    fetchCurrentUser,
    logout,
  };
});
