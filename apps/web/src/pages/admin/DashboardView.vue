<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { apiClient } from "../../utils/api";
import Card from "../../components/ui/Card.vue";
import Badge from "../../components/ui/Badge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import Button from "../../components/ui/Button.vue";
import Alert from "../../components/ui/Alert.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import type { AdminDashboardSummaryResponse } from "@omnimedix/shared";

// State
const isLoading = ref(true);
const errorMessage = ref<string | null>(null);
const summary = ref<AdminDashboardSummaryResponse | null>(null);

// Format tanggal lokal Indonesia
const formattedToday = computed(() => {
  const dateStr = summary.value?.today;
  const dateObj = dateStr ? new Date(dateStr) : new Date();
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);
});

// Hitung total stok kritis (stok rendah + stok habis)
const criticalStockTotal = computed(() => {
  if (!summary.value) return 0;
  return summary.value.medicines.lowStock + summary.value.medicines.outOfStock;
});

// Persentase antrean selesai
const queueCompletionRate = computed(() => {
  if (!summary.value || summary.value.queues.todayTotal === 0) return 0;
  return Math.round(
    (summary.value.queues.completed / summary.value.queues.todayTotal) * 100,
  );
});

// Format waktu relatif untuk log aktivitas
function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  } catch {
    return isoString;
  }
}

// Badge variant untuk aksi audit log
function getActionBadgeVariant(
  action: string,
): "default" | "primary" | "success" | "warning" | "danger" | "info" {
  switch (action.toUpperCase()) {
    case "CREATE":
      return "success";
    case "UPDATE":
      return "info";
    case "DELETE":
      return "danger";
    default:
      return "default";
  }
}

// Fetch data ringkasan dashboard
async function fetchDashboardSummary() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const res = await apiClient<{
      success: boolean;
      data: AdminDashboardSummaryResponse;
    }>("/admin/dashboard/summary");

    if (res.success && res.data) {
      summary.value = res.data;
    } else {
      throw new Error("Format respon server tidak valid.");
    }
  } catch (err: unknown) {
    const errorObj = err as { data?: { error?: { message?: string } }; message?: string };
    errorMessage.value =
      errorObj.data?.error?.message ||
      errorObj.message ||
      "Gagal memuat ringkasan dashboard admin. Silakan coba kembali.";
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchDashboardSummary();
});
</script>

<template>
  <div class="space-y-8">
    <!-- Header: Judul, Status Tanggal & Tombol Refresh -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-5"
    >
      <div>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="primary" size="sm" dot>Administrator</Badge>
          <span class="text-xs text-slate-500 font-mono tracking-wider uppercase">Overview</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
          Dashboard Utama
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Ikhtisar operasional harian klinik, pelayanan medis, ketersediaan obat, dan audit aktivitas sistem.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg shadow-sm">
          <svg
            class="h-3.5 w-3.5 text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span class="font-medium font-mono text-slate-300">{{ formattedToday }}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          :disabled="isLoading"
          @click="fetchDashboardSummary"
          class="shrink-0"
          title="Perbarui data"
        >
          <svg
            :class="['h-3.5 w-3.5 sm:mr-1.5', isLoading && 'animate-spin']"
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
          <span class="hidden sm:inline">Segarkan</span>
        </Button>
      </div>
    </div>

    <!-- Error State -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Mengambil Data"
      class="mb-6"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-1">
        <span>{{ errorMessage }}</span>
        <Button
          variant="danger"
          size="sm"
          @click="fetchDashboardSummary"
          class="shrink-0"
        >
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Loading Skeleton State -->
    <div v-if="isLoading" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card v-for="i in 5" :key="i" class="p-5 border-slate-800 bg-slate-900/60">
          <Skeleton variant="text" width="60%" class="mb-3" />
          <Skeleton variant="text" height="2rem" width="40%" class="mb-2" />
          <Skeleton variant="text" width="80%" />
        </Card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card class="lg:col-span-2 p-6 border-slate-800 bg-slate-900/60">
          <Skeleton variant="text" width="40%" height="1.25rem" class="mb-4" />
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Skeleton v-for="j in 4" :key="j" height="4.5rem" variant="rounded" />
          </div>
        </Card>
        <Card class="p-6 border-slate-800 bg-slate-900/60">
          <Skeleton variant="text" width="50%" height="1.25rem" class="mb-4" />
          <div class="space-y-3">
            <Skeleton v-for="k in 4" :key="k" height="2.5rem" variant="rounded" />
          </div>
        </Card>
      </div>
    </div>

    <!-- Content-First Dashboard Grid -->
    <div v-else-if="summary" class="space-y-6">
      <!-- 5 Kartu Ringkasan Utama (Tegas, Bersih, dan Beraksen Teknis) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <!-- 1. Antrean Hari Ini -->
        <Card hoverable class="relative overflow-hidden flex flex-col justify-between border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Antrean Hari Ini</span>
              <span
                class="h-2 w-2 rounded-full ring-2 ring-blue-500/20"
                :class="summary.queues.todayTotal > 0 ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'"
              />
            </div>
            <div class="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-100">
              {{ summary.queues.todayTotal }}
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <div class="flex items-center gap-1.5 font-mono text-[11px]">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>{{ summary.queues.waiting }} tunggu</span>
            </div>
            <div class="flex items-center gap-1.5 font-mono text-[11px]">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{{ summary.queues.completed }} selesai</span>
            </div>
          </div>
        </Card>

        <!-- 2. Jumlah Pasien Terdaftar -->
        <Card hoverable class="relative overflow-hidden flex flex-col justify-between border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>

          <div>
            <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Total Pasien</span>
              <svg
                class="h-4 w-4 text-slate-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div class="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-100">
              {{ summary.patients.total }}
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <Badge variant="default" size="sm" class="font-normal text-2xs">Rekam Medis</Badge>
            <span class="text-slate-500 font-mono text-2xs">Terverifikasi</span>
          </div>
        </Card>

        <!-- 3. Dokter Aktif -->
        <Card hoverable class="relative overflow-hidden flex flex-col justify-between border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Dokter Aktif</span>
              <span class="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            </div>
            <div class="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-emerald-400">
              {{ summary.doctors.totalActive }}
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span class="text-emerald-500 font-medium">Siap praktik</span>
            <span class="text-slate-500 font-mono">Total: {{ summary.doctors.total }}</span>
          </div>
        </Card>

        <!-- 4. Stok Kritis (Habis + Rendah) -->
        <Card hoverable class="relative overflow-hidden flex flex-col justify-between border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-rose-600/40 select-none pointer-events-none">+</div>
          <div v-if="criticalStockTotal > 0" class="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Stok Obat Kritis</span>
              <span
                class="h-2 w-2 rounded-full"
                :class="criticalStockTotal > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'"
              />
            </div>
            <div
              class="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight"
              :class="criticalStockTotal > 0 ? 'text-rose-400' : 'text-slate-100'"
            >
              {{ criticalStockTotal }}
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span class="text-rose-400 font-medium">{{ summary.medicines.outOfStock }} Habis</span>
            <span class="text-amber-400 font-medium">{{ summary.medicines.lowStock }} Menipis</span>
          </div>
        </Card>

        <!-- 5. Resep Perlu Ditangani -->
        <Card hoverable class="relative overflow-hidden flex flex-col justify-between border-slate-800 bg-slate-900/70 backdrop-blur-sm">
          <div class="absolute -top-1 -left-1 font-mono text-[9px] text-sky-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -top-1 -right-1 font-mono text-[9px] text-sky-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-sky-600/40 select-none pointer-events-none">+</div>
          <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-sky-600/40 select-none pointer-events-none">+</div>
          <div v-if="summary.prescriptions.totalActive > 0" class="absolute -right-6 -bottom-6 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div class="flex items-center justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Resep Aktif</span>
              <span
                class="h-2 w-2 rounded-full ring-2 ring-sky-500/20"
                :class="summary.prescriptions.totalActive > 0 ? 'bg-sky-400' : 'bg-slate-600'"
              />
            </div>
            <div
              class="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight"
              :class="summary.prescriptions.totalActive > 0 ? 'text-sky-300' : 'text-slate-100'"
            >
              {{ summary.prescriptions.totalActive }}
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span class="text-amber-300 font-medium">{{ summary.prescriptions.pending }} Baru</span>
            <span class="text-sky-400 font-medium">{{ summary.prescriptions.preparing }} Diproses</span>
          </div>
        </Card>
      </div>

      <!-- Detail Layanan Harian & Aktivitas Sistem Terkini -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Rincian Status Antrean & Resep Hari Ini -->
        <div class="lg:col-span-2 space-y-6">
          <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm">
            <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>

            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-semibold tracking-tight text-slate-100">
                    Progres Antrean Hari Ini
                  </h3>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Tingkat penyelesaian layanan: <span class="text-emerald-400 font-semibold font-mono">{{ queueCompletionRate }}%</span> dari total kunjungan
                  </p>
                </div>
                <Badge
                  :variant="queueCompletionRate === 100 && summary.queues.todayTotal > 0 ? 'success' : 'default'"
                  class="font-mono text-xs"
                >
                  {{ summary.queues.todayTotal }} Pasien
                </Badge>
              </div>
            </template>

            <!-- Progress Bar Antrean -->
            <div class="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden flex mb-6 border border-slate-800">
              <div
                v-if="summary.queues.completed > 0"
                class="bg-emerald-500 h-full transition-all duration-300"
                :style="{ width: `${(summary.queues.completed / (summary.queues.todayTotal || 1)) * 100}%` }"
                title="Selesai"
              />
              <div
                v-if="summary.queues.inProgress > 0"
                class="bg-blue-500 h-full transition-all duration-300"
                :style="{ width: `${(summary.queues.inProgress / (summary.queues.todayTotal || 1)) * 100}%` }"
                title="Sedang Dilayani"
              />
              <div
                v-if="summary.queues.waiting > 0"
                class="bg-amber-500 h-full transition-all duration-300"
                :style="{ width: `${(summary.queues.waiting / (summary.queues.todayTotal || 1)) * 100}%` }"
                title="Menunggu"
              />
              <div
                v-if="summary.queues.cancelled > 0"
                class="bg-slate-600 h-full transition-all duration-300"
                :style="{ width: `${(summary.queues.cancelled / (summary.queues.todayTotal || 1)) * 100}%` }"
                title="Dibatalkan"
              />
            </div>

            <!-- Breakdown 4 Status Antrean -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-amber-400 flex items-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-amber-400" />
                  Menunggu
                </span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.queues.waiting }}</span>
              </div>

              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-blue-400 flex items-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-blue-400" />
                  Dilayani
                </span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.queues.inProgress }}</span>
              </div>

              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-emerald-400" />
                  Selesai
                </span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.queues.completed }}</span>
              </div>

              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mb-1">
                  <span class="h-2 w-2 rounded-full bg-slate-500" />
                  Batal
                </span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.queues.cancelled }}</span>
              </div>
            </div>
          </Card>

          <!-- Resep & Farmasi Ringkasan Komprehensif -->
          <Card class="relative border-slate-800 bg-slate-900/70 backdrop-blur-sm">
            <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>

            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-semibold tracking-tight text-slate-100">
                    Status Resep & Farmasi
                  </h3>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Alur peracikan obat dan penyerahan ke pasien
                  </p>
                </div>
                <Badge variant="info" class="font-mono text-xs">
                  Total Siap / Diambil: {{ summary.prescriptions.ready + summary.prescriptions.taken }}
                </Badge>
              </div>
            </template>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-amber-400 mb-1 block">Pending (Masuk)</span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.prescriptions.pending }}</span>
              </div>
              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-sky-400 mb-1 block">Preparing (Diracik)</span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.prescriptions.preparing }}</span>
              </div>
              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-emerald-400 mb-1 block">Ready (Siap Diambil)</span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.prescriptions.ready }}</span>
              </div>
              <div class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/60 transition-colors">
                <span class="text-[11px] font-medium text-slate-400 mb-1 block">Taken (Diserahkan)</span>
                <span class="text-2xl font-bold font-mono text-slate-100">{{ summary.prescriptions.taken }}</span>
              </div>
            </div>
          </Card>
        </div>

        <!-- Log Aktivitas Terbaru (Audit Logs) -->
        <div>
          <Card class="relative h-full flex flex-col justify-between border-slate-800 bg-slate-900/70 backdrop-blur-sm">
            <div class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>
            <div class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700/60 select-none pointer-events-none">+</div>

            <template #header>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-semibold tracking-tight text-slate-100">
                    Aktivitas Sistem Terkini
                  </h3>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Rekam jejak audit keamanan & operasional
                  </p>
                </div>
                <span class="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
            </template>

            <!-- List Aktivitas -->
            <div class="space-y-3 divide-y divide-slate-800/60 -mt-2">
              <div
                v-for="activity in summary.recentActivities.slice(0, 6)"
                :key="activity.id"
                class="pt-3 first:pt-0"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs font-semibold text-slate-200 truncate">
                        {{ activity.userName || activity.userEmail || "Sistem" }}
                      </span>
                      <Badge
                        v-if="activity.userRole"
                        size="sm"
                        variant="default"
                        class="text-2xs py-0 px-1 font-mono"
                      >
                        {{ activity.userRole }}
                      </Badge>
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {{ activity.action }} entitas <span class="text-slate-300 font-mono">{{ activity.entity }}</span>
                    </p>
                  </div>

                  <div class="text-right shrink-0">
                    <Badge :variant="getActionBadgeVariant(activity.action)" size="sm">
                      {{ activity.action }}
                    </Badge>
                    <div class="text-[10px] text-slate-500 mt-1 font-mono">
                      {{ formatTimeAgo(activity.createdAt) }}
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-if="summary.recentActivities.length === 0"
                class="text-center py-8 text-xs text-slate-500"
              >
                Belum ada aktivitas audit tercatat.
              </div>
            </div>

            <!-- Footer -->
            <div class="mt-4 pt-3 border-t border-slate-800/80 text-center">
              <span class="text-2xs font-mono text-slate-500">
                Log audit disinkronkan secara real-time
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>

    <!-- Fallback Empty State jika data ringkasan tidak tersedia -->
    <div v-else class="py-12">
      <EmptyState
        title="Ringkasan Dashboard Belum Tersedia"
        description="Data ringkasan operasional klinik tidak dapat dimuat saat ini. Silakan coba segarkan kembali."
      >
        <template #action>
          <Button size="sm" variant="primary" @click="fetchDashboardSummary">
            Segarkan Dashboard ⟳
          </Button>
        </template>
      </EmptyState>
    </div>
  </div>
</template>
