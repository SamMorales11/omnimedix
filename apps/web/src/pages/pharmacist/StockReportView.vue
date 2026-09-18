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

export interface StockReportMedicine {
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

export interface StockReportSummary {
  totalMedicines: number;
  lowStockCount: number;
  outOfStockCount: number;
  normalStockCount: number;
}

export interface StockReportData {
  summary: StockReportSummary;
  medicines: StockReportMedicine[];
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

// State Laporan
const reportData = ref<StockReportData | null>(null);
const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref<string | null>(null);

// Filter
const filterLowStockOnly = ref(false);
const selectedCategory = ref("all");
const searchQuery = ref("");

// Ambil laporan stok dari API
async function fetchStockReport(showRefreshingIndicator = false) {
  if (showRefreshingIndicator) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }
  errorMessage.value = null;

  try {
    const queryParams = new URLSearchParams();

    if (filterLowStockOnly.value) {
      queryParams.set("lowStockOnly", "true");
    }

    if (selectedCategory.value !== "all") {
      queryParams.set("category", selectedCategory.value);
    }

    const response = await apiClient<ApiResponse<StockReportData>>(
      `/pharmacist/reports/stock?${queryParams.toString()}`,
    );

    if (response.success && response.data) {
      reportData.value = response.data;
    } else {
      throw new Error(response.error?.message || "Gagal memuat laporan stok.");
    }
  } catch (err: unknown) {
    console.error("Gagal memuat laporan stok:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kesalahan saat memuat data laporan stok.";
    toast.error(errorMessage.value!, "Gagal Memuat Laporan");
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

// Handler ganti filter stok rendah
function toggleLowStockFilter(enable: boolean) {
  filterLowStockOnly.value = enable;
  fetchStockReport();
}

// Daftar kategori dari data obat
const categories = computed(() => {
  if (!reportData.value) return [];
  const set = new Set<string>();
  reportData.value.medicines.forEach((m) => {
    if (m.category) set.add(m.category);
  });
  return Array.from(set).sort();
});

// Filter obat di client jika ada search query
const displayedMedicines = computed(() => {
  if (!reportData.value) return [];
  let list = reportData.value.medicines;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q),
    );
  }

  return list;
});

// Format tanggal laporan
const generatedDateString = computed(() => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
});

onMounted(() => {
  fetchStockReport();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Section -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold tracking-tight text-slate-100">
            Laporan Ketersediaan Stok Obat
          </h1>
          <Badge variant="info">Unit Farmasi</Badge>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Ikhtisar stok obat, pemantauan batas minimum, dan deteksi dini obat
          yang habis atau menipis.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          :loading="isRefreshing"
          @click="fetchStockReport(true)"
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

        <Button
          variant="primary"
          size="sm"
          @click="router.push('/pharmacist/medicines')"
        >
          Kelola Master Obat
        </Button>
      </div>
    </div>

    <!-- Error Alert jika gagal fetch -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Memuat Laporan Stok"
      dismissible
      @dismiss="errorMessage = null"
    >
      {{ errorMessage }}
      <div class="mt-2">
        <Button size="sm" variant="secondary" @click="fetchStockReport(false)">
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Ringkasan Stok (Summary Cards) -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <Card v-for="i in 4" :key="i">
        <Skeleton class="h-4 w-24 mb-2" />
        <Skeleton class="h-8 w-16 mb-2" />
        <Skeleton class="h-3 w-32" />
      </Card>
    </div>

    <div v-else-if="reportData" class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <!-- Total Obat -->
      <Card
        class="cursor-pointer transition-colors"
        :class="
          !filterLowStockOnly
            ? 'ring-2 ring-blue-500/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="toggleLowStockFilter(false)"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Total Obat</span>
          <span class="h-2 w-2 rounded-full bg-blue-400" />
        </div>
        <div class="text-2xl font-extrabold text-slate-100 mt-1.5">
          {{ reportData.summary.totalMedicines }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Seluruh jenis obat</div>
      </Card>

      <!-- Stok Normal -->
      <Card
        class="cursor-pointer transition-colors"
        :class="!filterLowStockOnly ? 'hover:border-slate-700' : ''"
        @click="toggleLowStockFilter(false)"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Stok Normal</span>
          <span class="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1.5">
          {{ reportData.summary.normalStockCount }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Aman di atas minimum</div>
      </Card>

      <!-- Stok Rendah / Menipis -->
      <Card
        class="cursor-pointer transition-colors"
        :class="
          filterLowStockOnly
            ? 'ring-2 ring-amber-500/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="toggleLowStockFilter(true)"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Stok Rendah</span>
          <span class="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <div class="text-2xl font-extrabold text-amber-400 mt-1.5">
          {{ reportData.summary.lowStockCount }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">&le; batas minimum</div>
      </Card>

      <!-- Stok Habis -->
      <Card
        class="cursor-pointer transition-colors"
        :class="
          filterLowStockOnly
            ? 'ring-2 ring-rose-500/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="toggleLowStockFilter(true)"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Stok Habis</span>
          <span class="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
        </div>
        <div class="text-2xl font-extrabold text-rose-400 mt-1.5">
          {{ reportData.summary.outOfStockCount }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Perlu restock segera</div>
      </Card>
    </div>

    <!-- Toolbar Filter & Search -->
    <Card>
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <!-- Filter Toggle Stok Rendah Saja -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="[
              !filterLowStockOnly
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200',
            ]"
            @click="toggleLowStockFilter(false)"
          >
            Semua Obat
          </button>

          <button
            type="button"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
            :class="[
              filterLowStockOnly
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200',
            ]"
            @click="toggleLowStockFilter(true)"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            Hanya Stok Rendah / Habis
          </button>
        </div>

        <!-- Filter Kategori & Search -->
        <div class="flex flex-col sm:flex-row items-center gap-3">
          <!-- Dropdown Kategori -->
          <div class="w-full sm:w-44">
            <select
              v-model="selectedCategory"
              @change="fetchStockReport()"
              class="w-full h-9 rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Semua Kategori</option>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>

          <!-- Input Search -->
          <div class="w-full sm:w-60">
            <Input
              v-model="searchQuery"
              placeholder="Cari nama atau kategori obat..."
              size="sm"
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

    <!-- Table Section -->
    <Card>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold text-slate-100">
              Rincian Ketersediaan Obat ({{ displayedMedicines.length }} Obat)
            </h2>
            <Badge v-if="filterLowStockOnly" variant="warning">
              Filter: Stok Kritis
            </Badge>
          </div>
          <div class="text-[11px] text-slate-400 font-mono">
            Per: {{ generatedDateString }}
          </div>
        </div>
      </template>

      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="space-y-4 py-2">
        <div
          v-for="i in 6"
          :key="i"
          class="flex items-center justify-between p-3 border-b border-slate-800/60"
        >
          <div class="space-y-2">
            <Skeleton class="h-4 w-44" />
            <Skeleton class="h-3 w-28" />
          </div>
          <div class="flex items-center gap-3">
            <Skeleton class="h-5 w-20" />
            <Skeleton class="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="displayedMedicines.length === 0"
        title="Tidak Ada Data Obat Ditemukan"
        :description="
          filterLowStockOnly
            ? 'Kabar baik! Seluruh stok obat farmasi saat ini dalam kondisi normal di atas batas minimum.'
            : 'Belum ada data obat yang sesuai dengan filter atau pencarian Anda.'
        "
      >
        <template #action>
          <Button
            v-if="
              filterLowStockOnly || searchQuery || selectedCategory !== 'all'
            "
            size="sm"
            variant="secondary"
            @click="
              filterLowStockOnly = false;
              searchQuery = '';
              selectedCategory = 'all';
              fetchStockReport();
            "
          >
            Tampilkan Semua Obat
          </Button>
        </template>
      </EmptyState>

      <!-- Report Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead
            class="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800"
          >
            <tr>
              <th class="p-3.5">#</th>
              <th class="p-3.5">Nama Obat</th>
              <th class="p-3.5">Kategori</th>
              <th class="p-3.5">Satuan</th>
              <th class="p-3.5">Stok Saat Ini</th>
              <th class="p-3.5">Batas Minimum</th>
              <th class="p-3.5">Selisih Minimum</th>
              <th class="p-3.5">Status Ketersediaan</th>
              <th class="p-3.5 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80">
            <tr
              v-for="(med, index) in displayedMedicines"
              :key="med.id"
              class="hover:bg-slate-900/60 transition-colors"
            >
              <!-- Index -->
              <td class="p-3.5 font-mono text-slate-500">
                {{ index + 1 }}
              </td>

              <!-- Nama Obat -->
              <td class="p-3.5">
                <div class="font-semibold text-slate-100 text-sm">
                  {{ med.name }}
                </div>
                <div class="text-[10px] font-mono text-slate-500 mt-0.5">
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

              <!-- Satuan -->
              <td class="p-3.5 text-slate-300">
                {{ med.unit }}
              </td>

              <!-- Stok Saat Ini -->
              <td class="p-3.5 whitespace-nowrap">
                <span
                  class="font-bold text-sm font-mono"
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
              <td class="p-3.5 whitespace-nowrap font-mono text-slate-400">
                {{ med.minStock }} {{ med.unit }}
              </td>

              <!-- Selisih Minimum (Defisit) -->
              <td class="p-3.5 whitespace-nowrap font-mono">
                <span
                  v-if="med.currentStock < med.minStock"
                  class="text-rose-400 font-bold"
                >
                  -{{ med.minStock - med.currentStock }} {{ med.unit }}
                </span>
                <span v-else class="text-emerald-400 text-xs">
                  +{{ med.currentStock - med.minStock }} (Aman)
                </span>
              </td>

              <!-- Status Ketersediaan -->
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
                  Stok Rendah
                </span>

                <span
                  v-else
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                >
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Normal
                </span>
              </td>

              <!-- Tindakan: Restock / Catat Masuk -->
              <td class="p-3.5 text-right whitespace-nowrap">
                <Button
                  size="sm"
                  :variant="
                    med.stockStatus !== 'normal' ? 'primary' : 'secondary'
                  "
                  @click="
                    router.push(`/pharmacist/stock-in?medicineId=${med.id}`)
                  "
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
                  Restock
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
