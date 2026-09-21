<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
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

// Interface definisi antrean dokter
export interface DoctorQueuePatient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  phone: string | null;
  nik: string | null;
}

export interface DoctorQueuePoli {
  id: string;
  name: string;
}

export interface DoctorQueueItem {
  id: string;
  queueNumber: string;
  bookingCode: string | null;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  queueDate: string;
  diagnosis: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: DoctorQueuePatient;
  poli: DoctorQueuePoli;
}

export interface ActiveMedicineItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
}

export interface PrescriptionItemDetail {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  dosage: string | null;
  quantity: number;
  instructions: string;
}

export interface PrescriptionDetail {
  id: string;
  queueId: string | null;
  status: "pending" | "preparing" | "ready" | "taken";
  notes: string | null;
  createdAt: string;
  items: PrescriptionItemDetail[];
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

// State antrean
const queues = ref<DoctorQueueItem[]>([]);
const isLoading = ref(true);
const isRefreshing = ref(false);
const errorMessage = ref<string | null>(null);

// State filter & search
const selectedStatus = ref<
  "all" | "waiting" | "in_progress" | "completed" | "cancelled"
>("all");
const searchQuery = ref("");

// State modal detail & rekam medis
const isModalOpen = ref(false);
const activeQueue = ref<DoctorQueueItem | null>(null);
const activeTab = ref<"diagnosis" | "prescription">("diagnosis");

// State form diagnosis
const diagnosisInput = ref("");
const notesInput = ref("");
const isSavingDiagnosis = ref(false);
const diagnosisError = ref<string | null>(null);

// State resep
const existingPrescription = ref<PrescriptionDetail | null>(null);
const isLoadingPrescription = ref(false);
const activeMedicines = ref<ActiveMedicineItem[]>([]);
const prescriptionItemsInput = ref<
  Array<{
    medicineId: string;
    dosage: string;
    quantity: number;
    instructions: string;
  }>
>([]);
const prescriptionNotesInput = ref("");
const isSubmittingPrescription = ref(false);
const prescriptionError = ref<string | null>(null);

// State update status aksi langsung
const updatingStatusId = ref<string | null>(null);

// Quick Counter Metric
const totalCount = computed(() => queues.value.length);
const waitingCount = computed(
  () => queues.value.filter((q) => q.status === "waiting").length,
);
const inProgressCount = computed(
  () => queues.value.filter((q) => q.status === "in_progress").length,
);
const completedCount = computed(
  () => queues.value.filter((q) => q.status === "completed").length,
);
const cancelledCount = computed(
  () => queues.value.filter((q) => q.status === "cancelled").length,
);

// Antrean terfilter
const filteredQueues = computed(() => {
  let list = queues.value;

  if (selectedStatus.value !== "all") {
    list = list.filter((item) => item.status === selectedStatus.value);
  }

  const query = searchQuery.value.trim().toLowerCase();
  if (query) {
    list = list.filter(
      (item) =>
        item.queueNumber.toLowerCase().includes(query) ||
        item.patient.fullName.toLowerCase().includes(query) ||
        (item.bookingCode && item.bookingCode.toLowerCase().includes(query)) ||
        (item.patient.phone &&
          item.patient.phone.toLowerCase().includes(query)) ||
        (item.patient.nik && item.patient.nik.toLowerCase().includes(query)) ||
        (item.diagnosis && item.diagnosis.toLowerCase().includes(query)),
    );
  }

  return list;
});

// Format jam booking (misal: 09:30 WIB)
function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) + " WIB"
    );
  } catch {
    return "-";
  }
}

// Format tanggal hari ini
function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// Hitung perkiraan usia
function calculateAge(dobStr?: string): string {
  if (!dobStr) return "-";
  try {
    const dob = new Date(dobStr);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    const age = Math.abs(ageDt.getUTCFullYear() - 1970);
    return `${age} tahun`;
  } catch {
    return "-";
  }
}

// Mengambil daftar antrean hari ini dari API
async function fetchTodayQueues(showRefreshIndicator = false) {
  if (showRefreshIndicator) {
    isRefreshing.value = true;
  } else {
    isLoading.value = true;
  }
  errorMessage.value = null;

  try {
    const res = await apiClient<ApiResponse<DoctorQueueItem[]>>(
      "/doctor/queues/today",
    );
    if (res.success && Array.isArray(res.data)) {
      queues.value = res.data;
    } else {
      queues.value = [];
    }
  } catch (err: any) {
    console.error("Gagal mengambil antrean dokter:", err);
    errorMessage.value =
      err?.data?.error?.message ||
      "Gagal memuat antrean hari ini. Pastikan koneksi server aktif.";
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

// Mengubah status antrean secara langsung (waiting -> in_progress -> completed / cancelled)
async function handleUpdateStatus(
  queueId: string,
  newStatus: "waiting" | "in_progress" | "completed" | "cancelled",
) {
  updatingStatusId.value = queueId;

  try {
    const res = await apiClient<ApiResponse<DoctorQueueItem>>(
      `/doctor/queues/${queueId}/status`,
      {
        method: "PATCH",
        body: { status: newStatus },
      },
    );

    if (res.success && res.data) {
      // Update data di state lokal secara reaktif
      const idx = queues.value.findIndex((q) => q.id === queueId);
      if (idx !== -1) {
        queues.value[idx] = res.data;
      }
      if (activeQueue.value && activeQueue.value.id === queueId) {
        activeQueue.value = res.data;
      }

      const labelMap = {
        in_progress: "sedang diperiksa",
        completed: "selesai",
        waiting: "menunggu",
        cancelled: "dibatalkan",
      };
      toast.success(
        `Antrean ${res.data.queueNumber} diperbarui ke status ${labelMap[newStatus]}.`,
      );
    }
  } catch (err: any) {
    console.error("Gagal mengubah status antrean:", err);
    toast.error(
      err?.data?.error?.message || "Gagal mengubah status antrean pasien.",
    );
  } finally {
    updatingStatusId.value = null;
  }
}

// Buka modal detail & rekam medis pasien
async function openDetailModal(
  queue: DoctorQueueItem,
  preferredTab: "diagnosis" | "prescription" = "diagnosis",
) {
  activeQueue.value = queue;
  activeTab.value = preferredTab;
  diagnosisInput.value = queue.diagnosis || "";
  notesInput.value = queue.notes || "";
  diagnosisError.value = null;
  prescriptionError.value = null;
  isModalOpen.value = true;

  // Reset form resep baru
  prescriptionItemsInput.value = [
    { medicineId: "", dosage: "", quantity: 1, instructions: "" },
  ];
  prescriptionNotesInput.value = "";

  // Fetch resep yang sudah ada untuk antrean ini (jika ada)
  await fetchPrescriptionForActiveQueue(queue.id);

  // Fetch daftar obat aktif jika belum ada
  if (activeMedicines.value.length === 0) {
    await fetchActiveMedicines();
  }
}

// Tutup modal
function closeModal() {
  isModalOpen.value = false;
  activeQueue.value = null;
}

// Fetch resep untuk antrean
async function fetchPrescriptionForActiveQueue(queueId: string) {
  isLoadingPrescription.value = true;
  existingPrescription.value = null;

  try {
    const res = await apiClient<ApiResponse<PrescriptionDetail | null>>(
      `/doctor/queues/${queueId}/prescription`,
    );
    if (res.success && res.data) {
      existingPrescription.value = res.data;
    }
  } catch (err) {
    console.warn("Belum ada resep untuk antrean ini:", err);
  } finally {
    isLoadingPrescription.value = false;
  }
}

// Fetch master obat aktif untuk opsi resep
async function fetchActiveMedicines() {
  try {
    const res =
      await apiClient<ApiResponse<ActiveMedicineItem[]>>("/doctor/medicines");
    if (res.success && Array.isArray(res.data)) {
      activeMedicines.value = res.data;
    }
  } catch (err) {
    console.error("Gagal mengambil master obat:", err);
  }
}

// Simpan diagnosis & catatan dokter
async function handleSaveDiagnosis() {
  if (!activeQueue.value) return;

  const trimmedDiagnosis = diagnosisInput.value.trim();
  if (!trimmedDiagnosis) {
    diagnosisError.value =
      "Diagnosis pasien wajib diisi dan tidak boleh kosong.";
    return;
  }

  isSavingDiagnosis.value = true;
  diagnosisError.value = null;

  try {
    const res = await apiClient<ApiResponse<DoctorQueueItem>>(
      `/doctor/queues/${activeQueue.value.id}/diagnosis`,
      {
        method: "PATCH",
        body: {
          diagnosis: trimmedDiagnosis,
          notes: notesInput.value.trim() || undefined,
        },
      },
    );

    if (res.success && res.data) {
      activeQueue.value = res.data;
      const idx = queues.value.findIndex((q) => q.id === res.data.id);
      if (idx !== -1) {
        queues.value[idx] = res.data;
      }
      toast.success("Diagnosis dan catatan rekam medis berhasil disimpan.");
    }
  } catch (err: any) {
    const msg =
      err?.data?.error?.message || "Gagal menyimpan diagnosis ke server.";
    diagnosisError.value = msg;
    toast.error(msg);
  } finally {
    isSavingDiagnosis.value = false;
  }
}

// Tambah baris obat di form resep
function addPrescriptionItem() {
  prescriptionItemsInput.value.push({
    medicineId: "",
    dosage: "",
    quantity: 1,
    instructions: "",
  });
}

// Hapus baris obat di form resep
function removePrescriptionItem(index: number) {
  if (prescriptionItemsInput.value.length > 1) {
    prescriptionItemsInput.value.splice(index, 1);
  }
}

// Kirim resep baru ke farmasi
async function handleSubmitPrescription() {
  if (!activeQueue.value) return;

  prescriptionError.value = null;

  // Validasi form
  const validItems = prescriptionItemsInput.value.filter(
    (it) =>
      it.medicineId &&
      it.dosage.trim() &&
      it.instructions.trim() &&
      it.quantity > 0,
  );

  if (validItems.length === 0) {
    prescriptionError.value =
      "Harap isi minimal 1 obat lengkap (nama obat, dosis, jumlah, dan aturan pakai).";
    return;
  }

  isSubmittingPrescription.value = true;

  try {
    const res = await apiClient<ApiResponse<PrescriptionDetail>>(
      "/doctor/prescriptions",
      {
        method: "POST",
        body: {
          queueId: activeQueue.value.id,
          notes: prescriptionNotesInput.value.trim() || undefined,
          items: validItems.map((it) => ({
            medicineId: it.medicineId,
            dosage: it.dosage.trim(),
            quantity: Number(it.quantity),
            instructions: it.instructions.trim(),
          })),
        },
      },
    );

    if (res.success && res.data) {
      existingPrescription.value = res.data;
      toast.success(
        "Resep obat berhasil diterbitkan dan diteruskan ke Farmasi!",
      );
      // Muat ulang data antrean karena status bisa berubah otomatis ke in_progress
      await fetchTodayQueues(true);
    }
  } catch (err: any) {
    const msg =
      err?.data?.error?.message || "Gagal menerbitkan resep obat ke sistem.";
    prescriptionError.value = msg;
    toast.error(msg);
  } finally {
    isSubmittingPrescription.value = false;
  }
}

// Keyboard ESC listener untuk modal
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "Escape" && isModalOpen.value) {
    closeModal();
  }
}

onMounted(() => {
  fetchTodayQueues();
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
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
          <Badge variant="primary" dot>Konsol Praktik</Badge>
          <span class="text-xs text-slate-500 font-mono"
            >• {{ formatCurrentDate() }}</span
          >
        </div>
        <h1
          class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100"
        >
          Daftar Antrean Pasien
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Pantau antrean rawat jalan secara real-time, lakukan pemeriksaan medis, dan terbitkan resep obat langsung ke Unit Farmasi.
        </p>
      </div>

      <div class="flex items-center gap-2.5 self-start sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          :loading="isRefreshing"
          @click="fetchTodayQueues(true)"
          title="Perbarui daftar antrean"
          class="gap-1.5"
        >
          <svg
            :class="['h-3.5 w-3.5', isRefreshing ? 'animate-spin' : '']"
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
          Segarkan Data
        </Button>
      </div>
    </div>

    <!-- Alert jika terjadi error fetch -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Memuat Antrean"
      :description="errorMessage"
      closable
      @close="errorMessage = null"
    >
      <template #action>
        <Button size="sm" variant="danger" @click="fetchTodayQueues()">
          Coba Lagi
        </Button>
      </template>
    </Alert>

    <!-- Quick Metric Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
      <!-- Total -->
      <Card
        class="relative overflow-hidden border-slate-800 bg-slate-900/70 p-4 sm:p-5"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
        <div class="text-xs font-medium text-slate-400">Total Pasien</div>
        <div class="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-1 font-mono">
          <Skeleton v-if="isLoading" width="40px" height="32px" />
          <span v-else>{{ totalCount }}</span>
        </div>
        <div class="text-[11px] text-slate-500 mt-1.5">Terdaftar hari ini</div>
      </Card>

      <!-- Menunggu -->
      <Card
        class="relative overflow-hidden border-amber-900/50 bg-amber-950/15 p-4 sm:p-5"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-amber-600/40 select-none pointer-events-none">+</span>
        <div class="text-xs font-medium text-amber-300/90">Menunggu</div>
        <div class="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono">
          <Skeleton v-if="isLoading" width="40px" height="32px" />
          <span v-else>{{ waitingCount }}</span>
        </div>
        <div class="text-[11px] text-amber-400/70 mt-1.5">Perlu dipanggil</div>
      </Card>

      <!-- Sedang Diperiksa -->
      <Card
        class="relative overflow-hidden border-blue-900/50 bg-blue-950/15 p-4 sm:p-5"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-blue-600/40 select-none pointer-events-none">+</span>
        <div
          class="flex items-center gap-1.5 text-xs font-medium text-blue-300/90"
        >
          <span class="relative flex h-2 w-2">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"
            />
            <span
              class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"
            />
          </span>
          Sedang Diperiksa
        </div>
        <div class="text-2xl sm:text-3xl font-extrabold text-blue-400 mt-1 font-mono">
          <Skeleton v-if="isLoading" width="40px" height="32px" />
          <span v-else>{{ inProgressCount }}</span>
        </div>
        <div class="text-[11px] text-blue-400/70 mt-1.5">
          Aktif di ruang dokter
        </div>
      </Card>

      <!-- Selesai -->
      <Card
        class="relative overflow-hidden border-emerald-900/50 bg-emerald-950/15 p-4 sm:p-5"
      >
        <span class="absolute -top-1 -left-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</span>
        <span class="absolute -top-1 -right-1 font-mono text-[9px] text-emerald-600/40 select-none pointer-events-none">+</span>
        <div class="text-xs font-medium text-emerald-300/90">Selesai</div>
        <div class="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 font-mono">
          <Skeleton v-if="isLoading" width="40px" height="32px" />
          <span v-else>{{ completedCount }}</span>
        </div>
        <div class="text-[11px] text-emerald-400/70 mt-1.5">
          Pemeriksaan tuntas
        </div>
      </Card>
    </div>

    <!-- Filter Toolbar & Search Bar -->
    <Card class="border-slate-800 bg-slate-900/60 p-3 sm:p-4">
      <div
        class="flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <!-- Status Tabs Filter -->
        <div
          class="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none"
        >
          <button
            type="button"
            @click="selectedStatus = 'all'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Semua
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px]',
                selectedStatus === 'all'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ totalCount }}
            </span>
          </button>

          <button
            type="button"
            @click="selectedStatus = 'waiting'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              selectedStatus === 'waiting'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Menunggu
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px]',
                selectedStatus === 'waiting'
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ waitingCount }}
            </span>
          </button>

          <button
            type="button"
            @click="selectedStatus = 'in_progress'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              selectedStatus === 'in_progress'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Sedang Diperiksa
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px]',
                selectedStatus === 'in_progress'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ inProgressCount }}
            </span>
          </button>

          <button
            type="button"
            @click="selectedStatus = 'completed'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              selectedStatus === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Selesai
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px]',
                selectedStatus === 'completed'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ completedCount }}
            </span>
          </button>

          <button
            v-if="cancelledCount > 0"
            type="button"
            @click="selectedStatus = 'cancelled'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5',
              selectedStatus === 'cancelled'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
            ]"
          >
            Dibatalkan
            <span
              :class="[
                'px-1.5 py-0.2 rounded-full text-[10px]',
                selectedStatus === 'cancelled'
                  ? 'bg-rose-700 text-white'
                  : 'bg-slate-800 text-slate-400',
              ]"
            >
              {{ cancelledCount }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full md:w-72">
          <Input
            v-model="searchQuery"
            placeholder="Cari pasien, No. antrean, NIK..."
            size="sm"
            class="pl-8 bg-slate-950/70 border-slate-800 text-xs"
          />
          <svg
            class="h-4 w-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
          <button
            v-if="searchQuery"
            type="button"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
    </Card>

    <!-- Content Queue Table / List -->
    <Card class="relative border-slate-800 bg-slate-900/70 overflow-hidden">
      <span class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
      <span class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
      <span class="absolute -bottom-1 -left-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
      <span class="absolute -bottom-1 -right-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
      <!-- Loading State -->
      <div v-if="isLoading" class="p-4 space-y-3">
        <div
          v-for="i in 5"
          :key="i"
          class="flex items-center gap-4 py-3 border-b border-slate-800/60 last:border-0"
        >
          <Skeleton width="60px" height="36px" variant="rounded" />
          <div class="flex-1 space-y-1.5">
            <Skeleton width="40%" height="16px" />
            <Skeleton width="60%" height="12px" />
          </div>
          <Skeleton width="100px" height="24px" variant="rounded" />
          <Skeleton width="120px" height="32px" variant="rounded" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredQueues.length === 0" class="p-8">
        <EmptyState
          v-if="queues.length === 0"
          title="Belum Ada Antrean Pasien Hari Ini"
          description="Saat pasien melakukan pendaftaran online atau pendaftaran di loket, antrean akan otomatis muncul di sini."
        >
          <template #action>
            <Button size="sm" variant="outline" @click="fetchTodayQueues(true)">
              Segarkan Antrean
            </Button>
          </template>
        </EmptyState>

        <EmptyState
          v-else
          title="Tidak Ada Antrean yang Cocok"
          description="Tidak ditemukan data antrean dengan filter atau kata kunci pencarian saat ini."
        >
          <template #action>
            <Button
              size="sm"
              variant="outline"
              @click="
                selectedStatus = 'all';
                searchQuery = '';
              "
            >
              Reset Filter
            </Button>
          </template>
        </EmptyState>
      </div>

      <!-- Table View (Desktop & Tablet) -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead
            class="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800"
          >
            <tr>
              <th class="py-3.5 px-4">No. Antrean</th>
              <th class="py-3.5 px-4">Informasi Pasien</th>
              <th class="py-3.5 px-4">Waktu Booking</th>
              <th class="py-3.5 px-4">Status</th>
              <th class="py-3.5 px-4">Rekam Medis</th>
              <th class="py-3.5 px-4 text-right">Aksi Cepat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            <tr
              v-for="item in filteredQueues"
              :key="item.id"
              :class="[
                'transition-colors hover:bg-slate-800/40',
                item.status === 'in_progress' ? 'bg-blue-950/15' : '',
              ]"
            >
              <!-- 1. Nomor Antrean & Booking Code -->
              <td class="py-3.5 px-4 align-top">
                <div class="flex flex-col">
                  <span
                    class="font-mono text-base font-bold text-slate-100 tracking-tight"
                  >
                    {{ item.queueNumber }}
                  </span>
                  <span
                    v-if="item.bookingCode"
                    class="text-[10px] font-mono text-slate-500 mt-0.5"
                  >
                    {{ item.bookingCode }}
                  </span>
                </div>
              </td>

              <!-- 2. Data Pasien -->
              <td class="py-3.5 px-4 align-top">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-slate-100 text-sm">
                      {{ item.patient.fullName }}
                    </span>
                    <Badge
                      v-if="item.patient.gender"
                      size="sm"
                      :variant="
                        item.patient.gender === 'MALE' ? 'primary' : 'default'
                      "
                      class="text-[10px] px-1.5 py-0"
                    >
                      {{ item.patient.gender === "MALE" ? "L" : "P" }}
                    </Badge>
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400"
                  >
                    <span v-if="item.patient.dateOfBirth">
                      {{ calculateAge(item.patient.dateOfBirth) }}
                    </span>
                    <span v-if="item.patient.phone" class="text-slate-400">
                      📱 {{ item.patient.phone }}
                    </span>
                    <span v-if="item.patient.nik" class="text-slate-500">
                      NIK: {{ item.patient.nik }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- 3. Waktu Booking -->
              <td class="py-3.5 px-4 align-top whitespace-nowrap">
                <div class="text-slate-300 font-medium">
                  {{ formatTime(item.createdAt) }}
                </div>
                <div class="text-[10px] text-slate-500">
                  {{ item.queueDate }}
                </div>
              </td>

              <!-- 4. Status Antrean -->
              <td class="py-3.5 px-4 align-top whitespace-nowrap">
                <StatusBadge :status="item.status" />
              </td>

              <!-- 5. Indikator Rekam Medis (Diagnosis & Resep) -->
              <td class="py-3.5 px-4 align-top">
                <div class="space-y-1">
                  <!-- Diagnosis indicator -->
                  <div
                    v-if="item.diagnosis"
                    class="flex items-center gap-1.5 text-xs text-emerald-400 font-medium"
                  >
                    <svg
                      class="h-3.5 w-3.5 shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <span
                      class="truncate max-w-[140px] text-[11px]"
                      :title="item.diagnosis"
                    >
                      {{ item.diagnosis }}
                    </span>
                  </div>
                  <div v-else class="text-[11px] text-slate-500 italic">
                    Belum ada diagnosis
                  </div>
                </div>
              </td>

              <!-- 6. Aksi Cepat Dokter -->
              <td class="py-3.5 px-4 align-top text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Tombol Panggil & Mulai Periksa (Status: waiting) -->
                  <Button
                    v-if="item.status === 'waiting'"
                    variant="primary"
                    size="sm"
                    :loading="updatingStatusId === item.id"
                    @click="handleUpdateStatus(item.id, 'in_progress')"
                    title="Panggil pasien dan ubah status menjadi sedang diperiksa"
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
                        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                      />
                    </svg>
                    Panggil Pasien
                  </Button>

                  <!-- Tombol Periksa / Rekam Medis (Status: in_progress) -> Link ke Halaman Detail -->
                  <router-link :to="`/doctor/queues/${item.id}`">
                    <Button
                      v-if="item.status === 'in_progress'"
                      variant="outline"
                      size="sm"
                      class="border-blue-700/60 text-blue-300 hover:bg-blue-950/40"
                      title="Buka halaman penanganan pasien, diagnosis, dan resep"
                    >
                      <svg
                        class="h-3.5 w-3.5 mr-1 text-blue-400"
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
                      Periksa Pasien
                    </Button>
                  </router-link>

                  <!-- Tombol Selesaikan Pemeriksaan (Status: in_progress) -->
                  <Button
                    v-if="item.status === 'in_progress'"
                    variant="outline"
                    size="sm"
                    class="border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/40"
                    :loading="updatingStatusId === item.id"
                    @click="handleUpdateStatus(item.id, 'completed')"
                    title="Tandai pemeriksaan pasien telah selesai"
                  >
                    <svg
                      class="h-3.5 w-3.5 mr-1 text-emerald-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    Selesai
                  </Button>

                  <!-- Tombol Lihat Detail (Status: completed atau lainnya) -->
                  <router-link :to="`/doctor/queues/${item.id}`">
                    <Button
                      v-if="item.status === 'completed'"
                      variant="ghost"
                      size="sm"
                      class="text-slate-400 hover:text-slate-100"
                      title="Lihat riwayat catatan pemeriksaan & resep"
                    >
                      Detail Pasien
                    </Button>
                  </router-link>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>

    <!-- Modal Drawer Detail Pasien, Diagnosis, & Penulisan Resep -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isModalOpen && activeQueue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm"
        @click.self="closeModal"
      >
        <div
          class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <!-- Modal Header -->
          <div
            class="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between"
          >
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="font-mono text-xs px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-bold"
                >
                  {{ activeQueue.queueNumber }}
                </span>
                <StatusBadge :status="activeQueue.status" />
              </div>
              <h2 class="text-xl font-bold text-slate-100">
                {{ activeQueue.patient.fullName }}
              </h2>
              <div
                class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1"
              >
                <span v-if="activeQueue.patient.gender">
                  Jenis Kelamin:
                  {{
                    activeQueue.patient.gender === "MALE"
                      ? "Laki-laki"
                      : "Perempuan"
                  }}
                </span>
                <span v-if="activeQueue.patient.dateOfBirth">
                  Usia: {{ calculateAge(activeQueue.patient.dateOfBirth) }}
                </span>
                <span v-if="activeQueue.patient.phone">
                  Telp: {{ activeQueue.patient.phone }}
                </span>
                <span v-if="activeQueue.patient.nik">
                  NIK: {{ activeQueue.patient.nik }}
                </span>
              </div>
            </div>

            <button
              type="button"
              @click="closeModal"
              class="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Tutup modal"
            >
              ✕
            </button>
          </div>

          <!-- Status Bar Action Switcher -->
          <div
            class="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between"
          >
            <span class="text-xs font-medium text-slate-400"
              >Ubah Status Antrean:</span
            >
            <div class="flex items-center gap-1.5">
              <Button
                v-if="activeQueue.status === 'waiting'"
                size="sm"
                variant="primary"
                :loading="updatingStatusId === activeQueue.id"
                @click="handleUpdateStatus(activeQueue.id, 'in_progress')"
              >
                Mulai Periksa
              </Button>
              <Button
                v-if="activeQueue.status === 'in_progress'"
                size="sm"
                variant="outline"
                class="border-emerald-700 text-emerald-300 hover:bg-emerald-950/40"
                :loading="updatingStatusId === activeQueue.id"
                @click="handleUpdateStatus(activeQueue.id, 'completed')"
              >
                Tandai Selesai
              </Button>
              <Button
                v-if="activeQueue.status === 'waiting'"
                size="sm"
                variant="ghost"
                class="text-rose-400 hover:bg-rose-950/30"
                :loading="updatingStatusId === activeQueue.id"
                @click="handleUpdateStatus(activeQueue.id, 'cancelled')"
              >
                Batalkan Antrean
              </Button>
            </div>
          </div>

          <!-- Tabs Header -->
          <div class="flex border-b border-slate-800 px-6 pt-3 bg-slate-900">
            <button
              type="button"
              @click="activeTab = 'diagnosis'"
              :class="[
                'pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2',
                activeTab === 'diagnosis'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200',
              ]"
            >
              📋 Diagnosis & Catatan
              <span
                v-if="activeQueue.diagnosis"
                class="h-2 w-2 rounded-full bg-emerald-400"
              />
            </button>

            <button
              type="button"
              @click="activeTab = 'prescription'"
              :class="[
                'pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2',
                activeTab === 'prescription'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200',
              ]"
            >
              💊 Resep Obat (Farmasi)
              <span
                v-if="existingPrescription"
                class="h-2 w-2 rounded-full bg-blue-400"
              />
            </button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="p-6 overflow-y-auto space-y-4 flex-1">
            <!-- TAB 1: DIAGNOSIS & CATATAN -->
            <div v-if="activeTab === 'diagnosis'" class="space-y-4">
              <Alert
                v-if="diagnosisError"
                variant="danger"
                :description="diagnosisError"
                closable
                @close="diagnosisError = null"
              />

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-slate-200">
                  Diagnosis Dokter <span class="text-rose-400">*</span>
                </label>
                <textarea
                  v-model="diagnosisInput"
                  rows="3"
                  placeholder="Masukkan kesimpulan diagnosis klinis pasien (misal: ISPA Akut, Hipertensi Grade 1)..."
                  class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-medium text-slate-200">
                  Catatan Medis Tambahan / Rencana Tindakan (Opsional)
                </label>
                <textarea
                  v-model="notesInput"
                  rows="3"
                  placeholder="Catatan anamnesis, instruksi khusus, anjuran istirahat, diet khusus..."
                  class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                />
              </div>

              <div class="flex items-center justify-between pt-2">
                <span class="text-[11px] text-slate-500">
                  Diagnosis akan tercatat dalam audit log rekam medis pasien.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  :loading="isSavingDiagnosis"
                  @click="handleSaveDiagnosis"
                >
                  Simpan Diagnosis
                </Button>
              </div>
            </div>

            <!-- TAB 2: RESEP OBAT -->
            <div v-else-if="activeTab === 'prescription'" class="space-y-4">
              <!-- Loading Resep -->
              <div v-if="isLoadingPrescription" class="space-y-2 py-4">
                <Skeleton width="100%" height="40px" />
                <Skeleton width="100%" height="40px" />
              </div>

              <!-- JIKA RESEP SUDAH ADA -->
              <div v-else-if="existingPrescription" class="space-y-4">
                <div
                  class="p-3.5 rounded-xl border border-emerald-900/60 bg-emerald-950/20 flex items-center justify-between"
                >
                  <div class="flex items-center gap-2">
                    <svg
                      class="h-5 w-5 text-emerald-400 shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <div>
                      <h4 class="text-xs font-semibold text-emerald-300">
                        Resep Obat Telah Diterbitkan
                      </h4>
                      <p class="text-[11px] text-emerald-400/80">
                        Resep telah terkirim ke Unit Farmasi untuk proses
                        penyiapan.
                      </p>
                    </div>
                  </div>
                  <StatusBadge :status="existingPrescription.status" />
                </div>

                <!-- Tabel Item Obat -->
                <div class="rounded-xl border border-slate-800 overflow-hidden">
                  <table class="w-full text-left text-xs text-slate-300">
                    <thead
                      class="bg-slate-950/70 text-slate-400 font-semibold text-[10px] uppercase"
                    >
                      <tr>
                        <th class="p-2.5">Nama Obat</th>
                        <th class="p-2.5">Dosis</th>
                        <th class="p-2.5">Jumlah</th>
                        <th class="p-2.5">Aturan Pakai</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-800">
                      <tr
                        v-for="item in existingPrescription.items"
                        :key="item.id"
                      >
                        <td class="p-2.5 font-medium text-slate-100">
                          {{ item.medicineName }}
                          <span class="block text-[10px] text-slate-400">{{
                            item.medicineCategory
                          }}</span>
                        </td>
                        <td class="p-2.5 text-slate-300">
                          {{ item.dosage || "-" }}
                        </td>
                        <td class="p-2.5 font-mono text-slate-200">
                          {{ item.quantity }} {{ item.unit }}
                        </td>
                        <td class="p-2.5 text-slate-300">
                          {{ item.instructions }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div
                  v-if="existingPrescription.notes"
                  class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <span
                    class="font-semibold text-slate-400 block text-[10px] uppercase"
                    >Catatan Resep:</span
                  >
                  <p class="text-slate-200 mt-0.5">
                    {{ existingPrescription.notes }}
                  </p>
                </div>
              </div>

              <!-- JIKA RESEP BELUM ADA -> FORM TULIS RESEP -->
              <div v-else class="space-y-4">
                <Alert
                  v-if="prescriptionError"
                  variant="danger"
                  :description="prescriptionError"
                  closable
                  @close="prescriptionError = null"
                />

                <div class="space-y-3">
                  <div
                    v-for="(item, idx) in prescriptionItemsInput"
                    :key="idx"
                    class="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2.5"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-blue-400"
                        >Obat #{{ idx + 1 }}</span
                      >
                      <button
                        v-if="prescriptionItemsInput.length > 1"
                        type="button"
                        @click="removePrescriptionItem(idx)"
                        class="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Hapus
                      </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <!-- Pilih Obat -->
                      <div class="sm:col-span-2">
                        <label
                          class="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Pilih Obat <span class="text-rose-400">*</span>
                        </label>
                        <select
                          v-model="item.medicineId"
                          class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="" disabled>
                            -- Pilih dari daftar obat aktif --
                          </option>
                          <option
                            v-for="med in activeMedicines"
                            :key="med.id"
                            :value="med.id"
                            :disabled="med.currentStock <= 0"
                          >
                            {{ med.name }} {{ med.currentStock <= 0 ? '(STOK HABIS)' : `(Stok: ${med.currentStock} ${med.unit})` }} - {{ med.category }}
                          </option>
                        </select>
                      </div>

                      <!-- Dosis -->
                      <div>
                        <label
                          class="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Dosis <span class="text-rose-400">*</span>
                        </label>
                        <Input
                          v-model="item.dosage"
                          placeholder="Misal: 500 mg, 1 tablet"
                          size="sm"
                          class="bg-slate-900 text-xs"
                        />
                      </div>

                      <!-- Jumlah -->
                      <div>
                        <label
                          class="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Jumlah <span class="text-rose-400">*</span>
                        </label>
                        <Input
                          v-model.number="item.quantity"
                          type="number"
                          min="1"
                          placeholder="10"
                          size="sm"
                          class="bg-slate-900 text-xs"
                        />
                      </div>

                      <!-- Aturan Pakai -->
                      <div class="sm:col-span-2">
                        <label
                          class="block text-[11px] font-medium text-slate-400 mb-1"
                        >
                          Aturan Pakai / Instruksi
                          <span class="text-rose-400">*</span>
                        </label>
                        <Input
                          v-model="item.instructions"
                          placeholder="Misal: 3x1 sehari sesudah makan"
                          size="sm"
                          class="bg-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Tombol Tambah Obat -->
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="w-full border-dashed"
                    @click="addPrescriptionItem"
                  >
                    + Tambah Obat Lain
                  </Button>
                </div>

                <!-- Catatan Resep -->
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-slate-300">
                    Catatan untuk Apoteker / Pasien (Opsional)
                  </label>
                  <textarea
                    v-model="prescriptionNotesInput"
                    rows="2"
                    placeholder="Instruksi tambahan bagi apoteker atau peringatan alergi..."
                    class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <!-- Tombol Submit Resep -->
                <div class="flex items-center justify-between pt-2">
                  <span class="text-[11px] text-slate-400">
                    Resep akan langsung diteruskan ke Konsol Farmasi.
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    :loading="isSubmittingPrescription"
                    @click="handleSubmitPrescription"
                  >
                    Kirim Resep ke Farmasi
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div
            class="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2"
          >
            <Button variant="ghost" size="sm" @click="closeModal">
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
