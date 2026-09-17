import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Role } from "@omnimedix/shared";
import { apiClient } from "../utils/api";

export interface DoctorProfile {
  id: string;
  poliId: string;
  specialization: string;
  isActive: boolean;
}

export interface AuthStateUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  doctorProfile?: DoctorProfile | null;
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

const STORAGE_TOKEN_KEY = "omnimedix_token";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem(STORAGE_TOKEN_KEY));
  const user = ref<AuthStateUser | null>(null);
  const isLoading = ref<boolean>(false);
  const isInitialized = ref<boolean>(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const userRole = computed(() => user.value?.role ?? null);

  /**
   * Login with email and password
   */
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
        localStorage.setItem(STORAGE_TOKEN_KEY, response.data.token);
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
        "Login gagal. Periksa kembali email dan kata sandi Anda.";
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetch current authenticated user profile
   */
  async function fetchMe(): Promise<AuthStateUser | null> {
    if (!token.value) {
      user.value = null;
      return null;
    }

    isLoading.value = true;
    try {
      const response = await apiClient<MeResponse>("/auth/me");
      if (response.success && response.data.user) {
        user.value = response.data.user;
        return response.data.user;
      }
      logout();
      return null;
    } catch {
      logout();
      return null;
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  /**
   * Initialize auth state on application startup
   */
  async function initAuth(): Promise<void> {
    if (isInitialized.value) return;

    if (token.value) {
      await fetchMe();
    } else {
      isInitialized.value = true;
    }
  }

  /**
   * Clear authentication state and tokens
   */
  function logout(): void {
    token.value = null;
    user.value = null;
    error.value = null;
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }

  return {
    token,
    user,
    isLoading,
    isInitialized,
    error,
    isAuthenticated,
    userRole,
    login,
    fetchMe,
    fetchCurrentUser: fetchMe,
    initAuth,
    logout,
  };
});
