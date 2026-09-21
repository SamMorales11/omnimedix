<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import StatusBadge from "../../components/ui/StatusBadge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import Alert from "../../components/ui/Alert.vue";
import EmptyState from "../../components/ui/EmptyState.vue";

// Definisi interface antrean
export interface QueuePatient {
  id: string;
  fullName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  phone: string | null;
  nik: string | null;
}

export interface QueuePoli {
  id: string;
  name: string;
}

export interface QueueDetail {
  id: string;
  queueNumber: string;
  bookingCode: string | null;
  status: "waiting" | "in_progress" | "completed" | "cancelled";
  queueDate: string;
  diagnosis: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  patient: QueuePatient;
  poli: QueuePoli;
}

export interface ActiveMedicine {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
}

export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  dosage: string | null;
  quantity: number;
  instructions: string;
}

export interface PrescriptionData {
  id: string;
  queueId: string | null;
  status: "pending" | "preparing" | "ready" | "taken";
  notes: string | null;
  createdAt: string;
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

const route = useRoute();
const router = useRouter();
const toast = useToast();

const queueId = computed(() => route.params["id"] as string);

// State Data Utama
const queue = ref<QueueDetail | null>(null);
const isLoadingQueue = ref(true);
const queueError = ref<string | null>(null);

// State Diagnosis
const diagnosis = ref("");
const medicalNotes = ref("");
const isSavingDiagnosis = ref(false);
const diagnosisSavedSuccess = ref(false);
const diagnosisError = ref<string | null>(null);

// State Resep
const existingPrescription = ref<PrescriptionData | null>(null);
const isLoadingPrescription = ref(true);
const activeMedicines = ref<ActiveMedicine[]>([]);
const prescriptionItems = ref<
  Array<{
    medicineId: string;
    dosage: string;
    quantity: number;
    instructions: string;
  }>
>([{ medicineId: "", dosage: "", quantity: 1, instructions: "" }]);
const prescriptionNotes = ref("");
const isSubmittingPrescription = ref(false);
const prescriptionError = ref<string | null>(null);
const prescriptionSuccess = ref(false);

// State Ubah Status Antrean
const isUpdatingStatus = ref(false);

// Format Tanggal dan Jam
function formatTime(dateStr?: string): string {
  if (!dateStr) return "-";
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

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
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

// 1. Fetch Data Antrean
async function fetchQueueData() {
  isLoadingQueue.value = true;
  queueError.value = null;

  try {
    const res = await apiClient<ApiResponse<QueueDetail>>(
      `/doctor/queues/${queueId.value}`,
    );
    if (res.success && res.data) {
      queue.value = res.data;
      diagnosis.value = res.data.diagnosis || "";
      medicalNotes.value = res.data.notes || "";
    } else {
      queueError.value = "Data antrean pasien tidak ditemukan.";
    }
  } catch (err: any) {
    console.error("Gagal mengambil data antrean:", err);
    queueError.value =
      err?.data?.error?.message ||
      "Data antrean tidak ditemukan atau Anda tidak memiliki akses ke antrean ini.";
  } finally {
    isLoadingQueue.value = false;
  }
}

// 2. Fetch Resep Eksisting
async function fetchPrescriptionData() {
  isLoadingPrescription.value = true;
  try {
    const res = await apiClient<ApiResponse<PrescriptionData | null>>(
      `/doctor/queues/${queueId.value}/prescription`,
    );
    if (res.success && res.data) {
      existingPrescription.value = res.data;
      prescriptionSuccess.value = true;
    } else {
      existingPrescription.value = null;
    }
  } catch (err) {
    console.warn("Belum ada resep untuk antrean ini:", err);
    existingPrescription.value = null;
  } finally {
    isLoadingPrescription.value = false;
  }
}

// 3. Fetch Master Obat Aktif
async function fetchActiveMedicines() {
  try {
    const res =
      await apiClient<ApiResponse<ActiveMedicine[]>>("/doctor/medicines");
    if (res.success && Array.isArray(res.data)) {
      activeMedicines.value = res.data;
    }
  } catch (err) {
    console.error("Gagal memuat master obat:", err);
  }
}

// 4. Ubah Status Antrean
async function handleUpdateStatus(
  nextStatus: "waiting" | "in_progress" | "completed" | "cancelled",
) {
  if (!queue.value) return;
  isUpdatingStatus.value = true;

  try {
    const res = await apiClient<ApiResponse<QueueDetail>>(
      `/doctor/queues/${queueId.value}/status`,
      {
        method: "PATCH",
        body: { status: nextStatus },
      },
    );

    if (res.success && res.data) {
      queue.value = res.data;
      const statusMap = {
        in_progress: "sedang diperiksa",
        completed: "selesai",
        waiting: "menunggu",
        cancelled: "dibatalkan",
      };
      toast.success(
        `Status antrean ${res.data.queueNumber} berhasil diubah menjadi ${statusMap[nextStatus]}.`,
      );
    }
  } catch (err: any) {
    console.error("Gagal mengubah status antrean:", err);
    toast.error(
      err?.data?.error?.message || "Gagal mengubah status antrean pasien.",
    );
  } finally {
    isUpdatingStatus.value = false;
  }
}

// 5. Simpan Diagnosis & Catatan Medis
async function handleSaveDiagnosis() {
  if (!queue.value) return;

  const trimmedDiagnosis = diagnosis.value.trim();
  if (!trimmedDiagnosis) {
    diagnosisError.value = "Diagnosis pasien wajib diisi.";
    return;
  }

  isSavingDiagnosis.value = true;
  diagnosisError.value = null;
  diagnosisSavedSuccess.value = false;

  try {
    const res = await apiClient<ApiResponse<QueueDetail>>(
      `/doctor/queues/${queueId.value}/diagnosis`,
      {
        method: "PATCH",
        body: {
          diagnosis: trimmedDiagnosis,
          notes: medicalNotes.value.trim() || undefined,
        },
      },
    );

    if (res.success && res.data) {
      queue.value = res.data;
      diagnosisSavedSuccess.value = true;
      toast.success("Diagnosis dan catatan rekam medis berhasil disimpan.");
      setTimeout(() => {
        diagnosisSavedSuccess.value = false;
      }, 3000);
    }
  } catch (err: any) {
    console.error("Gagal menyimpan diagnosis:", err);
    const msg =
      err?.data?.error?.message || "Gagal menyimpan diagnosis ke server.";
    diagnosisError.value = msg;
    toast.error(msg);
  } finally {
    isSavingDiagnosis.value = false;
  }
}

// 6. Manipulasi Baris Item Obat Resep
function addPrescriptionRow() {
  prescriptionItems.value.push({
    medicineId: "",
    dosage: "",
    quantity: 1,
    instructions: "",
  });
}

function removePrescriptionRow(index: number) {
  if (prescriptionItems.value.length > 1) {
    prescriptionItems.value.splice(index, 1);
  }
}

// 7. Simpan & Teruskan Resep ke Apoteker
async function handleSubmitPrescription() {
  if (!queue.value) return;

  prescriptionError.value = null;

  // Validasi form resep
  const validItems = prescriptionItems.value.filter(
    (item) =>
      item.medicineId &&
      item.dosage.trim() &&
      item.instructions.trim() &&
      item.quantity > 0,
  );

  if (validItems.length === 0) {
    prescriptionError.value =
      "Harap isi minimal 1 obat secara lengkap (nama obat, dosis, jumlah, dan aturan pakai).";
    return;
  }

  isSubmittingPrescription.value = true;

  try {
    const res = await apiClient<ApiResponse<PrescriptionData>>(
      "/doctor/prescriptions",
      {
        method: "POST",
        body: {
          queueId: queueId.value,
          notes: prescriptionNotes.value.trim() || undefined,
          items: validItems.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage.trim(),
            quantity: Number(item.quantity),
            instructions: item.instructions.trim(),
          })),
        },
      },
    );

    if (res.success && res.data) {
      existingPrescription.value = res.data;
      prescriptionSuccess.value = true;
      toast.success(
        "Resep obat berhasil disimpan dan diteruskan ke bagian Apotek!",
      );
      // Refresh status antrean (karena otomatis in_progress bila sebelumnya waiting)
      await fetchQueueData();
    }
  } catch (err: any) {
    console.error("Gagal mengirim resep:", err);
    const msg =
      err?.data?.error?.message || "Gagal menyimpan dan mengirim resep.";
    prescriptionError.value = msg;
    toast.error(msg);
  } finally {
    isSubmittingPrescription.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    fetchQueueData(),
    fetchPrescriptionData(),
    fetchActiveMedicines(),
  ]);
});
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <!-- Top Navigation Bar / Breadcrumb -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4"
    >
      <div class="flex items-center gap-3">
        <router-link
          to="/doctor"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors"
        >
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
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Kembali ke Antrean
        </router-link>
        <span class="text-slate-600">/</span>
        <span class="text-xs text-slate-400 font-medium">Detail Pasien</span>
      </div>

      <!-- Quick Action: Selesaikan Pemeriksaan jika sedang diperiksa -->
      <div
        v-if="queue && queue.status === 'in_progress'"
        class="flex items-center gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          class="border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40"
          :loading="isUpdatingStatus"
          @click="handleUpdateStatus('completed')"
        >
          <svg
            class="h-4 w-4 mr-1.5 text-emerald-400"
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
          Selesaikan Pemeriksaan
        </Button>
      </div>
    </div>

    <!-- Error State jika Antrean Tidak Ditemukan -->
    <div v-if="queueError" class="py-8">
      <EmptyState title="Antrean Tidak Ditemukan" :description="queueError">
        <template #action>
          <router-link to="/doctor">
            <Button size="sm" variant="primary">
              Kembali ke Daftar Antrean
            </Button>
          </router-link>
        </template>
      </EmptyState>
    </div>

    <!-- Loading Skeleton Utama -->
    <div v-else-if="isLoadingQueue" class="space-y-6">
      <Card class="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <div class="flex justify-between">
          <Skeleton width="160px" height="28px" />
          <Skeleton width="100px" height="24px" />
        </div>
        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800"
        >
          <Skeleton v-for="i in 4" :key="i" width="100%" height="48px" />
        </div>
      </Card>
      <Skeleton width="100%" height="220px" variant="rounded" />
      <Skeleton width="100%" height="260px" variant="rounded" />
    </div>

    <!-- Konten Detail Pasien & Pemeriksaan Medis -->
    <div v-else-if="queue" class="space-y-6">
      <!-- 1. Header Ringkasan Pasien & Antrean -->
      <Card
        class="p-6 border-slate-800 bg-slate-900/60 relative overflow-hidden"
      >
        <div
          class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2.5">
              <span
                class="font-mono text-base font-extrabold px-2.5 py-0.5 rounded-lg bg-blue-900/60 text-blue-300 border border-blue-800/80"
              >
                {{ queue.queueNumber }}
              </span>
              <span
                v-if="queue.bookingCode"
                class="font-mono text-xs text-slate-400"
              >
                Kode: {{ queue.bookingCode }}
              </span>
              <StatusBadge :status="queue.status" />
            </div>

            <h1 class="text-2xl font-bold tracking-tight text-slate-100 pt-1">
              {{ queue.patient.fullName }}
            </h1>
            <p class="text-xs text-slate-400">
              Poli:
              <span class="text-slate-200 font-medium">{{
                queue.poli.name
              }}</span>
              • Terdaftar: {{ formatDate(queue.createdAt) }} ({{
                formatTime(queue.createdAt)
              }})
            </p>
          </div>

          <!-- Status Control Buttons -->
          <div
            class="flex flex-wrap items-center gap-2 self-start md:self-center"
          >
            <Button
              v-if="queue.status === 'waiting'"
              variant="primary"
              size="sm"
              :loading="isUpdatingStatus"
              @click="handleUpdateStatus('in_progress')"
            >
              <svg
                class="h-4 w-4 mr-1.5"
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

            <Button
              v-if="queue.status === 'in_progress'"
              variant="outline"
              size="sm"
              class="border-emerald-700 text-emerald-300 hover:bg-emerald-950/40"
              :loading="isUpdatingStatus"
              @click="handleUpdateStatus('completed')"
            >
              <svg
                class="h-4 w-4 mr-1.5 text-emerald-400"
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
              Tandai Selesai
            </Button>

            <Button
              v-if="queue.status === 'waiting'"
              variant="ghost"
              size="sm"
              class="text-rose-400 hover:bg-rose-950/30"
              :loading="isUpdatingStatus"
              @click="handleUpdateStatus('cancelled')"
            >
              Batalkan
            </Button>
          </div>
        </div>

        <!-- Grid Informasi Pasien Lengkap -->
        <div
          class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-800/80 text-xs"
        >
          <div>
            <span class="text-slate-500 block text-[11px]">Jenis Kelamin</span>
            <span
              class="font-medium text-slate-200 mt-0.5 inline-flex items-center gap-1.5"
            >
              <Badge
                size="sm"
                :variant="
                  queue.patient.gender === 'MALE' ? 'primary' : 'default'
                "
                class="text-[10px] px-1.5 py-0"
              >
                {{
                  queue.patient.gender === "MALE" ? "Laki-laki" : "Perempuan"
                }}
              </Badge>
            </span>
          </div>

          <div>
            <span class="text-slate-500 block text-[11px]"
              >Usia / Tanggal Lahir</span
            >
            <span class="font-medium text-slate-200 mt-0.5 block">
              {{ calculateAge(queue.patient.dateOfBirth) }}
              <span
                v-if="queue.patient.dateOfBirth"
                class="text-slate-400 text-[11px]"
              >
                ({{ queue.patient.dateOfBirth }})
              </span>
            </span>
          </div>

          <div>
            <span class="text-slate-500 block text-[11px]"
              >No. Telepon / WhatsApp</span
            >
            <span class="font-medium text-slate-200 mt-0.5 block">
              {{ queue.patient.phone || "-" }}
            </span>
          </div>

          <div>
            <span class="text-slate-500 block text-[11px]">NIK Pasien</span>
            <span class="font-mono text-slate-300 mt-0.5 block">
              {{ queue.patient.nik || "-" }}
            </span>
          </div>
        </div>
      </Card>

      <!-- 2. Bagian Pencatatan Diagnosis & Catatan Medis -->
      <Card class="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <div
          class="flex items-center justify-between border-b border-slate-800/80 pb-3"
        >
          <div class="flex items-center gap-2">
            <div
              class="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400"
            >
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-100">
                Pencatatan Diagnosis & Catatan Medis
              </h2>
              <p class="text-xs text-slate-400">
                Hasil anamnesis, kesimpulan klinis, dan instruksi penanganan
                pasien.
              </p>
            </div>
          </div>

          <Badge v-if="queue.diagnosis" variant="success" size="sm">
            Diagnosis Tercatat
          </Badge>
        </div>

        <Alert
          v-if="diagnosisError"
          variant="danger"
          :description="diagnosisError"
          closable
          @close="diagnosisError = null"
        />

        <div class="space-y-4 pt-1">
          <!-- Diagnosis Textarea -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-200">
              Diagnosis Dokter <span class="text-rose-400">*</span>
            </label>
            <textarea
              v-model="diagnosis"
              rows="3"
              placeholder="Tuliskan kesimpulan diagnosis klinis (contoh: Faringitis Akut, Gastritis Erosif, Hipertensi Grade 1)..."
              class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <!-- Medical Notes Textarea -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-slate-200">
              Catatan Medis Tambahan & Anjuran (Opsional)
            </label>
            <textarea
              v-model="medicalNotes"
              rows="3"
              placeholder="Keluhan utama, riwayat alergi, saran istirahat, pantangan makanan, atau instruksi kontrol..."
              class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          <div class="flex items-center justify-between pt-2">
            <div class="text-[11px] text-slate-500">
              <span v-if="queue.updatedAt">
                Terakhir diperbarui: {{ formatTime(queue.updatedAt) }}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              :loading="isSavingDiagnosis"
              @click="handleSaveDiagnosis"
            >
              <svg
                class="h-4 w-4 mr-1.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              Simpan Diagnosis
            </Button>
          </div>
        </div>
      </Card>

      <!-- 3. Bagian Penulisan & Penerbitan E-Resep Farmasi -->
      <Card class="p-6 border-slate-800 bg-slate-900/60 space-y-5">
        <div
          class="flex items-center justify-between border-b border-slate-800/80 pb-3"
        >
          <div class="flex items-center gap-2">
            <div
              class="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400"
            >
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
                  d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-100">
                E-Resep Obat Pasien
              </h2>
              <p class="text-xs text-slate-400">
                Tuliskan resep obat untuk diteruskan langsung ke Unit Apotek /
                Farmasi.
              </p>
            </div>
          </div>

          <div v-if="existingPrescription">
            <StatusBadge :status="existingPrescription.status" />
          </div>
        </div>

        <!-- JIKA RESEP SUDAH DITERBITKAN -->
        <div v-if="existingPrescription" class="space-y-4">
          <div
            class="p-4 rounded-xl border border-emerald-900/70 bg-emerald-950/25 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="h-9 w-9 rounded-xl bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0"
              >
                <svg
                  class="h-5 w-5"
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
              </div>
              <div>
                <h4 class="text-xs sm:text-sm font-semibold text-emerald-200">
                  Resep Obat Berhasil Diterbitkan
                </h4>
                <p class="text-xs text-emerald-400/80 mt-0.5">
                  Resep telah terkirim ke Konsol Apoteker untuk penyiapan obat
                  dan penyerahan ke pasien.
                </p>
              </div>
            </div>

            <router-link to="/doctor">
              <Button
                size="sm"
                variant="outline"
                class="border-emerald-800 text-emerald-300 hover:bg-emerald-900/40"
              >
                Kembali ke Daftar
              </Button>
            </router-link>
          </div>

          <!-- Tabel Item Obat yang Telah Diresepkan -->
          <div class="rounded-xl border border-slate-800 overflow-hidden">
            <table class="w-full text-left text-xs text-slate-300">
              <thead
                class="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800"
              >
                <tr>
                  <th class="p-3">Nama Obat</th>
                  <th class="p-3">Kategori</th>
                  <th class="p-3">Dosis</th>
                  <th class="p-3">Jumlah</th>
                  <th class="p-3">Aturan Pakai</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr
                  v-for="item in existingPrescription.items"
                  :key="item.id"
                  class="hover:bg-slate-800/30"
                >
                  <td class="p-3 font-semibold text-slate-100">
                    {{ item.medicineName }}
                  </td>
                  <td class="p-3 text-slate-400">
                    {{ item.medicineCategory }}
                  </td>
                  <td class="p-3 text-slate-200 font-mono">
                    {{ item.dosage || "-" }}
                  </td>
                  <td class="p-3 font-mono text-slate-100 font-bold">
                    {{ item.quantity }} {{ item.unit }}
                  </td>
                  <td class="p-3 text-slate-300">
                    {{ item.instructions }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Catatan Resep -->
          <div
            v-if="existingPrescription.notes"
            class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
          >
            <span
              class="font-semibold text-slate-400 text-[10px] uppercase block mb-1"
            >
              Catatan untuk Apoteker / Pasien:
            </span>
            <p class="text-slate-200 leading-relaxed">
              {{ existingPrescription.notes }}
            </p>
          </div>
        </div>

        <!-- JIKA RESEP BELUM DITERBITKAN -> FORM PENULISAN RESEP DINAMIS -->
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
              v-for="(item, idx) in prescriptionItems"
              :key="idx"
              class="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3 transition-colors"
            >
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-semibold text-blue-400 flex items-center gap-1.5"
                >
                  <span class="h-2 w-2 rounded-full bg-blue-500" />
                  Obat #{{ idx + 1 }}
                </span>
                <button
                  v-if="prescriptionItems.length > 1"
                  type="button"
                  @click="removePrescriptionRow(idx)"
                  class="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                  title="Hapus baris obat"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Hapus Baris
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <!-- Dropdown Pilih Obat -->
                <div class="sm:col-span-2">
                  <label
                    class="block text-[11px] font-medium text-slate-300 mb-1"
                  >
                    Nama Obat <span class="text-rose-400">*</span>
                  </label>
                  <select
                    v-model="item.medicineId"
                    class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      -- Pilih dari stok obat aktif --
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
                    class="block text-[11px] font-medium text-slate-300 mb-1"
                  >
                    Dosis Obat <span class="text-rose-400">*</span>
                  </label>
                  <Input
                    v-model="item.dosage"
                    placeholder="Contoh: 500 mg, 1 sendok"
                    size="sm"
                    class="bg-slate-900 text-xs"
                  />
                </div>

                <!-- Jumlah -->
                <div>
                  <label
                    class="block text-[11px] font-medium text-slate-300 mb-1"
                  >
                    Jumlah / Qty <span class="text-rose-400">*</span>
                  </label>
                  <Input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    placeholder="10"
                    size="sm"
                    class="bg-slate-900 text-xs font-mono"
                  />
                </div>

                <!-- Aturan Pakai / Instruksi -->
                <div class="sm:col-span-2 md:col-span-4">
                  <label
                    class="block text-[11px] font-medium text-slate-300 mb-1"
                  >
                    Aturan Pakai & Anjuran Konsumsi
                    <span class="text-rose-400">*</span>
                  </label>
                  <Input
                    v-model="item.instructions"
                    placeholder="Contoh: 3x1 sehari sesudah makan jika demam, dihabiskan"
                    size="sm"
                    class="bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            <!-- Tombol Tambah Baris Obat -->
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="w-full border-dashed border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white"
              @click="addPrescriptionRow"
            >
              + Tambah Obat Lainnya
            </Button>
          </div>

          <!-- Catatan Resep Tambahan -->
          <div class="space-y-1.5 pt-1">
            <label class="block text-xs font-semibold text-slate-200">
              Catatan untuk Apoteker & Pasien (Opsional)
            </label>
            <textarea
              v-model="prescriptionNotes"
              rows="2"
              placeholder="Instruksi tambahan bagi bagian apotek farmasi atau catatan alergi obat pasien..."
              class="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <!-- Tombol Kirim Resep -->
          <div
            class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800"
          >
            <span class="text-[11px] text-slate-500 text-center sm:text-left">
              Data resep obat akan langsung disinkronisasi ke Konsol Farmasi
              secara atomik.
            </span>

            <Button
              variant="primary"
              size="sm"
              :loading="isSubmittingPrescription"
              @click="handleSubmitPrescription"
            >
              <svg
                class="h-4 w-4 mr-1.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
              Simpan & Teruskan ke Apoteker
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
