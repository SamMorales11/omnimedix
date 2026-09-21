<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import Alert from "../../components/ui/Alert.vue";

export interface MedicineItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  stockStatus: "normal" | "low" | "out";
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const router = useRouter();
const toast = useToast();

// State obat
const medicines = ref<MedicineItem[]>([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref<string | null>(null);

// State filter & search
const searchQuery = ref("");
const selectedStockStatus = ref<"all" | "normal" | "low" | "out">("all");
const selectedCategory = ref("all");
const selectedActiveStatus = ref<"all" | "active" | "inactive">("all");

// Modal Tambah / Edit Obat
const isFormModalOpen = ref(false);
const isEditing = ref(false);
const editingMedicineId = ref<string | null>(null);
const isSubmitting = ref(false);
const formError = ref<string | null>(null);

// Form data
const formData = ref({
  name: "",
  category: "",
  unit: "Tablet",
  minStock: 10,
  currentStock: 0,
  isActive: true,
});

// Form field validation errors
const formFieldErrors = ref<Record<string, string>>({});

// Modal Konfirmasi Nonaktifkan Obat
const isDeactivateModalOpen = ref(false);
const medicineToDeactivate = ref<MedicineItem | null>(null);
const isDeactivating = ref(false);

// Daftar pilihan kategori umum farmasi
const commonCategories = [
  "Antibiotik",
  "Analgesik & Antipiretik",
  "Antihistamin",
  "Antiinflamasi",
  "Gastrointestinal",
  "Kardiovaskular",
  "Respiratori",
  "Vitamin & Suplemen",
  "Antidiabetes",
  "Obat Luar & Topikal",
  "Lain-lain",
];

// Daftar pilihan satuan umum
const commonUnits = [
  "Tablet",
  "Kapsul",
  "Sirup (Botol)",
  "Ampul",
  "Vial",
  "Salep (Tube)",
  "Tetes (Botol)",
  "Sachet",
  "Strip",
  "Pcs",
];

// Ambil daftar obat dari API
async function fetchMedicines(showRefreshingIndicator = false) {
  if (showRefreshingIndicator) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }
  errorMessage.value = null;

  try {
    const queryParams = new URLSearchParams();

    if (searchQuery.value.trim()) {
      queryParams.set("search", searchQuery.value.trim());
    }

    if (selectedStockStatus.value !== "all") {
      queryParams.set("stock_status", selectedStockStatus.value);
    }

    if (selectedCategory.value !== "all") {
      queryParams.set("category", selectedCategory.value);
    }

    if (selectedActiveStatus.value === "active") {
      queryParams.set("is_active", "true");
    } else if (selectedActiveStatus.value === "inactive") {
      queryParams.set("is_active", "false");
    }

    const response = await apiClient<ApiResponse<MedicineItem[]>>(
      `/pharmacist/medicines?${queryParams.toString()}`,
    );

    if (response.success && Array.isArray(response.data)) {
      medicines.value = response.data;
    } else {
      medicines.value = [];
    }
  } catch (err: unknown) {
    console.error("Gagal memuat master obat:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kendala saat memuat master data obat.";
    toast.error(errorMessage.value!, "Gagal Memuat");
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

// Handler filter status stok
function handleStockStatusFilter(status: "all" | "normal" | "low" | "out") {
  selectedStockStatus.value = status;
  fetchMedicines();
}

// Debounce search
let searchTimer: ReturnType<typeof setTimeout> | null = null;
function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchMedicines();
  }, 350);
}

// Kategori unik dari data yang ada
const availableCategories = computed(() => {
  const categories = new Set<string>();
  medicines.value.forEach((m) => {
    if (m.category) categories.add(m.category);
  });
  return Array.from(categories).sort();
});

// Ringkasan stok obat
const stockMetrics = computed(() => {
  const list = medicines.value;
  return {
    total: list.length,
    normal: list.filter((m) => m.stockStatus === "normal").length,
    low: list.filter((m) => m.stockStatus === "low").length,
    out: list.filter((m) => m.stockStatus === "out").length,
  };
});

// Buka modal tambah obat baru
function openCreateModal() {
  isEditing.value = false;
  editingMedicineId.value = null;
  formData.value = {
    name: "",
    category: "Analgesik & Antipiretik",
    unit: "Tablet",
    minStock: 10,
    currentStock: 0,
    isActive: true,
  };
  formFieldErrors.value = {};
  formError.value = null;
  isFormModalOpen.value = true;
}

// Buka modal edit obat
function openEditModal(medicine: MedicineItem) {
  isEditing.value = true;
  editingMedicineId.value = medicine.id;
  formData.value = {
    name: medicine.name,
    category: medicine.category,
    unit: medicine.unit,
    minStock: medicine.minStock,
    currentStock: medicine.currentStock,
    isActive: medicine.isActive,
  };
  formFieldErrors.value = {};
  formError.value = null;
  isFormModalOpen.value = true;
}

// Validasi form sisi klien
function validateForm(): boolean {
  const errors: Record<string, string> = {};

  if (!formData.value.name.trim()) {
    errors.name = "Nama obat wajib diisi.";
  } else if (formData.value.name.trim().length > 255) {
    errors.name = "Nama obat maksimal 255 karakter.";
  }

  if (!formData.value.category.trim()) {
    errors.category = "Kategori obat wajib diisi.";
  }

  if (!formData.value.unit.trim()) {
    errors.unit = "Satuan obat wajib diisi.";
  }

  if (formData.value.minStock < 0 || isNaN(formData.value.minStock)) {
    errors.minStock = "Stok minimum harus berupa angka 0 atau lebih.";
  }

  if (formData.value.currentStock < 0 || isNaN(formData.value.currentStock)) {
    errors.currentStock = "Stok saat ini harus berupa angka 0 atau lebih.";
  }

  formFieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

// Submit tambah / edit obat
async function handleSubmitMedicine() {
  if (!validateForm()) return;

  isSubmitting.value = true;
  formError.value = null;

  try {
    if (isEditing.value && editingMedicineId.value) {
      // Update data obat
      const payload = {
        name: formData.value.name.trim(),
        category: formData.value.category.trim(),
        unit: formData.value.unit.trim(),
        minStock: Number(formData.value.minStock),
        currentStock: Number(formData.value.currentStock),
        isActive: formData.value.isActive,
      };

      const response = await apiClient<ApiResponse<MedicineItem>>(
        `/pharmacist/medicines/${editingMedicineId.value}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      );

      if (response.success) {
        toast.success(
          `Data obat "${payload.name}" berhasil diperbarui.`,
          "Berhasil Disimpan",
        );
        isFormModalOpen.value = false;
        fetchMedicines();
      } else {
        throw new Error(
          response.error?.message || "Gagal memperbarui data obat.",
        );
      }
    } else {
      // Tambah data obat baru
      const payload = {
        name: formData.value.name.trim(),
        category: formData.value.category.trim(),
        unit: formData.value.unit.trim(),
        minStock: Number(formData.value.minStock),
        currentStock: Number(formData.value.currentStock),
        isActive: formData.value.isActive,
      };

      const response = await apiClient<ApiResponse<MedicineItem>>(
        `/pharmacist/medicines`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      if (response.success) {
        toast.success(
          `Obat "${payload.name}" berhasil ditambahkan ke master data.`,
          "Obat Ditambahkan",
        );
        isFormModalOpen.value = false;
        fetchMedicines();
      } else {
        throw new Error(
          response.error?.message || "Gagal menambahkan obat baru.",
        );
      }
    }
  } catch (err: unknown) {
    console.error("Gagal simpan obat:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    formError.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kendala saat menyimpan data obat.";
  } finally {
    isSubmitting.value = false;
  }
}

// Buka modal nonaktifkan obat
function openDeactivateModal(medicine: MedicineItem) {
  medicineToDeactivate.value = medicine;
  isDeactivateModalOpen.value = true;
}

// Eksekusi nonaktifkan obat (Soft Delete)
async function handleConfirmDeactivate() {
  if (!medicineToDeactivate.value) return;

  isDeactivating.value = true;

  try {
    const response = await apiClient<ApiResponse<MedicineItem>>(
      `/pharmacist/medicines/${medicineToDeactivate.value.id}`,
      {
        method: "DELETE",
      },
    );

    if (response.success) {
      toast.success(
        `Obat "${medicineToDeactivate.value.name}" berhasil dinonaktifkan.`,
        "Status Diperbarui",
      );
      isDeactivateModalOpen.value = false;
      medicineToDeactivate.value = null;
      fetchMedicines();
    } else {
      throw new Error(response.error?.message || "Gagal menonaktifkan obat.");
    }
  } catch (err: unknown) {
    console.error("Gagal menonaktifkan obat:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    const msg =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kendala saat menonaktifkan obat.";
    toast.error(msg, "Aksi Gagal");
  } finally {
    isDeactivating.value = false;
  }
}

// Format waktu update
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "-";
  }
}

onMounted(() => {
  fetchMedicines();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5"
    >
      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <Badge variant="info" dot>Unit Farmasi</Badge>
          <span class="text-xs text-slate-500 font-mono">• Master Data & Stok</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Katalog & Master Data Obat
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Kelola ketersediaan inventaris, batas aman minimum stok, dan pencatatan obat farmasi klinik secara presisi.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2.5">
        <Button
          variant="outline"
          size="sm"
          :loading="isRefreshing"
          @click="fetchMedicines(true)"
          class="gap-1.5"
        >
          <template #icon>
            <svg
              class="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </template>
          Segarkan
        </Button>

        <Button
          variant="secondary"
          size="sm"
          @click="router.push('/pharmacist/stock-in')"
          class="gap-1.5"
        >
          <template #icon>
            <svg
              class="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </template>
          Catat Obat Masuk
        </Button>

        <Button variant="primary" size="sm" @click="openCreateModal" class="gap-1.5">
          <template #icon>
            <svg
              class="h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </template>
          Tambah Obat Baru
        </Button>
      </div>
    </div>

    <!-- Quick Stats Metric Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
      <Card
        class="relative overflow-hidden cursor-pointer transition-all p-4 sm:p-5"
        :class="
          selectedStockStatus === 'all'
            ? 'ring-2 ring-blue-500/60 bg-blue-950/20 border-blue-800/60'
            : 'hover:border-slate-700 bg-slate-900/70 border-slate-800'
        "
        @click="handleStockStatusFilter('all')"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</span>
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Total Obat</span>
          <span class="h-2 w-2 rounded-full bg-blue-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1.5 font-mono">
          {{ stockMetrics.total }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Dalam katalog</div>
      </Card>

      <Card
        class="relative overflow-hidden cursor-pointer transition-all p-4 sm:p-5"
        :class="
          selectedStockStatus === 'normal'
            ? 'ring-2 ring-emerald-500/60 bg-emerald-950/20 border-emerald-800/60'
            : 'hover:border-slate-700 bg-slate-900/70 border-slate-800'
        "
        @click="handleStockStatusFilter('normal')"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</span>
        <div class="flex items-center justify-between">
          <span class="text-xs text-emerald-300/90 font-medium">Stok Normal</span>
          <span class="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1.5 font-mono">
          {{ stockMetrics.normal }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">
          Stok di atas batas aman
        </div>
      </Card>

      <Card
        class="relative overflow-hidden cursor-pointer transition-all p-4 sm:p-5"
        :class="
          selectedStockStatus === 'low'
            ? 'ring-2 ring-amber-500/60 bg-amber-950/20 border-amber-800/60'
            : 'hover:border-slate-700 bg-slate-900/70 border-slate-800'
        "
        @click="handleStockStatusFilter('low')"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</span>
        <div class="flex items-center justify-between">
          <span class="text-xs text-amber-300/90 font-medium">Stok Menipis</span>
          <span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1.5 font-mono">
          {{ stockMetrics.low }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">&le; batas minimum</div>
      </Card>

      <Card
        class="relative overflow-hidden cursor-pointer transition-all p-4 sm:p-5"
        :class="
          selectedStockStatus === 'out'
            ? 'ring-2 ring-rose-500/60 bg-rose-950/20 border-rose-800/60'
            : 'hover:border-slate-700 bg-slate-900/70 border-slate-800'
        "
        @click="handleStockStatusFilter('out')"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</span>
        <div class="flex items-center justify-between">
          <span class="text-xs text-rose-300/90 font-medium">Stok Habis</span>
          <span class="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-1.5 font-mono">
          {{ stockMetrics.out }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">
          Perlu pengadaan segera
        </div>
      </Card>
    </div>

    <!-- Error Alert jika ada gangguan fetch -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Memuat Master Obat"
      dismissible
      @dismiss="errorMessage = null"
    >
      {{ errorMessage }}
      <div class="mt-2">
        <Button size="sm" variant="secondary" @click="fetchMedicines(false)">
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Filters & Search Toolbar -->
    <Card>
      <div
        class="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <!-- Filter Status Tab Buttons -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            @click="handleStockStatusFilter('all')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStockStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Semua
          </button>
          <button
            type="button"
            @click="handleStockStatusFilter('normal')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStockStatus === 'normal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Normal
          </button>
          <button
            type="button"
            @click="handleStockStatusFilter('low')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStockStatus === 'low'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Menipis
          </button>
          <button
            type="button"
            @click="handleStockStatusFilter('out')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStockStatus === 'out'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Habis
          </button>
        </div>

        <!-- Filter Dropdown & Search Box -->
        <div class="flex flex-col sm:flex-row items-center gap-3">
          <!-- Filter Kategori -->
          <div class="w-full sm:w-44">
            <select
              v-model="selectedCategory"
              @change="fetchMedicines()"
              class="w-full h-9 rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori</option>
              <option
                v-for="cat in availableCategories"
                :key="cat"
                :value="cat"
              >
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Filter Status Aktif -->
          <div class="w-full sm:w-36">
            <select
              v-model="selectedActiveStatus"
              @change="fetchMedicines()"
              class="w-full h-9 rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          <!-- Search Box -->
          <div class="w-full sm:w-64">
            <Input
              v-model="searchQuery"
              placeholder="Cari nama atau kategori obat..."
              size="sm"
              @input="handleSearchInput"
            >
              <template #prefix>
                <svg
                  class="h-3.5 w-3.5 text-slate-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </template>
            </Input>
          </div>
        </div>
      </div>
    </Card>

    <!-- Content: Loading Skeleton, Empty State, atau Tabel Master Obat -->
    <Card>
      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="space-y-4 py-2">
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center justify-between p-3 border-b border-slate-800/60"
        >
          <div class="space-y-2">
            <Skeleton class="h-4 w-48" />
            <Skeleton class="h-3 w-32" />
          </div>
          <div class="flex items-center gap-3">
            <Skeleton class="h-6 w-20 rounded-full" />
            <Skeleton class="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="medicines.length === 0"
        title="Belum Ada Data Obat"
        :description="
          searchQuery ||
          selectedStockStatus !== 'all' ||
          selectedCategory !== 'all'
            ? 'Tidak ada obat yang cocok dengan kriteria filter atau pencarian Anda.'
            : 'Belum ada obat yang terdaftar di master data apotek.'
        "
      >
        <template #icon>
          <svg
            class="h-10 w-10 text-slate-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
            />
          </svg>
        </template>
        <template #action>
          <div class="flex items-center gap-2">
            <Button
              v-if="
                searchQuery ||
                selectedStockStatus !== 'all' ||
                selectedCategory !== 'all'
              "
              size="sm"
              variant="secondary"
              @click="
                searchQuery = '';
                selectedStockStatus = 'all';
                selectedCategory = 'all';
                selectedActiveStatus = 'all';
                fetchMedicines();
              "
            >
              Reset Filter
            </Button>
            <Button size="sm" variant="primary" @click="openCreateModal">
              Tambah Obat Baru
            </Button>
          </div>
        </template>
      </EmptyState>

      <!-- Medicine List Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead
            class="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800"
          >
            <tr>
              <th class="p-3.5">Nama Obat</th>
              <th class="p-3.5">Kategori</th>
              <th class="p-3.5">Satuan</th>
              <th class="p-3.5">Stok Saat Ini</th>
              <th class="p-3.5">Batas Minimum</th>
              <th class="p-3.5">Indikator Stok</th>
              <th class="p-3.5">Status</th>
              <th class="p-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80">
            <tr
              v-for="med in medicines"
              :key="med.id"
              class="hover:bg-slate-900/60 transition-colors"
            >
              <!-- Nama Obat -->
              <td class="p-3.5">
                <div class="font-semibold text-slate-100 text-sm">
                  {{ med.name }}
                </div>
                <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                  ID: {{ med.id.slice(0, 8) }}
                </div>
              </td>

              <!-- Kategori -->
              <td class="p-3.5">
                <span
                  class="inline-block bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded text-xs"
                >
                  {{ med.category }}
                </span>
              </td>

              <!-- Satuan (Unit) -->
              <td class="p-3.5 font-medium text-slate-300">
                {{ med.unit }}
              </td>

              <!-- Stok Saat Ini -->
              <td class="p-3.5 whitespace-nowrap">
                <span
                  class="font-bold text-sm"
                  :class="[
                    med.currentStock <= 0
                      ? 'text-rose-400'
                      : med.currentStock <= med.minStock
                        ? 'text-amber-400'
                        : 'text-slate-100',
                  ]"
                >
                  {{ med.currentStock }}
                </span>
                <span class="text-slate-400 ml-1 text-xs">
                  {{ med.unit }}
                </span>
              </td>

              <!-- Batas Minimum -->
              <td class="p-3.5 font-medium text-slate-400 whitespace-nowrap">
                {{ med.minStock }} {{ med.unit }}
              </td>

              <!-- Indikator Visual Status Stok -->
              <td class="p-3.5 whitespace-nowrap">
                <span
                  v-if="med.stockStatus === 'out'"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/80"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse"
                  />
                  Stok Habis
                </span>

                <span
                  v-else-if="med.stockStatus === 'low'"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80"
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"
                  />
                  Stok Menipis
                </span>

                <span
                  v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Tersedia (Normal)
                </span>
              </td>

              <!-- Status Aktif / Nonaktif -->
              <td class="p-3.5 whitespace-nowrap">
                <Badge
                  :variant="med.isActive ? 'success' : 'default'"
                  size="sm"
                >
                  {{ med.isActive ? "Aktif" : "Nonaktif" }}
                </Badge>
              </td>

              <!-- Aksi Edit, Catat Masuk, Nonaktifkan -->
              <td class="p-3.5 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Catat Obat Masuk"
                    @click="
                      router.push(`/pharmacist/stock-in?medicineId=${med.id}`)
                    "
                  >
                    <template #icon>
                      <svg
                        class="h-3.5 w-3.5 text-emerald-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                    </template>
                    Masuk
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    title="Edit Obat"
                    @click="openEditModal(med)"
                  >
                    <template #icon>
                      <svg
                        class="h-3.5 w-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                        />
                      </svg>
                    </template>
                    Edit
                  </Button>

                  <Button
                    v-if="med.isActive"
                    size="sm"
                    variant="ghost"
                    class="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                    title="Nonaktifkan Obat"
                    @click="openDeactivateModal(med)"
                  >
                    Nonaktifkan
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Modal Form Tambah / Edit Obat -->
    <div
      v-if="isFormModalOpen"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        class="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between border-b border-slate-800 pb-3"
        >
          <div>
            <h3 class="text-base font-bold text-slate-100">
              {{ isEditing ? "Edit Data Obat" : "Tambah Obat Baru" }}
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              {{
                isEditing
                  ? "Perbarui informasi obat atau stok minimum"
                  : "Daftarkan obat baru ke katalog master farmasi"
              }}
            </p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-200 p-1"
            @click="isFormModalOpen = false"
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Form Error Alert -->
        <Alert
          v-if="formError"
          variant="danger"
          title="Terjadi Kesalahan"
          dismissible
          @dismiss="formError = null"
        >
          {{ formError }}
        </Alert>

        <!-- Form Body -->
        <form @submit.prevent="handleSubmitMedicine" class="space-y-4">
          <!-- Nama Obat -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">
              Nama Obat <span class="text-rose-400">*</span>
            </label>
            <Input
              v-model="formData.name"
              placeholder="Contoh: Paracetamol 500mg, Amoxicillin 500mg"
              size="md"
              :error="formFieldErrors.name"
            />
          </div>

          <!-- Grid Kategori & Satuan -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Kategori -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Kategori <span class="text-rose-400">*</span>
              </label>
              <div class="space-y-1.5">
                <select
                  v-model="formData.category"
                  class="w-full h-10 rounded-lg bg-slate-950 border border-slate-700/80 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option
                    v-for="cat in commonCategories"
                    :key="cat"
                    :value="cat"
                  >
                    {{ cat }}
                  </option>
                </select>
                <p
                  v-if="formFieldErrors.category"
                  class="text-[11px] text-rose-400"
                >
                  {{ formFieldErrors.category }}
                </p>
              </div>
            </div>

            <!-- Satuan (Unit) -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Satuan (Unit) <span class="text-rose-400">*</span>
              </label>
              <div class="space-y-1.5">
                <select
                  v-model="formData.unit"
                  class="w-full h-10 rounded-lg bg-slate-950 border border-slate-700/80 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option v-for="u in commonUnits" :key="u" :value="u">
                    {{ u }}
                  </option>
                </select>
                <p
                  v-if="formFieldErrors.unit"
                  class="text-[11px] text-rose-400"
                >
                  {{ formFieldErrors.unit }}
                </p>
              </div>
            </div>
          </div>

          <!-- Grid Batas Minimum & Stok Saat Ini -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Stok Minimum -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                Batas Minimum Stok <span class="text-rose-400">*</span>
              </label>
              <Input
                v-model.number="formData.minStock"
                type="number"
                min="0"
                placeholder="10"
                size="md"
                helperText="Peringatan aktif jika stok &le; angka ini"
                :error="formFieldErrors.minStock"
              />
            </div>

            <!-- Stok Saat Ini -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">
                {{ isEditing ? "Stok Saat Ini" : "Stok Awal" }}
                <span class="text-rose-400">*</span>
              </label>
              <Input
                v-model.number="formData.currentStock"
                type="number"
                min="0"
                placeholder="0"
                size="md"
                :helperText="
                  isEditing
                    ? 'Perubahan stok di master'
                    : 'Stok awal sebelum obat masuk'
                "
                :error="formFieldErrors.currentStock"
              />
            </div>
          </div>

          <!-- Checkbox Status Aktif (hanya saat edit atau opsional saat tambah) -->
          <div class="pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.isActive"
                class="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span class="text-xs text-slate-300 select-none">
                Obat Aktif (Dapat dipilih dokter untuk peresepan)
              </span>
            </label>
          </div>

          <!-- Modal Action Buttons -->
          <div
            class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800"
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              :disabled="isSubmitting"
              @click="isFormModalOpen = false"
            >
              Batal
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              :loading="isSubmitting"
            >
              {{ isEditing ? "Simpan Perubahan" : "Tambah Obat" }}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Konfirmasi Nonaktifkan Obat -->
    <div
      v-if="isDeactivateModalOpen && medicineToDeactivate"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-10 w-10 rounded-full bg-rose-950 flex items-center justify-center text-rose-400 shrink-0 border border-rose-800/60"
          >
            <svg
              class="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-100">
              Nonaktifkan Obat?
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Obat tidak akan muncul lagi di formularium peresepan dokter.
            </p>
          </div>
        </div>

        <div
          class="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1"
        >
          <div>
            <strong class="text-slate-400">Nama Obat:</strong>
            {{ medicineToDeactivate.name }}
          </div>
          <div>
            <strong class="text-slate-400">Kategori:</strong>
            {{ medicineToDeactivate.category }}
          </div>
          <div>
            <strong class="text-slate-400">Sisa Stok:</strong>
            {{ medicineToDeactivate.currentStock }}
            {{ medicineToDeactivate.unit }}
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            :disabled="isDeactivating"
            @click="isDeactivateModalOpen = false"
          >
            Batal
          </Button>

          <Button
            variant="danger"
            size="sm"
            :loading="isDeactivating"
            @click="handleConfirmDeactivate"
          >
            Ya, Nonaktifkan
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
