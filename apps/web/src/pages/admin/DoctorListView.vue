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
import type { AdminDoctorItem, PaginatedDoctorResponse } from "@omnimedix/shared";

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

interface PoliOption {
  id: string;
  name: string;
  description?: string | null;
}

const toast = useToast();

// State Dokter
const doctors = ref<AdminDoctorItem[]>([]);
const polis = ref<PoliOption[]>([]);
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

// State Filter & Search
const searchQuery = ref("");
const selectedPoliId = ref<string>("all");
const selectedActiveStatus = ref<"all" | "active" | "inactive">("all");

// Modal Tambah / Edit Dokter
const isFormModalOpen = ref(false);
const isEditing = ref(false);
const editingDoctorId = ref<string | null>(null);
const isSubmitting = ref(false);
const formError = ref<string | null>(null);

// Form Data
const formData = ref({
  name: "",
  email: "",
  password: "",
  poliId: "",
  specialization: "",
  isActive: true,
});

// Form Field Errors
const formFieldErrors = ref<Record<string, string>>({});

// Modal Konfirmasi Ubah Status
const isStatusModalOpen = ref(false);
const doctorToToggle = ref<AdminDoctorItem | null>(null);
const isUpdatingStatus = ref(false);

// Format tanggal standar Indonesia
function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

// Ambil daftar poliklinik aktif untuk pilihan dropdown
async function fetchPolis() {
  try {
    const res = await apiClient<ApiResponse<PoliOption[]>>("/public/polis");
    if (res.success && res.data) {
      polis.value = res.data;
    }
  } catch (err) {
    console.error("Gagal mengambil data poliklinik:", err);
  }
}

// Fetch daftar dokter dari backend
async function fetchDoctors(page = 1) {
  if (doctors.value.length === 0) {
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

    if (selectedPoliId.value !== "all") {
      params.set("poliId", selectedPoliId.value);
    }

    if (selectedActiveStatus.value === "active") {
      params.set("isActive", "true");
    } else if (selectedActiveStatus.value === "inactive") {
      params.set("isActive", "false");
    }

    const res = await apiClient<ApiResponse<AdminDoctorItem[]>>(
      `/admin/doctors?${params.toString()}`,
    );

    if (res.success && res.data) {
      doctors.value = res.data;
      if (res.pagination) {
        pagination.value = res.pagination;
      }
    } else {
      throw new Error("Gagal menerima daftar dokter.");
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    errorMessage.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal memuat daftar dokter. Silakan coba lagi.";
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

// Handler Search & Filter
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchDoctors(1);
  }, 350);
}

function onFilterChange() {
  fetchDoctors(1);
}

// Buka Modal Tambah Dokter
function openAddModal() {
  isEditing.value = false;
  editingDoctorId.value = null;
  formError.value = null;
  formFieldErrors.value = {};
  formData.value = {
    name: "",
    email: "",
    password: "",
    poliId: polis.value[0]?.id || "",
    specialization: "",
    isActive: true,
  };
  isFormModalOpen.value = true;
}

// Buka Modal Edit Dokter
function openEditModal(doctor: AdminDoctorItem) {
  isEditing.value = true;
  editingDoctorId.value = doctor.id;
  formError.value = null;
  formFieldErrors.value = {};
  formData.value = {
    name: doctor.name,
    email: doctor.email,
    password: "", // Kosongkan jika tidak diubah
    poliId: doctor.poliId,
    specialization: doctor.specialization,
    isActive: doctor.isActive,
  };
  isFormModalOpen.value = true;
}

// Tutup Modal Form
function closeFormModal() {
  if (isSubmitting.value) return;
  isFormModalOpen.value = false;
  formError.value = null;
  formFieldErrors.value = {};
}

// Validasi Form Dokter
function validateForm(): boolean {
  formFieldErrors.value = {};
  let valid = true;

  if (!formData.value.name.trim()) {
    formFieldErrors.value["name"] = "Nama dokter wajib diisi.";
    valid = false;
  } else if (formData.value.name.trim().length < 2) {
    formFieldErrors.value["name"] = "Nama minimal 2 karakter.";
    valid = false;
  }

  if (!formData.value.email.trim()) {
    formFieldErrors.value["email"] = "Email akun dokter wajib diisi.";
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email.trim())) {
    formFieldErrors.value["email"] = "Format email tidak valid.";
    valid = false;
  }

  if (!isEditing.value) {
    if (!formData.value.password) {
      formFieldErrors.value["password"] = "Password akun baru wajib diisi.";
      valid = false;
    } else if (formData.value.password.length < 6) {
      formFieldErrors.value["password"] = "Password minimal 6 karakter.";
      valid = false;
    }
  } else {
    if (formData.value.password && formData.value.password.length < 6) {
      formFieldErrors.value["password"] = "Password baru minimal 6 karakter.";
      valid = false;
    }
  }

  if (!formData.value.poliId) {
    formFieldErrors.value["poliId"] = "Poliklinik wajib dipilih.";
    valid = false;
  }

  if (!formData.value.specialization.trim()) {
    formFieldErrors.value["specialization"] = "Spesialisasi dokter wajib diisi.";
    valid = false;
  }

  return valid;
}

// Submit Form Tambah / Edit Dokter
async function handleSubmitForm() {
  if (!validateForm()) return;

  isSubmitting.value = true;
  formError.value = null;

  try {
    if (isEditing.value && editingDoctorId.value) {
      // Update Dokter
      const payload: Record<string, unknown> = {
        name: formData.value.name.trim(),
        email: formData.value.email.trim(),
        poliId: formData.value.poliId,
        specialization: formData.value.specialization.trim(),
        isActive: formData.value.isActive,
      };

      if (formData.value.password.trim()) {
        payload["password"] = formData.value.password.trim();
      }

      const res = await apiClient<ApiResponse<AdminDoctorItem>>(
        `/admin/doctors/${editingDoctorId.value}`,
        {
          method: "PUT",
          body: payload,
        },
      );

      if (res.success && res.data) {
        toast.success(`Data dokter '${res.data.name}' berhasil diperbarui.`);
        isFormModalOpen.value = false;
        await fetchDoctors(pagination.value.page);
      }
    } else {
      // Tambah Dokter Baru
      const payload = {
        name: formData.value.name.trim(),
        email: formData.value.email.trim(),
        password: formData.value.password,
        poliId: formData.value.poliId,
        specialization: formData.value.specialization.trim(),
        isActive: formData.value.isActive,
      };

      const res = await apiClient<ApiResponse<AdminDoctorItem>>(
        "/admin/doctors",
        {
          method: "POST",
          body: payload,
        },
      );

      if (res.success && res.data) {
        toast.success(`Dokter '${res.data.name}' berhasil didaftarkan.`);
        isFormModalOpen.value = false;
        await fetchDoctors(1);
      }
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    formError.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Terjadi kesalahan saat menyimpan data dokter.";
  } finally {
    isSubmitting.value = false;
  }
}

// Buka Modal Konfirmasi Status
function openStatusModal(doctor: AdminDoctorItem) {
  doctorToToggle.value = doctor;
  isStatusModalOpen.value = true;
}

// Tutup Modal Konfirmasi Status
function closeStatusModal() {
  if (isUpdatingStatus.value) return;
  isStatusModalOpen.value = false;
  doctorToToggle.value = null;
}

// Eksekusi Ubah Status Aktif/Nonaktif
async function handleConfirmToggleStatus() {
  if (!doctorToToggle.value) return;

  const targetStatus = !doctorToToggle.value.isActive;
  isUpdatingStatus.value = true;

  try {
    const res = await apiClient<ApiResponse<AdminDoctorItem>>(
      `/admin/doctors/${doctorToToggle.value.id}/status`,
      {
        method: "PATCH",
        body: {
          isActive: targetStatus,
        },
      },
    );

    if (res.success) {
      toast.success(
        `Dokter '${doctorToToggle.value.name}' berhasil diubah menjadi ${targetStatus ? "aktif" : "non-aktif"}.`,
      );
      closeStatusModal();
      await fetchDoctors(pagination.value.page);
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    toast.error(
      errorObj.data?.error?.message ||
        errorObj.message ||
        "Gagal mengubah status dokter.",
    );
  } finally {
    isUpdatingStatus.value = false;
  }
}

onMounted(async () => {
  await Promise.all([fetchPolis(), fetchDoctors(1)]);
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
          <span class="text-xs text-slate-500 font-mono tracking-wider uppercase">Master Dokter</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Manajemen Data Dokter
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Kelola profil dokter praktik, akun login, penugasan poliklinik, dan spesialisasi medis klinik.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          @click="openAddModal"
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
          <span class="font-medium">Tambah Dokter Baru</span>
        </Button>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
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
            placeholder="Cari nama dokter, email, atau spesialisasi..."
            @input="onSearchInput"
            class="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <!-- Filter Poliklinik -->
          <select
            v-model="selectedPoliId"
            @change="onFilterChange"
            class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Semua Poliklinik</option>
            <option v-for="poli in polis" :key="poli.id" :value="poli.id">
              {{ poli.name }}
            </option>
          </select>

          <!-- Filter Status -->
          <select
            v-model="selectedActiveStatus"
            @change="onFilterChange"
            class="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="active">Dokter Aktif</option>
            <option value="inactive">Dokter Non-aktif</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            :disabled="isLoading || isRefreshing"
            @click="fetchDoctors(pagination.page)"
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
      title="Gagal Mengambil Data Dokter"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
        <span>{{ errorMessage }}</span>
        <Button variant="danger" size="sm" @click="fetchDoctors(1)">
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Loading Skeleton Table -->
    <Card v-if="isLoading" class="p-0 overflow-hidden">
      <div class="p-4 space-y-4">
        <Skeleton variant="text" width="30%" height="1.5rem" />
        <div class="space-y-3">
          <Skeleton v-for="i in 5" :key="i" height="3.2rem" variant="rounded" />
        </div>
      </div>
    </Card>

    <!-- Empty State -->
    <Card
      v-else-if="doctors.length === 0"
      class="p-12 text-center"
    >
      <EmptyState
        title="Tidak Ada Data Dokter"
        :description="
          searchQuery || selectedPoliId !== 'all' || selectedActiveStatus !== 'all'
            ? 'Tidak ditemukan dokter yang sesuai dengan filter pencarian.'
            : 'Belum ada data dokter terdaftar dalam sistem klinik.'
        "
      >
        <template #action>
          <Button
            v-if="searchQuery || selectedPoliId !== 'all' || selectedActiveStatus !== 'all'"
            variant="outline"
            size="sm"
            @click="searchQuery = ''; selectedPoliId = 'all'; selectedActiveStatus = 'all'; fetchDoctors(1)"
          >
            Reset Filter
          </Button>
          <Button
            v-else
            variant="primary"
            size="sm"
            @click="openAddModal"
          >
            + Daftarkan Dokter Pertama
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
              <th scope="col" class="py-3.5 px-4 sm:px-6">Dokter & Akun</th>
              <th scope="col" class="py-3.5 px-4">Poliklinik</th>
              <th scope="col" class="py-3.5 px-4">Spesialisasi</th>
              <th scope="col" class="py-3.5 px-4">Status</th>
              <th scope="col" class="py-3.5 px-4">Bergabung</th>
              <th scope="col" class="py-3.5 px-4 text-right sm:pr-6">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 bg-slate-900/40">
            <tr
              v-for="doctor in doctors"
              :key="doctor.id"
              class="hover:bg-slate-800/30 transition-colors group"
            >
              <!-- Dokter & Akun -->
              <td class="py-3.5 px-4 sm:px-6">
                <div class="font-semibold text-slate-100 text-sm">
                  {{ doctor.name }}
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  {{ doctor.email }}
                </div>
              </td>

              <!-- Poliklinik -->
              <td class="py-3.5 px-4">
                <Badge variant="primary" size="sm">
                  {{ doctor.poli.name }}
                </Badge>
              </td>

              <!-- Spesialisasi -->
              <td class="py-3.5 px-4 text-slate-200">
                {{ doctor.specialization }}
              </td>

              <!-- Status -->
              <td class="py-3.5 px-4">
                <Badge
                  :variant="doctor.isActive ? 'success' : 'default'"
                  size="sm"
                  :dot="true"
                >
                  {{ doctor.isActive ? "Aktif Praktik" : "Non-aktif" }}
                </Badge>
              </td>

              <!-- Bergabung -->
              <td class="py-3.5 px-4 text-slate-400">
                {{ formatDate(doctor.createdAt) }}
              </td>

              <!-- Aksi -->
              <td class="py-3.5 px-4 text-right sm:pr-6">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Tombol Edit -->
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openEditModal(doctor)"
                    class="h-8 px-2.5 text-slate-400 hover:text-blue-400 hover:bg-blue-950/40"
                    title="Ubah data dokter"
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
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
                      />
                    </svg>
                    Edit
                  </Button>

                  <!-- Tombol Toggle Status -->
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="openStatusModal(doctor)"
                    :class="[
                      'h-8 px-2.5 transition-colors',
                      doctor.isActive
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                        : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40',
                    ]"
                    :title="doctor.isActive ? 'Nonaktifkan dokter' : 'Aktifkan dokter'"
                  >
                    <span v-if="doctor.isActive" class="flex items-center gap-1">
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
          dokter
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!pagination.hasPrevPage || isLoading"
            @click="fetchDoctors(pagination.page - 1)"
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
            @click="fetchDoctors(pagination.page + 1)"
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </Card>

    <!-- Modal Form Tambah / Edit Dokter -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isFormModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
        @click.self="closeFormModal"
      >
        <div class="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 my-8">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>

          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 class="text-base font-semibold text-slate-100">
                {{ isEditing ? "Perbarui Profil Dokter" : "Daftarkan Dokter Baru" }}
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                {{
                  isEditing
                    ? "Perbarui akun, poliklinik penugasan, atau spesialisasi medis."
                    : "Buat akun login sistem sekaligus profil tenaga medis dokter."
                }}
              </p>
            </div>
            <button
              @click="closeFormModal"
              class="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Alert Error Form -->
          <Alert v-if="formError" variant="danger" class="mt-4">
            {{ formError }}
          </Alert>

          <!-- Form Body -->
          <form @submit.prevent="handleSubmitForm" class="space-y-4 mt-5">
            <!-- Nama Dokter -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Nama Lengkap Dokter <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="Contoh: dr. Sarah Wijaya, Sp.PD"
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                :class="formFieldErrors['name'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
              />
              <p v-if="formFieldErrors['name']" class="text-2xs text-rose-400 mt-1">
                {{ formFieldErrors['name'] }}
              </p>
            </div>

            <!-- Email & Password Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Email Akun -->
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">
                  Email Akun Login <span class="text-rose-400">*</span>
                </label>
                <input
                  v-model="formData.email"
                  type="email"
                  placeholder="dokter@omnimedix.id"
                  class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  :class="formFieldErrors['email'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
                />
                <p v-if="formFieldErrors['email']" class="text-2xs text-rose-400 mt-1">
                  {{ formFieldErrors['email'] }}
                </p>
              </div>

              <!-- Password -->
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">
                  {{ isEditing ? "Ganti Password Baru" : "Password Login" }}
                  <span v-if="!isEditing" class="text-rose-400">*</span>
                </label>
                <input
                  v-model="formData.password"
                  type="password"
                  :placeholder="isEditing ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'"
                  class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  :class="formFieldErrors['password'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
                />
                <p v-if="formFieldErrors['password']" class="text-2xs text-rose-400 mt-1">
                  {{ formFieldErrors['password'] }}
                </p>
              </div>
            </div>

            <!-- Poliklinik Penugasan -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Poliklinik Penugasan <span class="text-rose-400">*</span>
              </label>
              <select
                v-model="formData.poliId"
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 focus:outline-none transition-colors cursor-pointer"
                :class="formFieldErrors['poliId'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
              >
                <option value="" disabled>Pilih Poliklinik</option>
                <option v-for="poli in polis" :key="poli.id" :value="poli.id">
                  {{ poli.name }}
                </option>
              </select>
              <p v-if="formFieldErrors['poliId']" class="text-2xs text-rose-400 mt-1">
                {{ formFieldErrors['poliId'] }}
              </p>
            </div>

            <!-- Spesialisasi Medis -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Spesialisasi Medis <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="formData.specialization"
                type="text"
                placeholder="Contoh: Dokter Umum, Spesialis Jantung, dll."
                class="w-full px-3 py-2 bg-slate-950 border rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                :class="formFieldErrors['specialization'] ? 'border-rose-500 focus:border-rose-500' : 'border-slate-800 focus:border-blue-500'"
              />
              <p v-if="formFieldErrors['specialization']" class="text-2xs text-rose-400 mt-1">
                {{ formFieldErrors['specialization'] }}
              </p>
            </div>

            <!-- Status Aktif Praktik -->
            <div class="pt-2">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  v-model="formData.isActive"
                  type="checkbox"
                  class="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-blue-500/40 h-4 w-4"
                />
                <span class="text-xs font-medium text-slate-300">
                  Status Dokter Aktif Praktik
                </span>
              </label>
              <p class="text-2xs text-slate-500 ml-6 mt-0.5">
                Dokter aktif dapat menerima antrean kunjungan pasien dan membuat resep obat.
              </p>
            </div>

            <!-- Modal Footer -->
            <div class="flex items-center justify-end gap-3 pt-5 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="isSubmitting"
                @click="closeFormModal"
              >
                Batal
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting" class="flex items-center gap-1.5">
                  <svg class="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Menyimpan...
                </span>
                <span v-else>
                  {{ isEditing ? "Simpan Perubahan" : "Daftarkan Dokter" }}
                </span>
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

          <div class="flex items-center gap-3 mb-3" :class="doctorToToggle?.isActive ? 'text-rose-400' : 'text-emerald-400'">
            <div
              class="p-2 rounded-lg border"
              :class="doctorToToggle?.isActive ? 'bg-rose-950/50 border-rose-800/80' : 'bg-emerald-950/50 border-emerald-800/80'"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-100">
              {{ doctorToToggle?.isActive ? "Nonaktifkan Dokter?" : "Aktifkan Dokter?" }}
            </h3>
          </div>

          <p class="text-xs text-slate-300 leading-relaxed mb-4">
            Apakah Anda yakin ingin
            <span class="font-bold text-slate-100">
              {{ doctorToToggle?.isActive ? "menonaktifkan" : "mengaktifkan" }}
            </span>
            dokter
            <span class="font-bold text-slate-100">
              {{ doctorToToggle?.name }}
            </span>
            ({{ doctorToToggle?.poli.name }})?
            <span v-if="doctorToToggle?.isActive" class="block mt-1 text-slate-400">
              Dokter tidak dapat menerima antrean baru selama berstatus non-aktif.
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
              :variant="doctorToToggle?.isActive ? 'danger' : 'primary'"
              size="sm"
              :disabled="isUpdatingStatus"
              @click="handleConfirmToggleStatus"
            >
              <span v-if="isUpdatingStatus">Memproses...</span>
              <span v-else>
                {{ doctorToToggle?.isActive ? "Ya, Nonaktifkan" : "Ya, Aktifkan" }}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
