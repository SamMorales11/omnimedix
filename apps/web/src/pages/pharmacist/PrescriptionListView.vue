<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import StatusBadge from "../../components/ui/StatusBadge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import Alert from "../../components/ui/Alert.vue";

export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  dosage: string | null;
  quantity: number;
  instructions: string;
  currentStock: number;
  createdAt: string;
}

export interface PrescriptionPatient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  phone: string | null;
  nik: string | null;
}

export interface PrescriptionDoctor {
  id: string;
  name: string;
  specialization: string;
  poliName: string;
}

export interface PrescriptionQueue {
  id: string;
  queueNumber: string;
  bookingCode: string | null;
  queueDate: string;
  diagnosis: string | null;
  notes: string | null;
}

export interface PharmacistPrescription {
  id: string;
  queueId: string | null;
  queue: PrescriptionQueue | null;
  doctorId: string;
  doctor: PrescriptionDoctor;
  patientId: string;
  patient: PrescriptionPatient;
  status: "pending" | "preparing" | "ready" | "taken";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: PrescriptionItem[];
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

// State resep
const prescriptions = ref<PharmacistPrescription[]>([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref<string | null>(null);

// State filter & search
const selectedStatus = ref<"all" | "pending" | "preparing" | "ready" | "taken">(
  "all",
);
const searchQuery = ref("");

// Ambil daftar resep dari API
async function fetchPrescriptions(showRefreshingIndicator = false) {
  if (showRefreshingIndicator) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }
  errorMessage.value = null;

  try {
    const queryParams = new URLSearchParams();
    if (selectedStatus.value !== "all") {
      queryParams.set("status", selectedStatus.value);
    } else {
      queryParams.set("status", "all");
    }

    if (searchQuery.value.trim()) {
      queryParams.set("search", searchQuery.value.trim());
    }

    const response = await apiClient<ApiResponse<PharmacistPrescription[]>>(
      `/pharmacist/prescriptions?${queryParams.toString()}`,
    );

    if (response.success && Array.isArray(response.data)) {
      prescriptions.value = response.data;
    } else {
      prescriptions.value = [];
    }
  } catch (err: unknown) {
    console.error("Gagal memuat resep farmasi:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kesalahan saat memuat daftar resep apotek.";
    toast.error(errorMessage.value!, "Koneksi Gagal");
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

// Handler ganti filter status
function handleStatusFilter(
  status: "all" | "pending" | "preparing" | "ready" | "taken",
) {
  selectedStatus.value = status;
  fetchPrescriptions();
}

// Handler pencarian dengan debounce sederhana
let searchTimer: ReturnType<typeof setTimeout> | null = null;
function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    fetchPrescriptions();
  }, 350);
}

// Menghitung ringkasan status di client
const stats = computed(() => {
  const all = prescriptions.value;
  return {
    total: all.length,
    pending: all.filter((p) => p.status === "pending").length,
    preparing: all.filter((p) => p.status === "preparing").length,
    ready: all.filter((p) => p.status === "ready").length,
    taken: all.filter((p) => p.status === "taken").length,
  };
});

// Format waktu
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return "-";
  }
}

// Navigasi ke detail resep
function goToDetail(prescriptionId: string) {
  router.push(`/pharmacist/prescriptions/${prescriptionId}`);
}

onMounted(() => {
  fetchPrescriptions();
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
            Daftar Resep & Dispensing Obat
          </h1>
          <Badge variant="info">Unit Farmasi</Badge>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Kelola verifikasi resep dokter, proses peracikan, dan penyerahan obat
          ke pasien.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          :loading="isRefreshing"
          @click="fetchPrescriptions(true)"
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
      </div>
    </div>

    <!-- Quick Stats Metric Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <Card
        class="cursor-pointer transition-colors"
        :class="
          selectedStatus === 'pending'
            ? 'ring-2 ring-amber-500/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="handleStatusFilter('pending')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium"
            >Menunggu (Pending)</span
          >
          <span class="h-2 w-2 rounded-full bg-amber-400" />
        </div>
        <div class="text-2xl font-extrabold text-amber-400 mt-1.5">
          {{ stats.pending }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Perlu diracik</div>
      </Card>

      <Card
        class="cursor-pointer transition-colors"
        :class="
          selectedStatus === 'preparing'
            ? 'ring-2 ring-blue-500/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="handleStatusFilter('preparing')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Sedang Diracik</span>
          <span class="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        </div>
        <div class="text-2xl font-extrabold text-blue-400 mt-1.5">
          {{ stats.preparing }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Dalam pengerjaan</div>
      </Card>

      <Card
        class="cursor-pointer transition-colors"
        :class="
          selectedStatus === 'ready'
            ? 'ring-2 ring-emerald-500/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="handleStatusFilter('ready')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Siap Diambil</span>
          <span class="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1.5">
          {{ stats.ready }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Menunggu pasien</div>
      </Card>

      <Card
        class="cursor-pointer transition-colors"
        :class="
          selectedStatus === 'taken'
            ? 'ring-2 ring-slate-400/50 bg-slate-900'
            : 'hover:border-slate-700'
        "
        @click="handleStatusFilter('taken')"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-400 font-medium">Diserahkan</span>
          <span class="h-2 w-2 rounded-full bg-slate-400" />
        </div>
        <div class="text-2xl font-extrabold text-slate-300 mt-1.5">
          {{ stats.taken }}
        </div>
        <div class="text-[11px] text-slate-500 mt-1">Selesai diserahkan</div>
      </Card>
    </div>

    <!-- Error Alert jika ada gangguan fetch -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Memuat Resep"
      dismissible
      @dismiss="errorMessage = null"
    >
      {{ errorMessage }}
      <div class="mt-2">
        <Button
          size="sm"
          variant="secondary"
          @click="fetchPrescriptions(false)"
        >
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
            @click="handleStatusFilter('all')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Semua
          </button>
          <button
            type="button"
            @click="handleStatusFilter('pending')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Pending
          </button>
          <button
            type="button"
            @click="handleStatusFilter('preparing')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStatus === 'preparing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Diracik
          </button>
          <button
            type="button"
            @click="handleStatusFilter('ready')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStatus === 'ready'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Siap Diambil
          </button>
          <button
            type="button"
            @click="handleStatusFilter('taken')"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0',
              selectedStatus === 'taken'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Diserahkan
          </button>
        </div>

        <!-- Search Box -->
        <div class="w-full lg:w-72">
          <Input
            v-model="searchQuery"
            placeholder="Cari pasien / dokter / no antrean..."
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
    </Card>

    <!-- Content: Loading Skeleton, Empty State, atau Tabel Resep -->
    <Card>
      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="space-y-4 py-2">
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center justify-between p-3 border-b border-slate-800/60"
        >
          <div class="space-y-2">
            <Skeleton class="h-4 w-40" />
            <Skeleton class="h-3 w-64" />
          </div>
          <div class="flex items-center gap-3">
            <Skeleton class="h-6 w-24 rounded-full" />
            <Skeleton class="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="prescriptions.length === 0"
        title="Belum Ada Resep Ditemukan"
        :description="
          selectedStatus !== 'all'
            ? `Tidak ada resep dengan status '${selectedStatus}'. Silakan ubah filter untuk melihat data lain.`
            : 'Belum ada resep yang diteruskan dari dokter untuk saat ini.'
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
          <Button
            v-if="selectedStatus !== 'all' || searchQuery"
            size="sm"
            variant="secondary"
            @click="
              selectedStatus = 'all';
              searchQuery = '';
              fetchPrescriptions();
            "
          >
            Reset Filter
          </Button>
        </template>
      </EmptyState>

      <!-- Prescription List Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead
            class="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800"
          >
            <tr>
              <th class="p-3.5">Antrean / Kode</th>
              <th class="p-3.5">Data Pasien</th>
              <th class="p-3.5">Dokter & Poli</th>
              <th class="p-3.5">Item Obat</th>
              <th class="p-3.5">Waktu</th>
              <th class="p-3.5">Status Resep</th>
              <th class="p-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80">
            <tr
              v-for="rx in prescriptions"
              :key="rx.id"
              class="hover:bg-slate-900/60 transition-colors group cursor-pointer"
              @click="goToDetail(rx.id)"
            >
              <!-- Antrean / ID -->
              <td class="p-3.5 whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span
                    class="font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-xs"
                  >
                    {{ rx.queue?.queueNumber || "No Queue" }}
                  </span>
                </div>
                <div
                  v-if="rx.queue?.bookingCode"
                  class="text-[11px] font-mono text-slate-500 mt-1"
                >
                  {{ rx.queue.bookingCode }}
                </div>
              </td>

              <!-- Pasien -->
              <td class="p-3.5">
                <div class="font-medium text-slate-200">
                  {{ rx.patient.fullName }}
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  {{ rx.patient.gender === "MALE" ? "Laki-laki" : "Perempuan" }}
                  <span v-if="rx.patient.phone"> • {{ rx.patient.phone }}</span>
                </div>
              </td>

              <!-- Dokter & Poli -->
              <td class="p-3.5">
                <div class="text-slate-200 font-medium">
                  {{ rx.doctor.name }}
                </div>
                <div class="text-[11px] text-blue-400 mt-0.5">
                  {{ rx.doctor.poliName }}
                </div>
              </td>

              <!-- Item Obat Preview -->
              <td class="p-3.5">
                <div class="flex items-center gap-1.5">
                  <Badge variant="default" size="sm">
                    {{ rx.items.length }} Macam Obat
                  </Badge>
                </div>
                <div
                  class="text-[11px] text-slate-400 mt-1 max-w-xs truncate"
                  :title="rx.items.map((i) => i.medicineName).join(', ')"
                >
                  {{ rx.items.map((i) => i.medicineName).join(", ") }}
                </div>
              </td>

              <!-- Waktu Dibuat -->
              <td class="p-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                {{ formatTime(rx.createdAt) }}
              </td>

              <!-- Status Resep -->
              <td class="p-3.5 whitespace-nowrap">
                <StatusBadge :status="rx.status" />
              </td>

              <!-- Aksi -->
              <td class="p-3.5 text-right whitespace-nowrap" @click.stop>
                <Button
                  size="sm"
                  :variant="rx.status === 'pending' ? 'primary' : 'secondary'"
                  @click="goToDetail(rx.id)"
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
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </template>
                  {{
                    rx.status === "pending" ? "Proses Resep" : "Lihat Detail"
                  }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
