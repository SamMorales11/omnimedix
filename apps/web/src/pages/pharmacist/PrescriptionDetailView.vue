<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Badge from "../../components/ui/Badge.vue";
import StatusBadge from "../../components/ui/StatusBadge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
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

export interface PharmacistPrescriptionDetail {
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

const route = useRoute();
const router = useRouter();
const toast = useToast();

const prescriptionId = computed(() => route.params.id as string);

// State data
const prescription = ref<PharmacistPrescriptionDetail | null>(null);
const isLoading = ref(true);
const isUpdating = ref(false);
const errorMessage = ref<string | null>(null);
const actionError = ref<string | null>(null);

// Modal konfirmasi penyerahan obat (Taken)
const showTakenConfirmModal = ref(false);

// Ambil detail resep dari backend
async function fetchPrescriptionDetail() {
  if (!prescriptionId.value) return;

  isLoading.value = true;
  errorMessage.value = null;
  actionError.value = null;

  try {
    const response = await apiClient<ApiResponse<PharmacistPrescriptionDetail>>(
      `/pharmacist/prescriptions/${prescriptionId.value}`,
    );

    if (response.success && response.data) {
      prescription.value = response.data;
    } else {
      throw new Error(response.error?.message || "Resep tidak ditemukan.");
    }
  } catch (err: unknown) {
    console.error("Gagal mengambil detail resep:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Gagal memuat informasi resep obat.";
  } finally {
    isLoading.value = false;
  }
}

// Update status resep
async function updateStatus(
  newStatus: "pending" | "preparing" | "ready" | "taken",
) {
  if (!prescription.value || isUpdating.value) return;

  isUpdating.value = true;
  actionError.value = null;

  try {
    const response = await apiClient<ApiResponse<PharmacistPrescriptionDetail>>(
      `/pharmacist/prescriptions/${prescription.value.id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      },
    );

    if (response.success && response.data) {
      prescription.value = response.data;

      const statusLabels: Record<string, string> = {
        pending: "Menunggu",
        preparing: "Sedang Diracik",
        ready: "Siap Diambil Pasien",
        taken: "Diserahkan ke Pasien (Selesai)",
      };

      toast.success(
        `Status resep berhasil diubah menjadi "${statusLabels[newStatus] || newStatus}".`,
        "Pembaruan Berhasil",
      );

      if (newStatus === "taken") {
        showTakenConfirmModal.value = false;
      }
    } else {
      throw new Error(
        response.error?.message || "Gagal memperbarui status resep.",
      );
    }
  } catch (err: unknown) {
    console.error("Gagal update status resep:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    const msg =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kendala saat memperbarui status resep.";
    actionError.value = msg;
    toast.error(msg, "Gagal Memperbarui Status");
  } finally {
    isUpdating.value = false;
  }
}

// Format tanggal dan waktu
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "-";
  }
}

// Hitung usia pasien berdasarkan tanggal lahir
function calculateAge(dateOfBirth: string): string {
  try {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} tahun`;
  } catch {
    return "-";
  }
}

// Status timeline helpers
const steps = [
  { key: "pending", label: "Menunggu", desc: "Resep diterima dari dokter" },
  { key: "preparing", label: "Diracik", desc: "Farmasi menyiapkan obat" },
  { key: "ready", label: "Siap", desc: "Obat siap diambil di loket" },
  { key: "taken", label: "Diserahkan", desc: "Selesai & stok berkurang" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "preparing":
      return 1;
    case "ready":
      return 2;
    case "taken":
      return 3;
    default:
      return 0;
  }
}

const currentStepIndex = computed(() => {
  return prescription.value ? getStepIndex(prescription.value.status) : 0;
});

// Cek apakah ada obat yang stoknya kurang dari jumlah di resep
const hasStockShortage = computed(() => {
  if (!prescription.value) return false;
  return prescription.value.items.some((it) => it.currentStock < it.quantity);
});

onMounted(() => {
  fetchPrescriptionDetail();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Bar: Back button & Title -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          @click="router.push('/pharmacist')"
          title="Kembali ke Daftar Resep"
        >
          <template #icon>
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
          </template>
          Daftar Resep
        </Button>

        <div>
          <div class="flex items-center gap-2">
            <h1
              class="text-xl sm:text-2xl font-bold tracking-tight text-slate-100"
            >
              Detail Resep Obat
            </h1>
            <span
              v-if="prescription"
              class="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-400 font-semibold border border-slate-700/60"
            >
              #{{ prescription.id.slice(0, 8) }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Verifikasi komposisi obat, dosis, dan kelola alur penyerahan ke
            pasien.
          </p>
        </div>
      </div>

      <!-- Action Refresh & Status Badge -->
      <div class="flex items-center gap-3">
        <StatusBadge
          v-if="prescription"
          :status="prescription.status"
          size="md"
        />
        <Button
          variant="secondary"
          size="sm"
          :loading="isLoading"
          @click="fetchPrescriptionDetail"
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

    <!-- Error Alert jika gagal fetch -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Gagal Memuat Detail Resep"
    >
      {{ errorMessage }}
      <div class="mt-3">
        <Button size="sm" variant="secondary" @click="fetchPrescriptionDetail">
          Coba Lagi
        </Button>
      </div>
    </Alert>

    <!-- Error Alert jika update status gagal -->
    <Alert
      v-if="actionError"
      variant="danger"
      title="Gagal Memperbarui Status"
      dismissible
      @dismiss="actionError = null"
    >
      {{ actionError }}
    </Alert>

    <!-- Loading Skeleton State -->
    <div v-if="isLoading" class="space-y-6">
      <Card>
        <div class="space-y-3 py-2">
          <Skeleton class="h-6 w-1/3" />
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Skeleton v-for="i in 4" :key="i" class="h-16 w-full rounded-lg" />
          </div>
        </div>
      </Card>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><Skeleton class="h-44 w-full" /></Card>
        <Card><Skeleton class="h-44 w-full" /></Card>
      </div>

      <Card><Skeleton class="h-64 w-full" /></Card>
    </div>

    <!-- Loaded Content -->
    <div v-else-if="prescription" class="space-y-6">
      <!-- 1. Progress Step Tracker -->
      <Card class="overflow-hidden">
        <div class="py-1">
          <div
            class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4"
          >
            Alur Pengerjaan Resep
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              v-for="(step, idx) in steps"
              :key="step.key"
              class="flex flex-col p-3 rounded-lg border transition-all"
              :class="[
                idx < currentStepIndex
                  ? 'bg-slate-900/60 border-emerald-800/40 text-emerald-400'
                  : idx === currentStepIndex
                    ? 'bg-blue-950/40 border-blue-600/70 text-blue-300 ring-1 ring-blue-500/30'
                    : 'bg-slate-900/20 border-slate-800 text-slate-500',
              ]"
            >
              <div class="flex items-center gap-2">
                <span
                  class="flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-bold"
                  :class="[
                    idx < currentStepIndex
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : idx === currentStepIndex
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-500',
                  ]"
                >
                  <svg
                    v-if="idx < currentStepIndex"
                    class="h-3 w-3"
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
                  <span v-else>{{ idx + 1 }}</span>
                </span>
                <span class="text-xs font-semibold">
                  {{ step.label }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1 pl-7">
                {{ step.desc }}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <!-- 2. Two-Column Info Cards: Patient Info & Doctor/Queue Info -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Patient Information Card -->
        <Card title="Identitas Pasien">
          <div class="space-y-4">
            <div
              class="flex items-center justify-between border-b border-slate-800/80 pb-3"
            >
              <div>
                <div class="text-base font-bold text-slate-100">
                  {{ prescription.patient.fullName }}
                </div>
                <div class="text-xs text-slate-400 mt-0.5">
                  ID: {{ prescription.patient.id }}
                </div>
              </div>
              <Badge variant="default">
                {{
                  prescription.patient.gender === "MALE"
                    ? "Laki-laki"
                    : "Perempuan"
                }}
              </Badge>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div
                class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400 block text-[11px]"
                  >Nomor Induk Kependudukan (NIK)</span
                >
                <span class="font-mono text-slate-200 font-medium">
                  {{ prescription.patient.nik || "-" }}
                </span>
              </div>

              <div
                class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400 block text-[11px]"
                  >Nomor Telepon / WhatsApp</span
                >
                <span class="font-mono text-slate-200 font-medium">
                  {{ prescription.patient.phone || "-" }}
                </span>
              </div>

              <div
                class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400 block text-[11px]"
                  >Tanggal Lahir</span
                >
                <span class="text-slate-200 font-medium">
                  {{ prescription.patient.dateOfBirth || "-" }}
                </span>
              </div>

              <div
                class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400 block text-[11px]"
                  >Perkiraan Usia</span
                >
                <span class="text-slate-200 font-medium">
                  {{ calculateAge(prescription.patient.dateOfBirth) }}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <!-- Doctor & Queue Information Card -->
        <Card title="Dokter Peresep & Informasi Klinis">
          <div class="space-y-4">
            <div
              class="flex items-center justify-between border-b border-slate-800/80 pb-3"
            >
              <div>
                <div class="text-base font-bold text-slate-100">
                  {{ prescription.doctor.name }}
                </div>
                <div class="text-xs text-blue-400 mt-0.5">
                  {{ prescription.doctor.specialization }} •
                  {{ prescription.doctor.poliName }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-[11px] text-slate-400">Nomor Antrean</div>
                <span
                  class="font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-xs"
                >
                  {{ prescription.queue?.queueNumber || "-" }}
                </span>
              </div>
            </div>

            <div class="space-y-2 text-xs">
              <!-- Booking code and date -->
              <div
                class="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400">Kode Booking:</span>
                <span class="font-mono font-semibold text-slate-200">
                  {{ prescription.queue?.bookingCode || "-" }}
                </span>
              </div>

              <!-- Diagnosis dokter -->
              <div
                class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400 block text-[11px]"
                  >Diagnosis Dokter:</span
                >
                <span class="text-slate-200 font-medium mt-0.5 block">
                  {{
                    prescription.queue?.diagnosis ||
                    "Tidak ada diagnosis tertulis"
                  }}
                </span>
              </div>

              <!-- Catatan Dokter / Instruksi Resep -->
              <div
                class="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
              >
                <span class="text-slate-400 block text-[11px]"
                  >Catatan Khusus Resep:</span
                >
                <span class="text-slate-300 italic mt-0.5 block">
                  {{
                    prescription.notes ||
                    prescription.queue?.notes ||
                    "Tidak ada catatan tambahan"
                  }}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <!-- 3. Medicine Items List Table Card -->
      <Card>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-semibold text-slate-100">
                Daftar Obat Resep ({{ prescription.items.length }} Item)
              </h2>
              <Badge v-if="hasStockShortage" variant="danger">
                Perhatian: Stok Menipis
              </Badge>
            </div>
            <div class="text-xs text-slate-400">
              Dibuat: {{ formatDateTime(prescription.createdAt) }}
            </div>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300">
            <thead
              class="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800"
            >
              <tr>
                <th class="p-3.5">#</th>
                <th class="p-3.5">Nama Obat & Kategori</th>
                <th class="p-3.5">Dosis</th>
                <th class="p-3.5">Jumlah</th>
                <th class="p-3.5">Aturan Pakai</th>
                <th class="p-3.5">Ketersediaan Stok</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80">
              <tr
                v-for="(item, index) in prescription.items"
                :key="item.id"
                class="hover:bg-slate-900/60 transition-colors"
              >
                <!-- Number -->
                <td class="p-3.5 font-mono text-slate-500">
                  {{ index + 1 }}
                </td>

                <!-- Medicine Name & Category -->
                <td class="p-3.5">
                  <div class="font-semibold text-slate-100 text-sm">
                    {{ item.medicineName }}
                  </div>
                  <div class="text-[11px] text-slate-400 mt-0.5">
                    {{ item.medicineCategory }}
                  </div>
                </td>

                <!-- Dosage -->
                <td class="p-3.5 font-medium text-slate-200">
                  {{ item.dosage || "-" }}
                </td>

                <!-- Quantity & Unit -->
                <td class="p-3.5 whitespace-nowrap">
                  <span class="font-bold text-slate-100 text-sm">
                    {{ item.quantity }}
                  </span>
                  <span class="text-slate-400 ml-1">
                    {{ item.unit }}
                  </span>
                </td>

                <!-- Instructions -->
                <td class="p-3.5 text-slate-300">
                  <div
                    class="bg-slate-900/70 px-2.5 py-1.5 rounded border border-slate-800 text-slate-200 font-mono text-[11px] inline-block"
                  >
                    {{ item.instructions || "Sesuai anjuran dokter" }}
                  </div>
                </td>

                <!-- Stock check -->
                <td class="p-3.5 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-xs font-semibold px-2 py-0.5 rounded"
                      :class="[
                        item.currentStock >= item.quantity
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/60 font-bold animate-pulse',
                      ]"
                    >
                      Stok: {{ item.currentStock }} {{ item.unit }}
                    </span>
                    <span
                      v-if="item.currentStock < item.quantity"
                      class="text-[10px] text-rose-400 font-medium"
                    >
                      (Kurang {{ item.quantity - item.currentStock }})
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- 4. Status Action Controller Panel -->
      <Card title="Aksi Status & Verifikasi Farmasi">
        <div class="space-y-4">
          <!-- Status: Pending -->
          <div
            v-if="prescription.status === 'pending'"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-950/20 border border-amber-800/40"
          >
            <div>
              <div class="text-sm font-bold text-amber-300">
                Resep Masuk Menunggu Diproses
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Silakan verifikasi ketersediaan obat di atas sebelum mulai
                meracik atau menyiapkan resep.
              </p>
            </div>

            <div class="flex items-center gap-2.5">
              <Button
                variant="primary"
                size="md"
                :loading="isUpdating"
                @click="updateStatus('preparing')"
              >
                <template #icon>
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
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </template>
                Mulai Meracik (Preparing)
              </Button>

              <Button
                variant="outline"
                size="md"
                :loading="isUpdating"
                @click="updateStatus('ready')"
              >
                Langsung Tandai Siap (Ready)
              </Button>
            </div>
          </div>

          <!-- Status: Preparing -->
          <div
            v-else-if="prescription.status === 'preparing'"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-blue-950/20 border border-blue-800/40"
          >
            <div>
              <div class="text-sm font-bold text-blue-300">
                Obat Sedang Diracik / Disiapkan
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Jika seluruh obat telah dikemas dan etiket aturan pakai sudah
                ditempel, tandai resep sebagai Siap Diambil.
              </p>
            </div>

            <div class="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                :loading="isUpdating"
                @click="updateStatus('pending')"
              >
                Kembalikan ke Pending
              </Button>

              <Button
                variant="primary"
                size="md"
                :loading="isUpdating"
                @click="updateStatus('ready')"
              >
                <template #icon>
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
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </template>
                Tandai Siap Diambil (Ready)
              </Button>
            </div>
          </div>

          <!-- Status: Ready -->
          <div
            v-else-if="prescription.status === 'ready'"
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40"
          >
            <div>
              <div class="text-sm font-bold text-emerald-300">
                Obat Siap Diambil Pasien
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Panggil nomor antrean pasien ke loket farmasi. Saat obat
                diserahkan, klik konfirmasi untuk mengurangi stok obat otomatis.
              </p>
            </div>

            <div class="flex items-center gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                :loading="isUpdating"
                @click="updateStatus('preparing')"
              >
                Kembalikan ke Preparing
              </Button>

              <Button
                variant="primary"
                size="md"
                :loading="isUpdating"
                @click="showTakenConfirmModal = true"
              >
                <template #icon>
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
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </template>
                Serahkan Obat ke Pasien (Taken)
              </Button>
            </div>
          </div>

          <!-- Status: Taken -->
          <div
            v-else-if="prescription.status === 'taken'"
            class="flex items-start gap-3 p-4 rounded-lg bg-slate-900 border border-slate-800"
          >
            <div
              class="h-8 w-8 rounded-full bg-emerald-950 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 border border-emerald-800/60"
            >
              <svg
                class="h-5 w-5"
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
            </div>
            <div>
              <div class="text-sm font-bold text-slate-100">
                Resep Telah Selesai Diserahkan (Final)
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Obat telah diserahkan ke pasien dan stok obat telah berhasil
                dipotong dari inventaris apotek secara otomatis. Terakhir
                diperbarui pada {{ formatDateTime(prescription.updatedAt) }}.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Modal Konfirmasi Penyerahan Obat (Taken) -->
    <div
      v-if="showTakenConfirmModal"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="h-10 w-10 rounded-full bg-blue-950 flex items-center justify-center text-blue-400 shrink-0 border border-blue-800/60"
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
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-100">
              Konfirmasi Penyerahan Obat
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Pastikan identitas pasien sudah sesuai dengan resep.
            </p>
          </div>
        </div>

        <div
          class="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5"
        >
          <div>
            <strong class="text-slate-400">Pasien:</strong>
            {{ prescription?.patient.fullName }}
          </div>
          <div>
            <strong class="text-slate-400">Nomor Antrean:</strong>
            {{ prescription?.queue?.queueNumber || "-" }}
          </div>
          <div>
            <strong class="text-slate-400">Jumlah Item:</strong>
            {{ prescription?.items.length }} macam obat
          </div>
          <div
            class="text-[11px] text-amber-400 font-medium pt-1 border-t border-slate-800/80 mt-2"
          >
            Peringatan: Aksi ini akan otomatis mengurangi stok obat di gudang
            farmasi dan mengubah status resep menjadi Selesai (Taken).
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            :disabled="isUpdating"
            @click="showTakenConfirmModal = false"
          >
            Batal
          </Button>

          <Button
            variant="primary"
            size="sm"
            :loading="isUpdating"
            @click="updateStatus('taken')"
          >
            Ya, Serahkan Obat
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
