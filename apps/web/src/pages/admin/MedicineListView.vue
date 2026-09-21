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

// Modal Tambah Obat
const isCreateModalOpen = ref(false);
const isCreating = ref(false);
const createFormError = ref<string | null>(null);
const createFieldErrors = ref<Record<string, string>>({});
const createForm = ref({
  name: "",
  category: "",
  unit: "Tablet",
  minStock: 10,
  currentStock: 0,
  isActive: true,
});

// Modal Edit Obat
const isEditModalOpen = ref(false);
const isEditing = ref(false);
const editingMedicineId = ref<string | null>(null);
const editFormError = ref<string | null>(null);
const editFieldErrors = ref<Record<string, string>>({});
const editForm = ref({
  name: "",
  category: "",
  unit: "Tablet",
  minStock: 10,
  currentStock: 0,
  isActive: true,
});

// Modal Ubah Status Aktif/Nonaktif
const isStatusModalOpen = ref(false);
const medicineToToggle = ref<MedicineItem | null>(null);
const isUpdatingStatus = ref(false);

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
  "Pcs",
];

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

// Fetch daftar obat dari endpoint Admin
async function fetchMedicines() {
  if (medicines.value.length === 0) {
    isLoading.value = true;
  } else {
    isRefreshing.value = true;
  }
  errorMessage.value = null;

  try {
    const params = new URLSearchParams();

    if (searchQuery.value.trim()) {
      params.set("search", searchQuery.value.trim());
    }

    if (selectedCategory.value !== "all") {
      params.set("category", selectedCategory.value);
    }

    if (selectedStockStatus.value !== "all") {
      params.set("stock_status", selectedStockStatus.value);
    }

    if (selectedActiveStatus.value === "active") {
      params.set("is_active", "true");
    } else if (selectedActiveStatus.value === "inactive") {
      params.set("is_active", "false");
    }

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient<ApiResponse<MedicineItem[]>>(
      `/admin/medicines${queryString}`,
    );

    if (res.success && Array.isArray(res.data)) {
      medicines.value = res.data;
    } else {
      throw new Error("Gagal mengambil data master obat.");
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    errorMessage.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal memuat katalog master obat. Silakan coba lagi.";
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
    fetchMedicines();
  }, 350);
}

function onFilterChange() {
  fetchMedicines();
}

function resetFilters() {
  searchQuery.value = "";
  selectedStockStatus.value = "all";
  selectedCategory.value = "all";
  selectedActiveStatus.value = "all";
  fetchMedicines();
}

// Summary Statistik
const stats = computed(() => {
  const total = medicines.value.length;
  const normal = medicines.value.filter((m) => m.stockStatus === "normal").length;
  const low = medicines.value.filter((m) => m.stockStatus === "low").length;
  const out = medicines.value.filter((m) => m.stockStatus === "out").length;
  return { total, normal, low, out };
});

// Daftar kategori unik untuk filter
const uniqueCategories = computed(() => {
  const cats = new Set<string>();
  medicines.value.forEach((m) => {
    if (m.category) cats.add(m.category);
  });
  return Array.from(cats).sort();
});

// Modal Tambah Obat
function openCreateModal() {
  createFormError.value = null;
  createFieldErrors.value = {};
  createForm.value = {
    name: "",
    category: "",
    unit: "Tablet",
    minStock: 10,
    currentStock: 0,
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
    createFieldErrors.value["name"] = "Nama obat wajib diisi.";
    valid = false;
  }

  if (!createForm.value.category.trim()) {
    createFieldErrors.value["category"] = "Kategori obat wajib diisi.";
    valid = false;
  }

  if (!createForm.value.unit.trim()) {
    createFieldErrors.value["unit"] = "Satuan obat wajib diisi.";
    valid = false;
  }

  if (createForm.value.minStock === undefined || createForm.value.minStock < 0) {
    createFieldErrors.value["minStock"] = "Batas stok minimum minimal 0.";
    valid = false;
  }

  if (createForm.value.currentStock === undefined || createForm.value.currentStock < 0) {
    createFieldErrors.value["currentStock"] = "Stok awal minimal 0.";
    valid = false;
  }

  return valid;
}

async function handleCreateMedicine() {
  if (!validateCreateForm()) return;

  isCreating.value = true;
  createFormError.value = null;

  try {
    const res = await apiClient<ApiResponse<MedicineItem>>("/admin/medicines", {
      method: "POST",
      body: {
        name: createForm.value.name.trim(),
        category: createForm.value.category.trim(),
        unit: createForm.value.unit.trim(),
        minStock: Number(createForm.value.minStock),
        currentStock: Number(createForm.value.currentStock),
        isActive: createForm.value.isActive,
      },
    });

    if (res.success && res.data) {
      toast.success(`Obat '${res.data.name}' berhasil ditambahkan.`);
      isCreateModalOpen.value = false;
      await fetchMedicines();
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    createFormError.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal menambahkan obat baru. Silakan periksa kembali formulir.";
  } finally {
    isCreating.value = false;
  }
}

// Modal Edit Obat
function openEditModal(item: MedicineItem) {
  editingMedicineId.value = item.id;
  editFormError.value = null;
  editFieldErrors.value = {};
  editForm.value = {
    name: item.name,
    category: item.category,
    unit: item.unit,
    minStock: item.minStock,
    currentStock: item.currentStock,
    isActive: item.isActive,
  };
  isEditModalOpen.value = true;
}

function closeEditModal() {
  if (isEditing.value) return;
  isEditModalOpen.value = false;
  editingMedicineId.value = null;
  editFormError.value = null;
  editFieldErrors.value = {};
}

function validateEditForm(): boolean {
  editFieldErrors.value = {};
  let valid = true;

  if (!editForm.value.name.trim()) {
    editFieldErrors.value["name"] = "Nama obat tidak boleh kosong.";
    valid = false;
  }

  if (!editForm.value.category.trim()) {
    editFieldErrors.value["category"] = "Kategori tidak boleh kosong.";
    valid = false;
  }

  if (!editForm.value.unit.trim()) {
    editFieldErrors.value["unit"] = "Satuan tidak boleh kosong.";
    valid = false;
  }

  if (editForm.value.minStock === undefined || editForm.value.minStock < 0) {
    editFieldErrors.value["minStock"] = "Batas stok minimum minimal 0.";
    valid = false;
  }

  if (editForm.value.currentStock === undefined || editForm.value.currentStock < 0) {
    editFieldErrors.value["currentStock"] = "Stok saat ini minimal 0.";
    valid = false;
  }

  return valid;
}

async function handleEditMedicine() {
  if (!editingMedicineId.value || !validateEditForm()) return;

  isEditing.value = true;
  editFormError.value = null;

  try {
    const res = await apiClient<ApiResponse<MedicineItem>>(
      `/admin/medicines/${editingMedicineId.value}`,
      {
        method: "PUT",
        body: {
          name: editForm.value.name.trim(),
          category: editForm.value.category.trim(),
          unit: editForm.value.unit.trim(),
          minStock: Number(editForm.value.minStock),
          currentStock: Number(editForm.value.currentStock),
          isActive: editForm.value.isActive,
        },
      },
    );

    if (res.success && res.data) {
      toast.success(`Data obat '${res.data.name}' berhasil diperbarui.`);
      isEditModalOpen.value = false;
      editingMedicineId.value = null;
      await fetchMedicines();
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    editFormError.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal memperbarui data obat.";
  } finally {
    isEditing.value = false;
  }
}

// Modal Ubah Status
function openStatusModal(item: MedicineItem) {
  medicineToToggle.value = item;
  isStatusModalOpen.value = true;
}

function closeStatusModal() {
  if (isUpdatingStatus.value) return;
  isStatusModalOpen.value = false;
  medicineToToggle.value = null;
}

async function handleConfirmToggleStatus() {
  if (!medicineToToggle.value) return;

  const targetStatus = !medicineToToggle.value.isActive;
  isUpdatingStatus.value = true;

  try {
    const res = await apiClient<ApiResponse<MedicineItem>>(
      `/admin/medicines/${medicineToToggle.value.id}/status`,
      {
        method: "PATCH",
        body: {
          isActive: targetStatus,
        },
      },
    );

    if (res.success) {
      toast.success(
        `Obat '${medicineToToggle.value.name}' berhasil di${
          targetStatus ? "aktifkan" : "nonaktifkan"
        }.`,
      );
      closeStatusModal();
      await fetchMedicines();
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    toast.error(
      errorObj.data?.error?.message ||
        errorObj.message ||
        "Gagal mengubah status obat.",
    );
  } finally {
    isUpdatingStatus.value = false;
  }
}

// Inisialisasi data
onMounted(() => {
  fetchMedicines();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Bagian Atas -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5"
    >
      <div>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="primary" size="sm" dot>Administrator</Badge>
          <span class="text-xs text-slate-500 font-mono tracking-wider uppercase">Master Obat</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Kelola Master Data Obat
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Pantau katalog obat, kelola batas stok minimum, perbarui stok master, dan atur ketersediaan obat farmasi & klinik.
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          :disabled="isLoading || isRefreshing"
          @click="fetchMedicines"
        >
          <svg
            class="w-4 h-4 mr-2"
            :class="{ 'animate-spin': isRefreshing }"
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
          Segarkan
        </Button>

        <Button
          variant="primary"
          size="sm"
          @click="openCreateModal"
          class="shadow-sm shadow-blue-500/20"
        >
          <svg
            class="w-4 h-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah Obat Baru
        </Button>
      </div>
    </div>

    <!-- 4 Kartu Ringkasan Stok Master -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Total Master Obat -->
      <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4 overflow-hidden">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Master Obat
            </p>
            <p class="text-2xl sm:text-3xl font-extrabold font-mono text-slate-100 mt-1">
              {{ isLoading ? "-" : stats.total }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
      </Card>

      <!-- 2. Stok Normal -->
      <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4 overflow-hidden">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Stok Normal
            </p>
            <p class="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mt-1">
              {{ isLoading ? "-" : stats.normal }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </Card>

      <!-- 3. Stok Rendah -->
      <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4 overflow-hidden">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-amber-400 uppercase tracking-wider">
              Stok Rendah (&le; Min)
            </p>
            <p class="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-1">
              {{ isLoading ? "-" : stats.low }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </Card>

      <!-- 4. Stok Habis -->
      <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4 overflow-hidden">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium text-rose-400 uppercase tracking-wider">
              Stok Habis (0)
            </p>
            <p class="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400 mt-1">
              {{ isLoading ? "-" : stats.out }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>
      </Card>
    </div>

    <!-- Alert Error Jika Terjadi Kesalahan -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Terjadi Kesalahan"
      class="mb-4"
    >
      <div class="flex items-center justify-between">
        <span>{{ errorMessage }}</span>
        <Button size="sm" variant="outline" @click="fetchMedicines">
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Toolbar Filter & Search -->
    <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4">
      <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="flex flex-col lg:flex-row gap-4 justify-between">
        <!-- Input Search -->
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari berdasarkan nama obat atau kategori..."
            class="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
            @input="onSearchInput"
          />
        </div>

        <!-- Filter Dropdowns -->
        <div class="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <!-- Filter Status Stok -->
          <select
            v-model="selectedStockStatus"
            class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
            @change="onFilterChange"
          >
            <option value="all">Semua Status Stok</option>
            <option value="normal">Stok Aman</option>
            <option value="low">Stok Rendah</option>
            <option value="out">Stok Habis</option>
          </select>

          <!-- Filter Kategori -->
          <select
            v-model="selectedCategory"
            class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
            @change="onFilterChange"
          >
            <option value="all">Semua Kategori</option>
            <option v-for="cat in uniqueCategories" :key="cat" :value="cat">
              {{ cat }}
            </option>
          </select>

          <!-- Filter Status Aktif -->
          <select
            v-model="selectedActiveStatus"
            class="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
            @change="onFilterChange"
          >
            <option value="all">Semua Status</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Hanya Nonaktif</option>
          </select>

          <!-- Reset Filter -->
          <Button
            v-if="searchQuery || selectedStockStatus !== 'all' || selectedCategory !== 'all' || selectedActiveStatus !== 'all'"
            variant="ghost"
            size="sm"
            @click="resetFilters"
          >
            Reset
          </Button>
        </div>
      </div>
    </Card>

    <!-- Tabel Data Master Obat -->
    <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
      <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
      <!-- Loading Skeleton State -->
      <div v-if="isLoading" class="p-6 space-y-4">
        <div v-for="i in 5" :key="i" class="flex items-center justify-between py-3 border-b border-slate-800/60 last:border-0">
          <div class="space-y-2 flex-1 max-w-sm">
            <Skeleton class="h-5 w-44 rounded" />
            <Skeleton class="h-3.5 w-28 rounded" />
          </div>
          <div class="flex items-center gap-6">
            <Skeleton class="h-4 w-16 rounded" />
            <Skeleton class="h-6 w-20 rounded-full" />
            <Skeleton class="h-6 w-16 rounded-full" />
            <Skeleton class="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="medicines.length === 0" class="py-12">
        <EmptyState
          title="Tidak Ada Data Obat Ditemukan"
          :description="
            searchQuery || selectedStockStatus !== 'all' || selectedCategory !== 'all' || selectedActiveStatus !== 'all'
              ? 'Tidak ada obat yang cocok dengan kriteria pencarian atau filter yang dipilih.'
              : 'Belum ada master data obat yang terdaftar di sistem.'
          "
        >
          <template #action>
            <Button
              v-if="searchQuery || selectedStockStatus !== 'all' || selectedCategory !== 'all' || selectedActiveStatus !== 'all'"
              variant="outline"
              size="sm"
              @click="resetFilters"
            >
              Reset Filter
            </Button>
            <Button
              v-else
              variant="primary"
              size="sm"
              @click="openCreateModal"
            >
              Tambah Obat Baru
            </Button>
          </template>
        </EmptyState>
      </div>

      <!-- Tabel Konten -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th scope="col" class="py-3.5 px-4 font-semibold">Nama Obat & Kategori</th>
              <th scope="col" class="py-3.5 px-4 font-semibold">Satuan</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-center">Batas Min</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-center">Stok Saat Ini</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-center">Status Stok</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-center">Status Master</th>
              <th scope="col" class="py-3.5 px-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="item in medicines"
              :key="item.id"
              class="hover:bg-slate-800/30 transition-colors"
            >
              <!-- Nama & Kategori -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                    :class="
                      item.stockStatus === 'out'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : item.stockStatus === 'low'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                    "
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <div class="font-medium text-slate-100">
                      {{ item.name }}
                    </div>
                    <div class="text-xs text-slate-400">
                      {{ item.category }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Satuan -->
              <td class="py-3.5 px-4 text-slate-300">
                {{ item.unit }}
              </td>

              <!-- Batas Min -->
              <td class="py-3.5 px-4 text-center text-slate-400">
                {{ item.minStock }} {{ item.unit }}
              </td>

              <!-- Stok Saat Ini -->
              <td class="py-3.5 px-4 text-center">
                <span
                  class="font-mono font-bold text-base"
                  :class="
                    item.stockStatus === 'out'
                      ? 'text-rose-400'
                      : item.stockStatus === 'low'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  "
                >
                  {{ item.currentStock }}
                </span>
                <span class="text-xs text-slate-400 ml-1">{{ item.unit }}</span>
              </td>

              <!-- Status Stok -->
              <td class="py-3.5 px-4 text-center">
                <span
                  v-if="item.stockStatus === 'normal'"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                >
                  Aman
                </span>
                <span
                  v-else-if="item.stockStatus === 'low'"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                >
                  Stok Rendah
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
                >
                  Habis
                </span>
              </td>

              <!-- Status Master (Aktif / Nonaktif) -->
              <td class="py-3.5 px-4 text-center">
                <Badge
                  :variant="item.isActive ? 'success' : 'default'"
                  size="sm"
                >
                  {{ item.isActive ? 'Aktif' : 'Nonaktif' }}
                </Badge>
              </td>

              <!-- Aksi -->
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <!-- Tombol Edit -->
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    @click="openEditModal(item)"
                  >
                    <svg class="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>

                  <!-- Tombol Ubah Status -->
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-xs"
                    :class="item.isActive ? 'hover:text-rose-400' : 'hover:text-emerald-400'"
                    @click="openStatusModal(item)"
                  >
                    {{ item.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- ======================================================== -->
    <!-- MODAL 1: TAMBAH OBAT BARU                                 -->
    <!-- ======================================================== -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      @click.self="closeCreateModal"
    >
      <Card class="w-full max-w-lg border-slate-800 bg-slate-900 shadow-2xl p-6 relative">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-blue-500/40 select-none pointer-events-none">+</div>
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-100">Tambah Obat Baru</h2>
              <p class="text-xs text-slate-400">Tambahkan entri master obat baru ke katalog sistem</p>
            </div>
          </div>
          <button
            class="text-slate-400 hover:text-slate-200 transition-colors"
            @click="closeCreateModal"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-4 mt-5" @submit.prevent="handleCreateMedicine">
          <Alert v-if="createFormError" variant="danger">{{ createFormError }}</Alert>

          <!-- Nama Obat -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">
              Nama Obat <span class="text-rose-400">*</span>
            </label>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="Contoh: Paracetamol 500mg, Amoxicillin 500mg"
              class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
              :class="createFieldErrors.name ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
            />
            <p v-if="createFieldErrors.name" class="text-xs text-rose-400 mt-1">
              {{ createFieldErrors.name }}
            </p>
          </div>

          <!-- Kategori & Satuan -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Kategori <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="createForm.category"
                type="text"
                list="category-suggestions"
                placeholder="Pilih atau ketik kategori..."
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="createFieldErrors.category ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <datalist id="category-suggestions">
                <option v-for="cat in commonCategories" :key="cat" :value="cat" />
              </datalist>
              <p v-if="createFieldErrors.category" class="text-xs text-rose-400 mt-1">
                {{ createFieldErrors.category }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Satuan (Unit) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="createForm.unit"
                type="text"
                list="unit-suggestions"
                placeholder="Contoh: Tablet, Kapsul, Botol"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="createFieldErrors.unit ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <datalist id="unit-suggestions">
                <option v-for="u in commonUnits" :key="u" :value="u" />
              </datalist>
              <p v-if="createFieldErrors.unit" class="text-xs text-rose-400 mt-1">
                {{ createFieldErrors.unit }}
              </p>
            </div>
          </div>

          <!-- Batas Stok Min & Stok Awal -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Batas Minimum Stok <span class="text-rose-400">*</span>
              </label>
              <input
                v-model.number="createForm.minStock"
                type="number"
                min="0"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="createFieldErrors.minStock ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <p class="text-[11px] text-slate-500 mt-1">
                Peringatan otomatis muncul bila stok &le; angka ini.
              </p>
              <p v-if="createFieldErrors.minStock" class="text-xs text-rose-400 mt-1">
                {{ createFieldErrors.minStock }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Stok Awal Saat Ini <span class="text-rose-400">*</span>
              </label>
              <input
                v-model.number="createForm.currentStock"
                type="number"
                min="0"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="createFieldErrors.currentStock ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <p class="text-[11px] text-slate-500 mt-1">
                Jumlah stok fisik yang tersedia di klinik.
              </p>
              <p v-if="createFieldErrors.currentStock" class="text-xs text-rose-400 mt-1">
                {{ createFieldErrors.currentStock }}
              </p>
            </div>
          </div>

          <!-- Checkbox Status Aktif -->
          <div class="pt-1">
            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input
                v-model="createForm.isActive"
                type="checkbox"
                class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900"
              />
              <span class="text-sm text-slate-300">
                Aktifkan obat ini langsung di katalog farmasi
              </span>
            </label>
          </div>

          <!-- Tombol Aksi Modal -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              <svg
                v-if="isCreating"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {{ isCreating ? 'Menyimpan...' : 'Simpan Obat' }}
            </Button>
          </div>
        </form>
      </Card>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 2: EDIT MASTER OBAT & STOK                         -->
    <!-- ======================================================== -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      @click.self="closeEditModal"
    >
      <Card class="w-full max-w-lg border-slate-800 bg-slate-900 shadow-2xl p-6 relative">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-teal-500/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-teal-500/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-teal-500/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-teal-500/40 select-none pointer-events-none">+</div>
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-100">Perbarui Master Obat</h2>
              <p class="text-xs text-slate-400">Ubah detail katalog atau sesuaikan jumlah stok master</p>
            </div>
          </div>
          <button
            class="text-slate-400 hover:text-slate-200 transition-colors"
            @click="closeEditModal"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-4 mt-5" @submit.prevent="handleEditMedicine">
          <Alert v-if="editFormError" variant="danger">{{ editFormError }}</Alert>

          <!-- Nama Obat -->
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">
              Nama Obat <span class="text-rose-400">*</span>
            </label>
            <input
              v-model="editForm.name"
              type="text"
              class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
              :class="editFieldErrors.name ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
            />
            <p v-if="editFieldErrors.name" class="text-xs text-rose-400 mt-1">
              {{ editFieldErrors.name }}
            </p>
          </div>

          <!-- Kategori & Satuan -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Kategori <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="editForm.category"
                type="text"
                list="category-suggestions-edit"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="editFieldErrors.category ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <datalist id="category-suggestions-edit">
                <option v-for="cat in commonCategories" :key="cat" :value="cat" />
              </datalist>
              <p v-if="editFieldErrors.category" class="text-xs text-rose-400 mt-1">
                {{ editFieldErrors.category }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Satuan (Unit) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="editForm.unit"
                type="text"
                list="unit-suggestions-edit"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="editFieldErrors.unit ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <datalist id="unit-suggestions-edit">
                <option v-for="u in commonUnits" :key="u" :value="u" />
              </datalist>
              <p v-if="editFieldErrors.unit" class="text-xs text-rose-400 mt-1">
                {{ editFieldErrors.unit }}
              </p>
            </div>
          </div>

          <!-- Batas Stok Min & Penyesuaian Stok Saat Ini -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Batas Minimum Stok <span class="text-rose-400">*</span>
              </label>
              <input
                v-model.number="editForm.minStock"
                type="number"
                min="0"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="editFieldErrors.minStock ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <p v-if="editFieldErrors.minStock" class="text-xs text-rose-400 mt-1">
                {{ editFieldErrors.minStock }}
              </p>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Stok Saat Ini (Master) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model.number="editForm.currentStock"
                type="number"
                min="0"
                class="w-full px-3.5 py-2 bg-slate-950 border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors"
                :class="editFieldErrors.currentStock ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-800 focus:border-teal-500 focus:ring-teal-500'"
              />
              <p class="text-[11px] text-teal-400/80 mt-1">
                Admin berhak menyesuaikan stok langsung.
              </p>
              <p v-if="editFieldErrors.currentStock" class="text-xs text-rose-400 mt-1">
                {{ editFieldErrors.currentStock }}
              </p>
            </div>
          </div>

          <!-- Checkbox Status Aktif -->
          <div class="pt-1">
            <label class="flex items-center gap-3 cursor-pointer select-none">
              <input
                v-model="editForm.isActive"
                type="checkbox"
                class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900"
              />
              <span class="text-sm text-slate-300">
                Obat aktif dan dapat diresepkan oleh dokter
              </span>
            </label>
          </div>

          <!-- Tombol Aksi Modal -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="isEditing"
              @click="closeEditModal"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              :disabled="isEditing"
            >
              <svg
                v-if="isEditing"
                class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {{ isEditing ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </Button>
          </div>
        </form>
      </Card>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL 3: KONFIRMASI UBAH STATUS (AKTIF / NONAKTIF)        -->
    <!-- ======================================================== -->
    <div
      v-if="isStatusModalOpen && medicineToToggle"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      @click.self="closeStatusModal"
    >
      <Card class="relative w-full max-w-md border-slate-800 bg-slate-900 shadow-2xl p-6">
        <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
        <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-600/40 select-none pointer-events-none">+</div>
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            :class="
              medicineToToggle.isActive
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            "
          >
            <svg
              class="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                v-if="medicineToToggle.isActive"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h3 class="text-base font-bold text-slate-100">
              {{ medicineToToggle.isActive ? 'Nonaktifkan Obat?' : 'Aktifkan Kembali Obat?' }}
            </h3>
            <p class="text-sm text-slate-400 mt-1">
              Apakah Anda yakin ingin {{ medicineToToggle.isActive ? 'menonaktifkan' : 'mengaktifkan kembali' }}
              katalog obat <span class="text-slate-200 font-semibold">'{{ medicineToToggle.name }}'</span>?
            </p>
            <p
              v-if="medicineToToggle.isActive"
              class="text-xs text-rose-400/90 mt-2 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20"
            >
              Obat yang dinonaktifkan tidak akan muncul pada pilihan peresepan dokter baru di klinik.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="isUpdatingStatus"
            @click="closeStatusModal"
          >
            Batal
          </Button>
          <Button
            type="button"
            :variant="medicineToToggle.isActive ? 'danger' : 'primary'"
            size="sm"
            :disabled="isUpdatingStatus"
            @click="handleConfirmToggleStatus"
          >
            <svg
              v-if="isUpdatingStatus"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {{ medicineToToggle.isActive ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan' }}
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
