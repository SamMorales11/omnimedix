<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import Alert from "../../components/ui/Alert.vue";
import type { AdminUserItem, PaginatedUserResponse } from "@omnimedix/shared";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const toast = useToast();

// State Pengguna
const users = ref<AdminUserItem[]>([]);
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
});
const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref<string | null>(null);

// Filter & Search
const searchQuery = ref("");
const selectedRole = ref<"all" | "DOCTOR" | "PHARMACIST" | "ADMIN">("all");
const selectedActiveStatus = ref<"all" | "active" | "inactive">("all");

// Modal Buat Akun Baru
const isCreateModalOpen = ref(false);
const isCreating = ref(false);
const createFormError = ref<string | null>(null);
const createForm = ref({
  name: "",
  email: "",
  password: "",
  role: "DOCTOR" as "DOCTOR" | "PHARMACIST" | "ADMIN",
  isActive: true,
});
const createFieldErrors = ref<Record<string, string>>({});

// Modal Reset Password
const isResetModalOpen = ref(false);
const userToReset = ref<AdminUserItem | null>(null);
const isResetting = ref(false);
const resetPasswordInput = ref("");
const resetFormError = ref<string | null>(null);
const resetFieldError = ref<string | null>(null);

// Modal Ubah Status Aktif/Nonaktif
const isStatusModalOpen = ref(false);
const userToToggle = ref<AdminUserItem | null>(null);
const isUpdatingStatus = ref(false);

// Format tanggal
function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}

// Fetch daftar pengguna
async function fetchUsers(page = 1) {
  if (users.value.length === 0) {
    isLoading.value = true;
  } else {
    isRefreshing.value = true;
  }
  errorMessage.value = null;

  try {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "10");

    if (searchQuery.value.trim()) {
      params.set("search", searchQuery.value.trim());
    }

    if (selectedRole.value !== "all") {
      params.set("role", selectedRole.value);
    }

    if (selectedActiveStatus.value === "active") {
      params.set("isActive", "true");
    } else if (selectedActiveStatus.value === "inactive") {
      params.set("isActive", "false");
    }

    const res = await apiClient<ApiResponse<AdminUserItem[]>>(
      `/admin/users?${params.toString()}`,
    );

    if (res.success && res.data) {
      users.value = res.data;
      if (res.pagination) {
        pagination.value = res.pagination;
      }
    } else {
      throw new Error("Gagal mengambil data akun pengguna.");
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    errorMessage.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal memuat daftar akun pengguna. Silakan coba lagi.";
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

// Search debounce
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function onSearchInput() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchUsers(1);
  }, 350);
}

function onFilterChange() {
  fetchUsers(1);
}

// Modal Buat Akun
function openCreateModal() {
  createFormError.value = null;
  createFieldErrors.value = {};
  createForm.value = {
    name: "",
    email: "",
    password: "",
    role: "DOCTOR",
    isActive: true,
  };
  isCreateModalOpen.value = true;
}

function closeCreateModal() {
  if (isCreating.value) return;
  isCreateModalOpen.value = false;
  createFormError.value = null;
  createFieldErrors.value = {};
}

function validateCreateForm(): boolean {
  createFieldErrors.value = {};
  let valid = true;

  if (!createForm.value.name.trim()) {
    createFieldErrors.value["name"] = "Nama lengkap wajib diisi.";
    valid = false;
  } else if (createForm.value.name.trim().length < 2) {
    createFieldErrors.value["name"] = "Nama minimal 2 karakter.";
    valid = false;
  }

  if (!createForm.value.email.trim()) {
    createFieldErrors.value["email"] = "Alamat email wajib diisi.";
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.value.email.trim())) {
    createFieldErrors.value["email"] = "Format email tidak valid.";
    valid = false;
  }

  if (!createForm.value.password) {
    createFieldErrors.value["password"] = "Password wajib diisi.";
    valid = false;
  } else if (createForm.value.password.length < 6) {
    createFieldErrors.value["password"] = "Password minimal 6 karakter.";
    valid = false;
  }

  return valid;
}

async function handleCreateUser() {
  if (!validateCreateForm()) return;

  isCreating.value = true;
  createFormError.value = null;

  try {
    const res = await apiClient<ApiResponse<AdminUserItem>>("/admin/users", {
      method: "POST",
      body: {
        name: createForm.value.name.trim(),
        email: createForm.value.email.trim(),
        password: createForm.value.password,
        role: createForm.value.role,
        isActive: createForm.value.isActive,
      },
    });

    if (res.success && res.data) {
      toast.success(
        `Akun ${res.data.role} untuk '${res.data.name}' berhasil dibuat.`,
      );
      isCreateModalOpen.value = false;
      await fetchUsers(1);
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    createFormError.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal membuat akun pengguna baru.";
  } finally {
    isCreating.value = false;
  }
}

// Modal Reset Password
function openResetModal(user: AdminUserItem) {
  userToReset.value = user;
  resetPasswordInput.value = "";
  resetFormError.value = null;
  resetFieldError.value = null;
  isResetModalOpen.value = true;
}

function closeResetModal() {
  if (isResetting.value) return;
  isResetModalOpen.value = false;
  userToReset.value = null;
}

async function handleResetPassword() {
  if (!userToReset.value) return;

  resetFieldError.value = null;
  resetFormError.value = null;

  if (!resetPasswordInput.value || resetPasswordInput.value.length < 6) {
    resetFieldError.value = "Password baru minimal 6 karakter.";
    return;
  }

  isResetting.value = true;

  try {
    const res = await apiClient<ApiResponse<{ id: string }>>(
      `/admin/users/${userToReset.value.id}/password`,
      {
        method: "PATCH",
        body: {
          password: resetPasswordInput.value,
        },
      },
    );

    if (res.success) {
      toast.success(
        `Password untuk akun '${userToReset.value.email}' berhasil direset.`,
      );
      closeResetModal();
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    resetFormError.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal mereset password pengguna.";
  } finally {
    isResetting.value = false;
  }
}

// Modal Ubah Status
function openStatusModal(user: AdminUserItem) {
  userToToggle.value = user;
  isStatusModalOpen.value = true;
}

function closeStatusModal() {
  if (isUpdatingStatus.value) return;
  isStatusModalOpen.value = false;
  userToToggle.value = null;
}

async function handleConfirmToggleStatus() {
  if (!userToToggle.value) return;

  const targetStatus = !userToToggle.value.isActive;
  isUpdatingStatus.value = true;

  try {
    const res = await apiClient<ApiResponse<AdminUserItem>>(
      `/admin/users/${userToToggle.value.id}/status`,
      {
        method: "PATCH",
        body: {
          isActive: targetStatus,
        },
      },
    );

    if (res.success) {
      toast.success(
        `Akun '${userToToggle.value.name}' berhasil ${targetStatus ? "diaktifkan" : "dinonaktifkan"}.`,
      );
      closeStatusModal();
      await fetchUsers(pagination.value.page);
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    toast.error(
      errorObj.data?.error?.message ||
        errorObj.message ||
        "Gagal memperbarui status akun pengguna.",
    );
  } finally {
    isUpdatingStatus.value = false;
  }
}

onMounted(() => {
  fetchUsers(1);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5"
    >
      <div>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="primary" size="sm" dot>Administrator</Badge>
          <span class="text-xs text-slate-500 font-mono tracking-wider uppercase">Manajemen Akun</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Pengelolaan Akun Pengguna
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Kelola akun staf medis (Dokter & Apoteker), hak akses sistem, reset password, dan status aktif login.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          @click="openCreateModal"
          class="shadow-sm shadow-blue-500/20"
        >
          <svg
            class="h-4 w-4 sm:mr-1.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span class="font-medium">Buat Akun Baru</span>
        </Button>
      </div>
    </div>

    <!-- Toolbar Filter & Search -->
    <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4">
      <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Search Bar -->
        <div class="relative flex-1 max-w-md">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <svg
              class="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama pengguna atau alamat email..."
            @input="onSearchInput"
            class="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <!-- Filter Peran (Role) -->
          <select
            v-model="selectedRole"
            @change="onFilterChange"
            class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Semua Peran (Role)</option>
            <option value="DOCTOR">Dokter (DOCTOR)</option>
            <option value="PHARMACIST">Apoteker (PHARMACIST)</option>
            <option value="ADMIN">Administrator (ADMIN)</option>
          </select>

          <!-- Filter Status -->
          <select
            v-model="selectedActiveStatus"
            @change="onFilterChange"
            class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Akun Aktif</option>
            <option value="inactive">Akun Non-aktif</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            :disabled="isLoading || isRefreshing"
            @click="fetchUsers(pagination.page)"
            title="Muat ulang tabel"
            class="px-2.5"
          >
            <svg
              :class="['h-3.5 w-3.5', (isLoading || isRefreshing) && 'animate-spin']"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </Button>
        </div>
      </div>
    </Card>

    <!-- Error Alert -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Mengambil Data Akun"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
        <span>{{ errorMessage }}</span>
        <Button variant="danger" size="sm" @click="fetchUsers(1)">
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Loading Skeleton Table -->
    <Card v-if="isLoading" class="p-0 overflow-hidden">
      <div class="p-4 space-y-4">
        <Skeleton variant="text" width="25%" height="1.5rem" />
        <div class="space-y-3">
          <Skeleton v-for="i in 6" :key="i" height="3.2rem" variant="rounded" />
        </div>
      </div>
    </Card>

    <!-- Empty State -->
    <Card
      v-else-if="users.length === 0"
      class="p-12 text-center"
    >
      <EmptyState
        title="Tidak Ada Akun Pengguna"
        :description="
          searchQuery || selectedRole !== 'all' || selectedActiveStatus !== 'all'
            ? 'Tidak ditemukan akun yang sesuai dengan filter pencarian.'
            : 'Belum ada akun pengguna staf medis terdaftar dalam sistem.'
        "
      >
        <template #action>
          <Button
            v-if="searchQuery || selectedRole !== 'all' || selectedActiveStatus !== 'all'"
            variant="outline"
            size="sm"
            @click="searchQuery = ''; selectedRole = 'all'; selectedActiveStatus = 'all'; fetchUsers(1)"
          >
            Reset Filter
          </Button>
          <Button
            v-else
            variant="primary"
            size="sm"
            @click="openCreateModal"
          >
            + Buat Akun Pengguna Pertama
          </Button>
        </template>
      </EmptyState>
    </Card>

    <!-- Data Table -->
    <Card v-else class="relative p-0 overflow-hidden border border-slate-800/80 bg-slate-900/70 backdrop-blur-sm">
      <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-2xs border-b border-slate-800">
            <tr>
              <th scope="col" class="py-3.5 px-4 sm:px-6">Nama Pengguna</th>
              <th scope="col" class="py-3.5 px-4">Email Akun</th>
              <th scope="col" class="py-3.5 px-4">Peran (Role)</th>
              <th scope="col" class="py-3.5 px-4">Status Akun</th>
              <th scope="col" class="py-3.5 px-4">Dibuat Pada</th>
              <th scope="col" class="py-3.5 px-4 text-right sm:pr-6">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 bg-slate-900/40">
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-slate-800/30 transition-colors group"
            >
              <!-- Nama -->
              <td class="py-3.5 px-4 sm:px-6">
                <div class="font-medium text-slate-100 text-sm">
                  {{ user.name }}
                </div>
              </td>

              <!-- Email -->
              <td class="py-3.5 px-4 font-mono text-slate-300">
                {{ user.email }}
              </td>

              <!-- Role -->
              <td class="py-3.5 px-4">
                <Badge
                  :variant="
                    user.role === 'ADMIN'
                      ? 'danger'
                      : user.role === 'DOCTOR'
                      ? 'primary'
                      : 'info'
                  "
                  size="sm"
                  class="font-mono text-2xs"
                >
                  {{ user.role }}
                </Badge>
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4">
                <Badge
                  :variant="user.isActive ? 'success' : 'default'"
                  size="sm"
                  :dot="true"
                >
                  {{ user.isActive ? "Aktif" : "Non-aktif" }}
                </Badge>
              </td>

              <!-- Dibuat Pada -->
              <td class="py-3.5 px-4 text-slate-400">
                {{ formatDate(user.createdAt) }}
              </td>

              <!-- Aksi -->
              <td class="py-3.5 px-4 text-right sm:pr-6">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Reset Password -->
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openResetModal(user)"
                    class="h-8 px-2.5 text-slate-400 hover:text-amber-400 hover:bg-amber-950/40"
                    title="Reset password akun"
                  >
                    <svg
                      class="h-3.5 w-3.5 mr-1"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                      />
                    </svg>
                    Reset Password
                  </Button>

                  <!-- Toggle Status Aktif/Nonaktif -->
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openStatusModal(user)"
                    :class="[
                      'h-8 px-2.5 transition-colors',
                      user.isActive
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40',
                    ]"
                    :title="user.isActive ? 'Nonaktifkan akun' : 'Aktifkan akun'"
                  >
                    <span v-if="user.isActive" class="flex items-center gap-1">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Nonaktifkan
                    </span>
                    <span v-else class="flex items-center gap-1">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Aktifkan
                    </span>
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/40 gap-3"
      >
        <div class="text-xs text-slate-400">
          Menampilkan
          <span class="font-semibold text-slate-200">
            {{ (pagination.page - 1) * pagination.limit + 1 }}
          </span>
          -
          <span class="font-semibold text-slate-200">
            {{ Math.min(pagination.page * pagination.limit, pagination.total) }}
          </span>
          dari
          <span class="font-semibold text-slate-200">{{ pagination.total }}</span>
          akun
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!pagination.hasPrevPage || isLoading"
            @click="fetchUsers(pagination.page - 1)"
          >
            Sebelumnya
          </Button>

          <span class="text-xs font-medium text-slate-400 px-2">
            Hal. {{ pagination.page }} dari {{ pagination.totalPages }}
          </span>

          <Button
            variant="outline"
            size="sm"
            :disabled="!pagination.hasNextPage || isLoading"
            @click="fetchUsers(pagination.page + 1)"
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </Card>

    <!-- Modal Buat Akun Baru -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isCreateModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
        @click.self="closeCreateModal"
      >
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 my-8">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>

          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 class="text-base font-semibold text-slate-100">
                Buat Akun Staf Baru
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                Daftarkan akun login untuk Dokter, Apoteker, atau Administrator.
              </p>
            </div>
            <button
              @click="closeCreateModal"
              class="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Alert Error -->
          <Alert v-if="createFormError" variant="danger" class="mt-4">
            {{ createFormError }}
          </Alert>

          <!-- Form Body -->
          <form @submit.prevent="handleCreateUser" class="space-y-4 mt-5">
            <!-- Nama Lengkap -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Nama Lengkap <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="createForm.name"
                type="text"
                placeholder="Contoh: dr. Budi Santoso / Apt. Rina"
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                :class="createFieldErrors['name'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
              />
              <p v-if="createFieldErrors['name']" class="text-2xs text-rose-400 mt-1">
                {{ createFieldErrors['name'] }}
              </p>
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Email Login <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="createForm.email"
                type="email"
                placeholder="staf@omnimedix.id"
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                :class="createFieldErrors['email'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
              />
              <p v-if="createFieldErrors['email']" class="text-2xs text-rose-400 mt-1">
                {{ createFieldErrors['email'] }}
              </p>
            </div>

            <!-- Password -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Password Login Awal <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="createForm.password"
                type="password"
                placeholder="Minimal 6 karakter"
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                :class="createFieldErrors['password'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
              />
              <p v-if="createFieldErrors['password']" class="text-2xs text-rose-400 mt-1">
                {{ createFieldErrors['password'] }}
              </p>
            </div>

            <!-- Role Selection -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Peran Akses (Role) <span class="text-rose-400">*</span>
              </label>
              <select
                v-model="createForm.role"
                class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="DOCTOR">Dokter (DOCTOR)</option>
                <option value="PHARMACIST">Apoteker (PHARMACIST)</option>
                <option value="ADMIN">Administrator (ADMIN)</option>
              </select>
              <p class="text-2xs text-slate-400 mt-1">
                {{
                  createForm.role === 'DOCTOR'
                    ? 'Memiliki akses ke Konsol Dokter, antrean pasien, dan pembuatan resep.'
                    : createForm.role === 'PHARMACIST'
                    ? 'Memiliki akses ke Konsol Farmasi, peracikan obat, dan stok obat.'
                    : 'Memiliki akses penuh ke panel master data dan manajemen sistem.'
                }}
              </p>
            </div>

            <!-- Status Aktif -->
            <div class="pt-2">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  v-model="createForm.isActive"
                  type="checkbox"
                  class="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500/40 h-4 w-4"
                />
                <span class="text-xs font-medium text-slate-300">
                  Status Akun Langsung Aktif
                </span>
              </label>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 pt-5 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="isCreating"
                @click="closeCreateModal"
              >
                Batal
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                :disabled="isCreating"
              >
                <span v-if="isCreating" class="flex items-center gap-1.5">
                  <svg class="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Menyimpan...
                </span>
                <span v-else>Buat Akun</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Modal Reset Password -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isResetModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        @click.self="closeResetModal"
      >
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-amber-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-amber-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-amber-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-amber-500/40 select-none pointer-events-none">+</div>

          <div class="flex items-center gap-3 text-amber-400 mb-3">
            <div class="p-2 rounded-lg bg-amber-950/50 border border-amber-800/80">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-100">
                Reset Password Pengguna
              </h3>
              <p class="text-xs text-slate-400">
                Akun: <span class="text-slate-200 font-mono">{{ userToReset?.email }}</span>
              </p>
            </div>
          </div>

          <Alert v-if="resetFormError" variant="danger" class="mb-4">
            {{ resetFormError }}
          </Alert>

          <form @submit.prevent="handleResetPassword" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Password Baru <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="resetPasswordInput"
                type="password"
                placeholder="Masukkan password baru (min. 6 karakter)"
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                :class="resetFieldError ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-amber-500'"
              />
              <p v-if="resetFieldError" class="text-2xs text-rose-400 mt-1">
                {{ resetFieldError }}
              </p>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="isResetting"
                @click="closeResetModal"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                :disabled="isResetting"
              >
                <span v-if="isResetting">Mereset...</span>
                <span v-else>Simpan Password Baru</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Modal Konfirmasi Status (Aktif / Nonaktifkan) -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isStatusModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        @click.self="closeStatusModal"
      >
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>

          <div class="flex items-center gap-3 mb-3" :class="userToToggle?.isActive ? 'text-rose-400' : 'text-emerald-400'">
            <div
              class="p-2 rounded-lg border"
              :class="userToToggle?.isActive ? 'bg-rose-950/50 border-rose-800/80' : 'bg-emerald-950/50 border-emerald-800/80'"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-100">
              {{ userToToggle?.isActive ? "Nonaktifkan Akun Pengguna?" : "Aktifkan Akun Pengguna?" }}
            </h3>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed mb-4">
            Apakah Anda yakin ingin
            <span class="font-bold text-slate-100">
              {{ userToToggle?.isActive ? "menonaktifkan" : "mengaktifkan" }}
            </span>
            akun
            <span class="font-bold text-slate-100">
              {{ userToToggle?.name }}
            </span>
            ({{ userToToggle?.email }})?
            <span v-if="userToToggle?.isActive" class="block mt-1 text-slate-400">
              Pengguna tidak akan dapat masuk ke sistem selama berstatus non-aktif.
            </span>
          </p>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              :disabled="isUpdatingStatus"
              @click="closeStatusModal"
            >
              Batal
            </Button>
            <Button
              :variant="userToToggle?.isActive ? 'danger' : 'primary'"
              size="sm"
              :disabled="isUpdatingStatus"
              @click="handleConfirmToggleStatus"
            >
              <span v-if="isUpdatingStatus">Memproses...</span>
              <span v-else>
                {{ userToToggle?.isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan" }}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
