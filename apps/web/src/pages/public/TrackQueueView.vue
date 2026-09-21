<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import StatusBadge, {
  type ClinicalStatus,
} from "../../components/ui/StatusBadge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import Alert from "../../components/ui/Alert.vue";
import QueueTicketModal from "../../components/queue/QueueTicketModal.vue";
import type { QueueTicketDownloadData } from "../../utils/downloadTicket";

export interface TrackQueueResult {
  queueNumber: string;
  bookingCode: string | null;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  poliName: string;
  doctorName: string;
  patientName: string;
  queueDate: string;
  createdAt: string;
  position: {
    peopleAhead: number;
    currentServing: string | null;
    estimatedWaitMinutes: number | null;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const route = useRoute();
const router = useRouter();
const toast = useToast();

// Mode pencarian: 'code' (Kode Booking) atau 'queueNumber' (Nomor Antrean + Tanggal)
const searchType = ref<"code" | "queueNumber">("code");
const codeInput = ref("");
const queueNumberInput = ref("");
const dateInput = ref(new Date().toISOString().split("T")[0]!);

// Modal Bukti Antrean
const isTicketModalOpen = ref(false);

const ticketData = computed<QueueTicketDownloadData | null>(() => {
  if (!searchResult.value) return null;
  return {
    queueNumber: searchResult.value.queueNumber,
    bookingCode: searchResult.value.bookingCode || "BK-ONLINE",
    patientName: searchResult.value.patientName,
    poliName: searchResult.value.poliName,
    doctorName: searchResult.value.doctorName,
    queueDate: searchResult.value.queueDate,
    status: searchResult.value.status,
    estimasi:
      searchResult.value.position.estimatedWaitMinutes !== null
        ? `± ${searchResult.value.position.estimatedWaitMinutes} menit`
        : "Menunggu giliran",
  };
});

// State siklus hidup pelacakan
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const searchResult = ref<TrackQueueResult | null>(null);
const hasSearched = ref(false);

// Copy to clipboard state
const isCopiedCode = ref(false);
const isCopiedQueue = ref(false);

// Format status label ramah pasien
const statusLabelMap: Record<ClinicalStatus, string> = {
  waiting: "Menunggu Giliran",
  in_progress: "Sedang Dilayani Dokter",
  completed: "Pemeriksaan Selesai",
  cancelled: "Antrean Dibatalkan",
  pending: "Menunggu Verifikasi",
  preparing: "Sedang Diracing",
  ready: "Siap Diambil",
  taken: "Obat Diserahkan",
  in_stock: "Tersedia",
  low_stock: "Stok Menipis",
  out_of_stock: "Stok Habis",
  active: "Aktif",
  inactive: "Nonaktif",
};

// Format tanggal & waktu lokal (Indonesia)
function formatDateTime(isoString: string | Date): string {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(isoString);
  }
}

// Format tanggal saja
function formatDateOnly(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

// Eksekusi pencarian antrean ke backend
async function executeSearch() {
  errorMessage.value = null;

  // Validasi parameter
  if (searchType.value === "code") {
    const trimmed = codeInput.value.trim();
    if (!trimmed) {
      errorMessage.value = "Silakan masukkan kode booking Anda.";
      return;
    }
  } else {
    const trimmedQueue = queueNumberInput.value.trim();
    if (!trimmedQueue) {
      errorMessage.value = "Silakan masukkan nomor antrean Anda.";
      return;
    }
    if (!dateInput.value) {
      errorMessage.value = "Silakan pilih tanggal kunjungan antrean.";
      return;
    }
  }

  isLoading.value = true;
  hasSearched.value = true;

  try {
    const queryParams: Record<string, string> = {};
    if (searchType.value === "code") {
      queryParams["code"] = codeInput.value.trim().toUpperCase();
      // Update URL query parameter
      router.replace({ query: { code: queryParams["code"] } });
    } else {
      queryParams["queueNumber"] = queueNumberInput.value.trim().toUpperCase();
      queryParams["date"] = dateInput.value;
      router.replace({
        query: {
          queueNumber: queryParams["queueNumber"],
          date: queryParams["date"],
        },
      });
    }

    const res = await apiClient<ApiResponse<TrackQueueResult>>(
      "/public/queues/track",
      {
        query: queryParams,
      },
    );

    if (res.success && res.data) {
      searchResult.value = res.data;
    } else {
      searchResult.value = null;
      errorMessage.value =
        res.error?.message || "Data antrean tidak ditemukan di sistem kami.";
    }
  } catch (err: any) {
    console.error("Error tracking queue:", err);
    searchResult.value = null;
    errorMessage.value =
      err?.data?.error?.message ||
      "Data antrean tidak ditemukan. Pastikan kode booking atau nomor antrean dan tanggal kunjungan Anda sudah sesuai.";
  } finally {
    isLoading.value = false;
  }
}

// Salin teks ke papan klip
async function copyToClipboard(text: string, type: "code" | "queue") {
  try {
    await navigator.clipboard.writeText(text);
    if (type === "code") {
      isCopiedCode.value = true;
      setTimeout(() => (isCopiedCode.value = false), 2000);
      toast.success("Kode booking berhasil disalin!");
    } else {
      isCopiedQueue.value = true;
      setTimeout(() => (isCopiedQueue.value = false), 2000);
      toast.success("Nomor antrean berhasil disalin!");
    }
  } catch {
    toast.error("Gagal menyalin otomatis ke papan klip.");
  }
}

// Reset dan cari ulang
function handleResetSearch() {
  searchResult.value = null;
  hasSearched.value = false;
  errorMessage.value = null;
  codeInput.value = "";
  queueNumberInput.value = "";
  router.replace({ query: {} });
}

// Inisialisasi dan sinkronisasi otomatis jika ada parameter query di URL
function syncQueryAndSearch() {
  const codeParam = (route.query["code"] as string | undefined)?.trim();
  const queueNumParam = (route.query["queueNumber"] as string | undefined)?.trim();
  const dateParam = (route.query["date"] as string | undefined)?.trim();

  if (codeParam && codeParam !== searchResult.value?.bookingCode) {
    searchType.value = "code";
    codeInput.value = codeParam;
    executeSearch();
  } else if (
    queueNumParam &&
    (queueNumParam !== searchResult.value?.queueNumber ||
      (dateParam && dateParam !== searchResult.value?.queueDate))
  ) {
    searchType.value = "queueNumber";
    queueNumberInput.value = queueNumParam;
    if (dateParam) {
      dateInput.value = dateParam;
    }
    executeSearch();
  }
}

onMounted(() => {
  syncQueryAndSearch();
});

watch(
  () => [route.query["code"], route.query["queueNumber"], route.query["date"]],
  () => {
    syncQueryAndSearch();
  },
);
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
    <!-- Header Section -->
    <div class="space-y-2 text-center max-w-xl mx-auto">
      <Badge variant="primary" dot>Monitoring Real-time</Badge>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
        Pelacakan Antrean Pasien
      </h1>
      <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
        Pantau status pemeriksaan dan posisi antrean dokter secara langsung dari
        perangkat Anda tanpa harus berdiri di depan layar tunggu.
      </p>
    </div>

    <!-- Search Card -->
    <Card>
      <div class="space-y-4">
        <!-- Search Type Tabs -->
        <div
          class="flex items-center justify-between border-b border-slate-800 pb-3"
        >
          <span class="text-xs font-medium text-slate-400"
            >Metode Pencarian:</span
          >
          <div
            class="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-2xs"
          >
            <button
              type="button"
              @click="searchType = 'code'"
              :class="[
                'px-3 py-1.5 rounded-md transition-colors font-medium',
                searchType === 'code'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200',
              ]"
            >
              Kode Booking
            </button>
            <button
              type="button"
              @click="searchType = 'queueNumber'"
              :class="[
                'px-3 py-1.5 rounded-md transition-colors font-medium',
                searchType === 'queueNumber'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200',
              ]"
            >
              Nomor Antrean
            </button>
          </div>
        </div>

        <!-- Search Form -->
        <form @submit.prevent="executeSearch" class="space-y-3" novalidate>
          <!-- Input Mode 1: Kode Booking -->
          <div v-if="searchType === 'code'" class="space-y-1.5">
            <Input
              id="searchCode"
              label="Kode Booking Tiket"
              placeholder="Contoh: BK-MEJFZQ"
              v-model="codeInput"
              helperText="Kode unik 6-8 digit yang tertera pada tiket pendaftaran online."
              required
            />
          </div>

          <!-- Input Mode 2: Nomor Antrean + Tanggal -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="searchQueueNumber"
              label="Nomor Antrean"
              placeholder="Contoh: A-001"
              v-model="queueNumberInput"
              helperText="Nomor urut poliklinik (contoh: A-001, B-002)"
              required
            />
            <Input
              id="searchDate"
              type="date"
              label="Tanggal Kunjungan"
              v-model="dateInput"
              helperText="Default: jadwal hari ini"
              required
            />
          </div>

          <!-- Action Buttons -->
          <div
            class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <span class="text-2xs text-slate-500 order-2 sm:order-1">
              Data status diperbarui sesuai aktivitas loket dan pemeriksaan
              dokter.
            </span>

            <div
              class="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2 justify-end"
            >
              <Button
                v-if="searchResult || errorMessage"
                type="button"
                variant="ghost"
                size="sm"
                @click="handleResetSearch"
              >
                Reset
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                :loading="isLoading"
                class="w-full sm:w-auto"
              >
                Lacak Status Sekarang →
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Card>

    <!-- ============================================================= -->
    <!-- STATE 1: LOADING STATE (SKELETON) -->
    <!-- ============================================================= -->
    <div
      v-if="isLoading"
      class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 animate-pulse"
    >
      <div
        class="flex justify-between items-center pb-4 border-b border-slate-800"
      >
        <Skeleton variant="text" width="40%" class="h-4" />
        <Skeleton variant="rounded" width="90px" class="h-6" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          v-for="i in 3"
          :key="i"
          class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-center"
        >
          <Skeleton variant="text" width="60%" class="mx-auto h-2.5" />
          <Skeleton variant="rounded" width="50%" class="mx-auto h-8" />
        </div>
      </div>

      <div class="space-y-2 pt-2">
        <Skeleton variant="text" width="100%" class="h-3" />
        <Skeleton variant="text" width="80%" class="h-3" />
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- STATE 2: ERROR / NOT FOUND STATE -->
    <!-- ============================================================= -->
    <Alert
      v-else-if="errorMessage && hasSearched"
      variant="danger"
      title="Data Antrean Tidak Ditemukan"
      class="p-5"
    >
      <p class="leading-relaxed">{{ errorMessage }}</p>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" @click="executeSearch">
          Coba Cari Lagi ⟳
        </Button>
        <router-link
          to="/booking"
          class="text-xs text-blue-400 hover:text-blue-300 font-medium ml-2 inline-flex items-center gap-1"
        >
          Daftar antrean baru di sini →
        </router-link>
      </div>
    </Alert>

    <!-- ============================================================= -->
    <!-- STATE 3: SUCCESS RESULT (HIERARKI VISUAL YANG KUAT) -->
    <!-- ============================================================= -->
    <div v-else-if="searchResult" class="space-y-4">
      <!-- Main Status Card -->
      <div
        class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden"
      >
        <!-- Pixel corner markers -->
        <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>

        <!-- Accent Glow -->
        <div
          :class="[
            'absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-20',
            searchResult.status === 'in_progress'
              ? 'bg-blue-500'
              : searchResult.status === 'completed'
                ? 'bg-emerald-500'
                : searchResult.status === 'cancelled'
                  ? 'bg-rose-500'
                  : 'bg-amber-500',
          ]"
        />

        <!-- Header Card: Info Antrean & Status Badge -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4"
        >
          <div>
            <span
              class="text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              HASIL PELACAKAN STATUS
            </span>
            <h2 class="text-base font-bold text-slate-100 mt-0.5">
              {{ searchResult.poliName }}
            </h2>
          </div>

          <div class="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="gap-1.5 text-xs border-slate-700 hover:border-slate-600 text-slate-200"
              @click="isTicketModalOpen = true"
            >
              <svg class="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Cetak / Unduh Bukti</span>
            </Button>

            <StatusBadge
              :status="searchResult.status"
              :label="statusLabelMap[searchResult.status]"
              size="md"
            />
          </div>
        </div>

        <!-- Big Metric Highlights (Nomor Antrean & Kode Booking) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
          <!-- Nomor Antrean Box -->
          <div
            class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 flex flex-col items-center justify-center"
          >
            <span
              class="text-2xs uppercase font-semibold text-slate-400 tracking-wider"
            >
              Nomor Antrean Anda
            </span>
            <div
              class="text-4xl sm:text-5xl font-mono font-extrabold text-blue-400 tracking-tight my-2"
            >
              {{ searchResult.queueNumber }}
            </div>
            <Button
              size="sm"
              variant="outline"
              class="mt-1"
              @click="copyToClipboard(searchResult.queueNumber, 'queue')"
            >
              <span v-if="isCopiedQueue">✓ Tersalin</span>
              <span v-else>Salin Nomor</span>
            </Button>
          </div>

          <!-- Kode Booking Box -->
          <div
            class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-5 flex flex-col items-center justify-center"
          >
            <span
              class="text-2xs uppercase font-semibold text-slate-400 tracking-wider"
            >
              Kode Booking
            </span>
            <div
              class="text-2xl sm:text-3xl font-mono font-bold text-slate-100 tracking-widest my-3 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800"
            >
              {{ searchResult.bookingCode || "-" }}
            </div>
            <Button
              v-if="searchResult.bookingCode"
              size="sm"
              variant="outline"
              class="mt-1"
              @click="copyToClipboard(searchResult.bookingCode, 'code')"
            >
              <span v-if="isCopiedCode">✓ Tersalin</span>
              <span v-else>Salin Kode</span>
            </Button>
          </div>
        </div>

        <!-- Position & Queue Flow Stats -->
        <div
          v-if="searchResult.status === 'waiting'"
          class="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1 text-center"
        >
          <!-- Pasien di Depan -->
          <div
            class="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80"
          >
            <span
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Pasien di Depan Anda
            </span>
            <div class="text-xl font-bold text-slate-100 mt-1">
              <span
                v-if="searchResult.position.peopleAhead === 0"
                class="text-emerald-400"
              >
                Giliran Berikutnya!
              </span>
              <span v-else>
                {{ searchResult.position.peopleAhead }} Orang
              </span>
            </div>
            <span class="text-2xs text-slate-500 mt-0.5 block">
              Antrean menunggu di poli ini
            </span>
          </div>

          <!-- Sedang Dilayani -->
          <div
            class="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80"
          >
            <span
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Sedang Dilayani Dokter
            </span>
            <div class="text-xl font-mono font-bold text-amber-400 mt-1">
              {{ searchResult.position.currentServing || "Belum Dimulai" }}
            </div>
            <span class="text-2xs text-slate-500 mt-0.5 block">
              Nomor aktif di bilik periksa
            </span>
          </div>

          <!-- Estimasi Waktu Tunggu -->
          <div
            class="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/80"
          >
            <span
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Estimasi Giliran
            </span>
            <div class="text-xl font-bold text-sky-400 mt-1">
              <span v-if="searchResult.position.estimatedWaitMinutes">
                ± {{ searchResult.position.estimatedWaitMinutes }} Menit
              </span>
              <span v-else> Segera Dipanggil </span>
            </div>
            <span class="text-2xs text-slate-500 mt-0.5 block">
              Berdasarkan durasi rerata
            </span>
          </div>
        </div>

        <!-- In Progress Banner -->
        <div
          v-else-if="searchResult.status === 'in_progress'"
          class="p-4 rounded-xl bg-blue-950/40 border border-blue-800/70 text-blue-200 text-xs flex items-center gap-3"
        >
          <span
            class="h-3 w-3 rounded-full bg-blue-400 animate-ping shrink-0"
          />
          <span>
            <strong>Pemberitahuan:</strong> Nomor antrean Anda saat ini sedang
            dipanggil atau dalam pemeriksaan di ruang poliklinik. Silakan segera
            memasuki bilik dokter.
          </span>
        </div>

        <!-- Completed Banner -->
        <div
          v-else-if="searchResult.status === 'completed'"
          class="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-emerald-200 text-xs flex items-center gap-3"
        >
          <span class="text-base">✓</span>
          <span>
            <strong>Pemeriksaan Dokter Selesai:</strong> Apabila dokter
            memberikan resep obat, silakan menuju loket instalasi farmasi
            klinik.
          </span>
        </div>

        <!-- Cancelled Banner -->
        <div
          v-else-if="searchResult.status === 'cancelled'"
          class="p-4 rounded-xl bg-rose-950/40 border border-rose-800/70 text-rose-200 text-xs flex items-center gap-3"
        >
          <span class="text-base">✕</span>
          <span>
            <strong>Antrean Dibatalkan:</strong> Tiket antrean ini sudah
            dibatalkan. Silakan mendaftar antrean baru jika Anda masih
            memerlukan pelayanan medis.
          </span>
        </div>

        <!-- Detailed Information Grid -->
        <div
          class="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
        >
          <div class="space-y-2 text-slate-300">
            <div class="flex justify-between sm:justify-start sm:gap-4">
              <span class="text-slate-500 w-28">Nama Pasien:</span>
              <span class="font-medium text-slate-200">{{
                searchResult.patientName
              }}</span>
            </div>
            <div class="flex justify-between sm:justify-start sm:gap-4">
              <span class="text-slate-500 w-28">Dokter Pemeriksa:</span>
              <span class="font-medium text-slate-200">{{
                searchResult.doctorName
              }}</span>
            </div>
            <div class="flex justify-between sm:justify-start sm:gap-4">
              <span class="text-slate-500 w-28">Poliklinik:</span>
              <span class="font-medium text-slate-200">{{
                searchResult.poliName
              }}</span>
            </div>
          </div>

          <div class="space-y-2 text-slate-300">
            <div class="flex justify-between sm:justify-start sm:gap-4">
              <span class="text-slate-500 w-28">Tanggal Kunjungan:</span>
              <span class="font-medium text-slate-200">{{
                formatDateOnly(searchResult.queueDate)
              }}</span>
            </div>
            <div class="flex justify-between sm:justify-start sm:gap-4">
              <span class="text-slate-500 w-28">Waktu Pendaftaran:</span>
              <span class="font-medium text-slate-200">{{
                formatDateTime(searchResult.createdAt)
              }}</span>
            </div>
            <div class="flex justify-between sm:justify-start sm:gap-4">
              <span class="text-slate-500 w-28">Privasi Pasien:</span>
              <span class="text-2xs text-slate-400"
                >Nama disamarkan untuk layar publik</span
              >
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div
          class="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
        >
          <span class="text-slate-400 text-center sm:text-left">
            Perbarui data secara berkala untuk memantau panggilan terkini.
          </span>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button size="sm" variant="outline" @click="handleResetSearch">
              Cari Antrean Lain
            </Button>

            <Button
              size="sm"
              variant="secondary"
              :loading="isLoading"
              @click="executeSearch"
            >
              Muat Ulang Status ⟳
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- STATE 4: IDLE STATE (BELUM MELAKUKAN PENCARIAN) -->
    <!-- ============================================================= -->
    <EmptyState
      v-else-if="!hasSearched"
      title="Belum ada antrean yang dilacak"
      description="Gunakan formulir pencarian di atas dengan memasukkan Kode Booking atau Nomor Antrean untuk melihat giliran dokter dan estimasi waktu tunggu secara langsung."
    >
      <template #action>
        <router-link to="/booking">
          <Button size="sm" variant="primary"> Daftar Antrean Baru → </Button>
        </router-link>
      </template>
    </EmptyState>

    <!-- Modal Bukti Antrean -->
    <QueueTicketModal
      :is-open="isTicketModalOpen"
      :ticket="ticketData"
      @close="isTicketModalOpen = false"
    />
  </div>
</template>
