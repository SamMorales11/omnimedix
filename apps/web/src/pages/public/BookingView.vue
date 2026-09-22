<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
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
import AppLogo from "../../components/ui/AppLogo.vue";
import { downloadTicketImage } from "../../utils/downloadTicket";

// Interface definisi data API
export interface PublicPoli {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  activeDoctorsCount: number;
}

export interface DoctorQuota {
  total: number;
  booked: number;
  remaining: number;
}

export interface PublicDoctor {
  id: string;
  name: string;
  specialization: string;
  poliId: string;
  poliName: string;
  isActive: boolean;
  quota: DoctorQuota;
}

export interface BookingQueueResult {
  queueNumber: string;
  bookingCode: string;
  poliName: string;
  doctorName: string;
  estimasi: string | null;
  status: "waiting";
  queueDate: string;
  patient: {
    id: string;
    fullName: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const router = useRouter();
const toast = useToast();

// Stepper state (1: Poli, 2: Dokter, 3: Pasien, 4: Konfirmasi / Sukses)
const currentStep = ref<1 | 2 | 3 | 4>(1);

// Step 1: Poli state
const polis = ref<PublicPoli[]>([]);
const isLoadingPolis = ref(false);
const polisError = ref<string | null>(null);
const selectedPoli = ref<PublicPoli | null>(null);

// Step 2: Dokter state
const doctors = ref<PublicDoctor[]>([]);
const isLoadingDoctors = ref(false);
const doctorsError = ref<string | null>(null);
const selectedDoctor = ref<PublicDoctor | null>(null);

// Step 3: Pasien form state
const birthType = ref<"dob" | "age">("dob");
const form = reactive({
  fullName: "",
  dateOfBirth: "",
  age: "",
  gender: "L" as "L" | "P",
  phone: "",
  nik: "",
});

const formErrors = reactive({
  fullName: "",
  dateOfBirth: "",
  age: "",
  gender: "",
  phone: "",
  nik: "",
});

// Step 4: Submission & Result state
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const bookingResult = ref<BookingQueueResult | null>(null);

// Copy indicators
const copiedCode = ref(false);
const copiedQueue = ref(false);

// Tanggal kunjungan hari ini
const todayFormatted = computed(() => {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
});

// 1. Fetch daftar Poliklinik
async function fetchPolis() {
  isLoadingPolis.value = true;
  polisError.value = null;

  try {
    const res = await apiClient<ApiResponse<PublicPoli[]>>("/public/polis");
    if (res.success && Array.isArray(res.data)) {
      polis.value = res.data;
    } else {
      polisError.value = "Gagal memuat daftar poliklinik.";
    }
  } catch (err: any) {
    console.error("Error fetching polis:", err);
    polisError.value =
      err?.data?.error?.message ||
      "Terjadi kendala jaringan saat memuat poliklinik. Silakan coba lagi.";
  } finally {
    isLoadingPolis.value = false;
  }
}

// 2. Pilih Poli & Fetch Dokter
async function handleSelectPoli(poli: PublicPoli) {
  selectedPoli.value = poli;
  selectedDoctor.value = null; // reset dokter sebelumnya
  currentStep.value = 2;
  await fetchDoctors(poli.id);
}

// 3. Fetch daftar Dokter berdasarkan Poli
async function fetchDoctors(poliId: string) {
  isLoadingDoctors.value = true;
  doctorsError.value = null;

  try {
    const res = await apiClient<ApiResponse<PublicDoctor[]>>(
      "/public/doctors",
      {
        query: { poliId },
      },
    );
    if (res.success && Array.isArray(res.data)) {
      doctors.value = res.data;
    } else {
      doctorsError.value = "Gagal memuat jadwal dokter.";
    }
  } catch (err: any) {
    console.error("Error fetching doctors:", err);
    doctorsError.value =
      err?.data?.error?.message ||
      "Terjadi kendala saat memuat data dokter. Silakan coba lagi.";
  } finally {
    isLoadingDoctors.value = false;
  }
}

// 4. Pilih Dokter
function handleSelectDoctor(doctor: PublicDoctor) {
  if (doctor.quota.remaining <= 0) {
    toast.warning("Kuota pendaftaran untuk dokter ini sudah penuh hari ini.");
    return;
  }
  selectedDoctor.value = doctor;
}

// 5. Navigasi Antar Langkah
function goToStep(step: 1 | 2 | 3 | 4) {
  if (bookingResult.value) return; // Kunci jika sudah berhasil terbit tiket

  if (step === 2 && !selectedPoli.value) {
    toast.warning("Silakan pilih poliklinik terlebih dahulu.");
    return;
  }
  if (step === 3 && (!selectedPoli.value || !selectedDoctor.value)) {
    toast.warning("Silakan pilih dokter terlebih dahulu.");
    return;
  }
  if (step === 4) {
    if (!validatePatientForm()) {
      return;
    }
  }

  currentStep.value = step;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 6. Validasi Form Pasien
function validatePatientForm(): boolean {
  let isValid = true;

  // Reset errors
  formErrors.fullName = "";
  formErrors.dateOfBirth = "";
  formErrors.age = "";
  formErrors.gender = "";
  formErrors.phone = "";
  formErrors.nik = "";

  // Nama Lengkap
  if (!form.fullName.trim()) {
    formErrors.fullName = "Nama lengkap pasien wajib diisi.";
    isValid = false;
  } else if (form.fullName.trim().length < 2) {
    formErrors.fullName = "Nama lengkap minimal 2 karakter.";
    isValid = false;
  }

  // Tanggal Lahir / Usia
  if (birthType.value === "dob") {
    if (!form.dateOfBirth) {
      formErrors.dateOfBirth = "Tanggal lahir wajib dipilih.";
      isValid = false;
    } else {
      const selected = new Date(form.dateOfBirth);
      const today = new Date();
      if (selected > today) {
        formErrors.dateOfBirth = "Tanggal lahir tidak boleh di masa depan.";
        isValid = false;
      }
    }
  } else {
    const ageNum = Number(form.age);
    if (!form.age || isNaN(ageNum) || ageNum <= 0 || ageNum > 125) {
      formErrors.age = "Masukkan usia valid antara 1 - 125 tahun.";
      isValid = false;
    }
  }

  // Nomor HP / WA
  const cleanPhone = form.phone.replace(/\D/g, "");
  if (!form.phone.trim()) {
    formErrors.phone = "Nomor WhatsApp / telepon wajib diisi.";
    isValid = false;
  } else if (cleanPhone.length < 8 || cleanPhone.length > 16) {
    formErrors.phone = "Nomor telepon harus antara 8 hingga 16 digit.";
    isValid = false;
  }

  // NIK (Opsional)
  if (form.nik.trim()) {
    const cleanNik = form.nik.trim();
    if (!/^\d{16}$/.test(cleanNik)) {
      formErrors.nik = "NIK harus terdiri dari tepat 16 digit angka.";
      isValid = false;
    }
  }

  return isValid;
}

function handlePatientSubmit() {
  if (validatePatientForm()) {
    goToStep(4);
  } else {
    toast.error("Mohon lengkapi formulir dengan data yang valid.");
  }
}

// 7. Submit Booking Final
async function handleConfirmBooking() {
  if (!selectedPoli.value || !selectedDoctor.value) {
    toast.error("Data poliklinik atau dokter tidak valid.");
    return;
  }

  if (!validatePatientForm()) {
    goToStep(3);
    return;
  }

  isSubmitting.value = true;
  submitError.value = null;

  const payload = {
    poliId: selectedPoli.value.id,
    doctorId: selectedDoctor.value.id,
    patient: {
      fullName: form.fullName.trim(),
      ...(birthType.value === "dob"
        ? { dateOfBirth: form.dateOfBirth }
        : { age: Number(form.age) }),
      gender: form.gender,
      phone: form.phone.trim(),
      nik: form.nik.trim() || undefined,
    },
  };

  try {
    const res = await apiClient<ApiResponse<BookingQueueResult>>(
      "/public/queues",
      {
        method: "POST",
        body: payload,
      },
    );

    if (res.success && res.data) {
      bookingResult.value = res.data;
      toast.success("Nomor antrean Anda berhasil diterbitkan!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      submitError.value =
        res.error?.message ||
        "Gagal menerbitkan antrean. Silakan coba kembali.";
    }
  } catch (err: any) {
    console.error("Error creating booking:", err);
    const errorMessage =
      err?.data?.error?.message ||
      "Terjadi kesalahan saat memproses antrean Anda. Silakan periksa kembali data Anda.";
    submitError.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    isSubmitting.value = false;
  }
}

// 8. Salin ke Clipboard
async function copyToClipboard(text: string, type: "code" | "queue") {
  try {
    await navigator.clipboard.writeText(text);
    if (type === "code") {
      copiedCode.value = true;
      setTimeout(() => (copiedCode.value = false), 2000);
      toast.success("Kode booking berhasil disalin!");
    } else {
      copiedQueue.value = true;
      setTimeout(() => (copiedQueue.value = false), 2000);
      toast.success("Nomor antrean berhasil disalin!");
    }
  } catch {
    toast.error("Gagal menyalin otomatis ke papan klip.");
  }
}

// 9. Cetak & Unduh Tiket
function printTicket() {
  window.print();
}

function handleDownloadTicket() {
  if (!bookingResult.value) return;
  downloadTicketImage({
    queueNumber: bookingResult.value.queueNumber,
    bookingCode: bookingResult.value.bookingCode,
    patientName: bookingResult.value.patient.fullName,
    poliName: bookingResult.value.poliName,
    doctorName: bookingResult.value.doctorName,
    queueDate: bookingResult.value.queueDate,
    status: bookingResult.value.status,
    estimasi: bookingResult.value.estimasi,
  });
  toast.success("Gambar bukti antrean berhasil diunduh!");
}

// 10. Reset Form untuk Pendaftaran Baru
function resetBooking() {
  bookingResult.value = null;
  selectedPoli.value = null;
  selectedDoctor.value = null;
  form.fullName = "";
  form.dateOfBirth = "";
  form.age = "";
  form.phone = "";
  form.nik = "";
  currentStep.value = 1;
  fetchPolis();
}

onMounted(() => {
  fetchPolis();
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
    <!-- Header Section -->
    <div class="space-y-2 text-center max-w-xl mx-auto print:hidden">
      <Badge variant="primary" dot>Pendaftaran Mandiri</Badge>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
        Pendaftaran Antrean Online
      </h1>
      <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
        Pilih poli, dokter praktik, dan daftarkan kunjungan rawat jalan Anda
        secara cepat dan transparan.
      </p>
    </div>

    <!-- Stepper Navigation (Hanya tampil sebelum tiket terbit) -->
    <nav
      v-if="!bookingResult"
      aria-label="Tahapan Pendaftaran"
      class="bg-slate-900/70 border border-slate-800 rounded-xl p-3 sm:p-4 print:hidden"
    >
      <ol class="grid grid-cols-4 gap-2 sm:gap-4 text-xs font-medium">
        <!-- Step 1 Indicator -->
        <li
          @click="goToStep(1)"
          :class="[
            'flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer select-none',
            currentStep === 1
              ? 'text-blue-400 bg-blue-950/40 border border-blue-800/60 font-semibold'
              : currentStep > 1
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-slate-500 hover:text-slate-400',
          ]"
        >
          <span
            :class="[
              'h-6 w-6 rounded-full flex items-center justify-center text-2xs shrink-0 font-bold',
              currentStep === 1
                ? 'bg-blue-600 text-white'
                : currentStep > 1
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700',
            ]"
          >
            <span v-if="currentStep > 1">✓</span>
            <span v-else>1</span>
          </span>
          <span class="truncate hidden sm:inline">Pilih Poli</span>
          <span class="truncate sm:hidden">Poli</span>
        </li>

        <!-- Step 2 Indicator -->
        <li
          @click="goToStep(2)"
          :class="[
            'flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer select-none',
            currentStep === 2
              ? 'text-blue-400 bg-blue-950/40 border border-blue-800/60 font-semibold'
              : currentStep > 2
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-slate-500 hover:text-slate-400',
          ]"
        >
          <span
            :class="[
              'h-6 w-6 rounded-full flex items-center justify-center text-2xs shrink-0 font-bold',
              currentStep === 2
                ? 'bg-blue-600 text-white'
                : currentStep > 2
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700',
            ]"
          >
            <span v-if="currentStep > 2">✓</span>
            <span v-else>2</span>
          </span>
          <span class="truncate hidden sm:inline">Pilih Dokter</span>
          <span class="truncate sm:hidden">Dokter</span>
        </li>

        <!-- Step 3 Indicator -->
        <li
          @click="goToStep(3)"
          :class="[
            'flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer select-none',
            currentStep === 3
              ? 'text-blue-400 bg-blue-950/40 border border-blue-800/60 font-semibold'
              : currentStep > 3
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-slate-500 hover:text-slate-400',
          ]"
        >
          <span
            :class="[
              'h-6 w-6 rounded-full flex items-center justify-center text-2xs shrink-0 font-bold',
              currentStep === 3
                ? 'bg-blue-600 text-white'
                : currentStep > 3
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700',
            ]"
          >
            <span v-if="currentStep > 3">✓</span>
            <span v-else>3</span>
          </span>
          <span class="truncate hidden sm:inline">Data Pasien</span>
          <span class="truncate sm:hidden">Pasien</span>
        </li>

        <!-- Step 4 Indicator -->
        <li
          @click="goToStep(4)"
          :class="[
            'flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer select-none',
            currentStep === 4
              ? 'text-blue-400 bg-blue-950/40 border border-blue-800/60 font-semibold'
              : 'text-slate-500 hover:text-slate-400',
          ]"
        >
          <span
            :class="[
              'h-6 w-6 rounded-full flex items-center justify-center text-2xs shrink-0 font-bold',
              currentStep === 4
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-700',
            ]"
          >
            4
          </span>
          <span class="truncate hidden sm:inline">Konfirmasi</span>
          <span class="truncate sm:hidden">Selesai</span>
        </li>
      </ol>
    </nav>

    <!-- ============================================================= -->
    <!-- STEP 1: PILIH POLIKLINIK -->
    <!-- ============================================================= -->
    <section v-if="currentStep === 1 && !bookingResult" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">
            Langkah 1: Pilih Poliklinik
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Pilih poli rawat jalan tujuan untuk memeriksa dokter yang bertugas.
          </p>
        </div>
        <Badge variant="default">Kunjungan: Hari Ini</Badge>
      </div>

      <!-- Error State -->
      <Alert v-if="polisError" variant="danger" title="Gagal Memuat Poliklinik">
        <p>{{ polisError }}</p>
        <Button size="sm" variant="outline" class="mt-3" @click="fetchPolis">
          Coba Muat Ulang ⟳
        </Button>
      </Alert>

      <!-- Loading State: Skeletons -->
      <div v-if="isLoadingPolis" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3"
        >
          <div class="flex justify-between items-start">
            <Skeleton variant="text" width="60%" class="h-4" />
            <Skeleton variant="rounded" width="70px" class="h-5" />
          </div>
          <Skeleton variant="text" width="90%" class="h-3" />
          <Skeleton variant="text" width="40%" class="h-3" />
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="polis.length === 0 && !polisError"
        title="Tidak ada poliklinik aktif"
        description="Saat ini belum ada poliklinik yang beroperasi atau membuka pendaftaran antrean."
      >
        <template #action>
          <Button size="sm" variant="secondary" @click="fetchPolis">
            Periksa Kembali ⟳
          </Button>
        </template>
      </EmptyState>

      <!-- Poliklinik Cards Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div
          v-for="poli in polis"
          :key="poli.id"
          @click="handleSelectPoli(poli)"
          :class="[
            'group relative p-4 sm:p-5 rounded-xl border text-left transition-all duration-150 cursor-pointer',
            selectedPoli?.id === poli.id
              ? 'bg-blue-950/30 border-blue-600/80 shadow-md ring-1 ring-blue-500/30'
              : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900',
          ]"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <AppLogo size="xs" :clickable="false" :show-text="false" />
              <h3
                class="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors truncate"
              >
                {{ poli.name }}
              </h3>
            </div>
            <Badge
              :variant="poli.activeDoctorsCount > 0 ? 'success' : 'default'"
              size="sm"
              class="shrink-0"
            >
              {{ poli.activeDoctorsCount }} Dokter Aktif
            </Badge>
          </div>

          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
            {{
              poli.description ||
              "Layanan rawat jalan terpadu dengan standar medis profesional."
            }}
          </p>

          <div
            class="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3"
          >
            <span class="text-2xs text-slate-500">Buka Hari Ini</span>
            <span
              class="text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1"
            >
              Pilih Poli →
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ============================================================= -->
    <!-- STEP 2: PILIH DOKTER -->
    <!-- ============================================================= -->
    <section v-else-if="currentStep === 2 && !bookingResult" class="space-y-4">
      <!-- Breadcrumb / Selected Poli Info -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 text-xs"
      >
        <div class="flex items-center gap-2.5">
          <AppLogo size="xs" :clickable="false" :show-text="false" />
          <div>
            <span class="text-slate-400 mr-1.5">Poli Terpilih:</span>
            <span class="font-semibold text-slate-100">{{
              selectedPoli?.name
            }}</span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          class="text-blue-400 hover:text-blue-300 self-start sm:self-auto -my-1"
          @click="goToStep(1)"
        >
          ← Ganti Poliklinik
        </Button>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-slate-100">
            Langkah 2: Pilih Dokter Praktik
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Pilih dokter yang sedang bertugas untuk sesi rawat jalan hari ini.
          </p>
        </div>
      </div>

      <!-- Error State -->
      <Alert v-if="doctorsError" variant="danger" title="Gagal Memuat Dokter">
        <p>{{ doctorsError }}</p>
        <Button
          size="sm"
          variant="outline"
          class="mt-3"
          @click="fetchDoctors(selectedPoli!.id)"
        >
          Coba Muat Ulang ⟳
        </Button>
      </Alert>

      <!-- Loading State: Skeletons -->
      <div v-if="isLoadingDoctors" class="space-y-3">
        <div
          v-for="i in 3"
          :key="i"
          class="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-4"
        >
          <div class="space-y-2 flex-1">
            <Skeleton variant="text" width="40%" class="h-4" />
            <Skeleton variant="text" width="25%" class="h-3" />
          </div>
          <Skeleton variant="rounded" width="100px" class="h-8" />
        </div>
      </div>

      <!-- Empty State -->
      <EmptyState
        v-else-if="doctors.length === 0 && !doctorsError"
        title="Tidak ada dokter aktif saat ini"
        :description="`Saat ini belum ada dokter praktik yang terdaftar aktif di ${selectedPoli?.name} untuk jadwal hari ini.`"
      >
        <template #action>
          <Button size="sm" variant="secondary" @click="goToStep(1)">
            ← Pilih Poliklinik Lain
          </Button>
        </template>
      </EmptyState>

      <!-- Doctors List -->
      <div v-else class="space-y-3">
        <div
          v-for="doc in doctors"
          :key="doc.id"
          @click="handleSelectDoctor(doc)"
          :class="[
            'p-4 sm:p-5 rounded-xl border transition-all duration-150 select-none flex flex-col sm:flex-row sm:items-center justify-between gap-4',
            doc.quota.remaining <= 0
              ? 'bg-slate-900/40 border-slate-800/60 opacity-60 cursor-not-allowed'
              : selectedDoctor?.id === doc.id
                ? 'bg-blue-950/30 border-blue-600 shadow-md ring-1 ring-blue-500/30 cursor-pointer'
                : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 cursor-pointer',
          ]"
        >
          <!-- Doctor Details -->
          <div class="flex items-start gap-3.5">
            <!-- Doctor Avatar Placeholder -->
            <div
              :class="[
                'h-11 w-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold border',
                selectedDoctor?.id === doc.id
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700',
              ]"
            >
              dr
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-slate-100">
                  {{ doc.name }}
                </h3>
                <span
                  v-if="selectedDoctor?.id === doc.id"
                  class="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-500/40"
                  aria-label="Terpilih"
                />
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ doc.specialization }}
              </p>
              <div class="flex items-center gap-2 mt-2">
                <Badge
                  :variant="
                    doc.quota.remaining > 5
                      ? 'success'
                      : doc.quota.remaining > 0
                        ? 'warning'
                        : 'danger'
                  "
                  size="sm"
                >
                  <span v-if="doc.quota.remaining > 0">
                    Sisa Kuota: {{ doc.quota.remaining }} Pasien
                  </span>
                  <span v-else>Kuota Penuh</span>
                </Badge>
                <span class="text-2xs text-slate-500">
                  Terisi: {{ doc.quota.booked }}/{{ doc.quota.total }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Button / Selection indicator -->
          <div class="sm:shrink-0 text-right">
            <Button
              v-if="doc.quota.remaining > 0"
              size="sm"
              :variant="selectedDoctor?.id === doc.id ? 'primary' : 'secondary'"
              @click.stop="handleSelectDoctor(doc)"
            >
              {{
                selectedDoctor?.id === doc.id
                  ? "✓ Dokter Terpilih"
                  : "Pilih Dokter"
              }}
            </Button>
            <span
              v-else
              class="text-xs text-rose-400 font-medium px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 inline-block"
            >
              Tidak Tersedia
            </span>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div
          class="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3"
        >
          <Button variant="secondary" size="md" @click="goToStep(1)">
            ← Kembali ke Poli
          </Button>

          <Button
            variant="primary"
            size="md"
            :disabled="!selectedDoctor"
            @click="goToStep(3)"
          >
            Lanjut Isi Data Pasien →
          </Button>
        </div>
      </div>
    </section>

    <!-- ============================================================= -->
    <!-- STEP 3: ISI DATA PASIEN -->
    <!-- ============================================================= -->
    <section v-else-if="currentStep === 3 && !bookingResult" class="space-y-4">
      <!-- Recap Header -->
      <div
        class="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3.5 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <div>
          <span class="text-slate-500">Poli: </span>
          <strong class="text-slate-200">{{ selectedPoli?.name }}</strong>
        </div>
        <div>
          <span class="text-slate-500">Dokter: </span>
          <strong class="text-slate-200">{{ selectedDoctor?.name }}</strong>
        </div>
      </div>

      <Card
        title="Langkah 3: Formulir Identitas Pasien"
        subtitle="Data akan digunakan untuk penerbitan tiket dan rekam medis klinik."
      >
        <form
          @submit.prevent="handlePatientSubmit"
          class="space-y-4"
          novalidate
        >
          <!-- Nama Lengkap -->
          <Input
            id="fullName"
            label="Nama Lengkap Pasien"
            placeholder="Contoh: Ahmad Fauzi"
            v-model="form.fullName"
            :error="formErrors.fullName"
            required
            helperText="Masukkan nama lengkap sesuai kartu identitas resmi."
          />

          <!-- Jenis Kelamin -->
          <div class="space-y-1.5 text-left">
            <label class="block text-xs font-medium text-slate-300">
              Jenis Kelamin <span class="text-rose-400">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="form.gender = 'L'"
                :class="[
                  'py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors',
                  form.gender === 'L'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-200 ring-1 ring-blue-500/25'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200',
                ]"
              >
                Laki-laki (L)
              </button>
              <button
                type="button"
                @click="form.gender = 'P'"
                :class="[
                  'py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors',
                  form.gender === 'P'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-200 ring-1 ring-blue-500/25'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200',
                ]"
              >
                Perempuan (P)
              </button>
            </div>
          </div>

          <!-- Opsi Tanggal Lahir / Usia -->
          <div class="space-y-2 text-left">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-medium text-slate-300">
                Informasi Usia / Tanggal Lahir
                <span class="text-rose-400">*</span>
              </label>
              <!-- Switch Tab -->
              <div
                class="inline-flex rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-2xs"
              >
                <button
                  type="button"
                  @click="birthType = 'dob'"
                  :class="[
                    'px-2.5 py-1 rounded-md transition-colors',
                    birthType === 'dob'
                      ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200',
                  ]"
                >
                  Tanggal Lahir
                </button>
                <button
                  type="button"
                  @click="birthType = 'age'"
                  :class="[
                    'px-2.5 py-1 rounded-md transition-colors',
                    birthType === 'age'
                      ? 'bg-slate-800 text-slate-100 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200',
                  ]"
                >
                  Input Usia Langsung
                </button>
              </div>
            </div>

            <!-- Tanggal Lahir Input -->
            <Input
              v-if="birthType === 'dob'"
              id="dateOfBirth"
              type="date"
              v-model="form.dateOfBirth"
              :error="formErrors.dateOfBirth"
              helperText="Format: tanggal / bulan / tahun"
              required
            />

            <!-- Usia Input -->
            <Input
              v-else
              id="age"
              type="number"
              min="1"
              max="125"
              placeholder="Contoh: 28"
              v-model="form.age"
              :error="formErrors.age"
              helperText="Masukkan angka usia pasien saat ini (dalam tahun)."
              required
            />
          </div>

          <!-- Nomor WhatsApp / HP -->
          <Input
            id="phone"
            type="tel"
            label="Nomor WhatsApp / HP"
            placeholder="081234567890"
            v-model="form.phone"
            :error="formErrors.phone"
            required
            helperText="Notifikasi panggilan antrean akan dikirimkan ke nomor ini."
          />

          <!-- NIK (Opsional) -->
          <Input
            id="nik"
            type="text"
            label="Nomor Induk Kependudukan (NIK) — Opsional"
            placeholder="16 digit angka NIK KTP"
            v-model="form.nik"
            :error="formErrors.nik"
            helperText="Memudahkan pencarian riwayat rekam medis lama di sistem klinik."
          />

          <!-- Action Buttons -->
          <div
            class="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3"
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              @click="goToStep(2)"
            >
              ← Kembali ke Dokter
            </Button>

            <Button type="submit" variant="primary" size="md">
              Lanjut ke Konfirmasi →
            </Button>
          </div>
        </form>
      </Card>
    </section>

    <!-- ============================================================= -->
    <!-- STEP 4: KONFIRMASI RINGKASAN & STATUS SUKSES -->
    <!-- ============================================================= -->
    <section v-else-if="currentStep === 4 || bookingResult" class="space-y-6">
      <!-- 4A: STATE SUKSES (TIKET ANTREAN) -->
      <div v-if="bookingResult" class="space-y-6">
        <!-- Success Alert Header -->
        <Alert variant="success" title="Pendaftaran Antrean Berhasil!">
          Tiket antrean resmi Anda telah diterbitkan. Silakan simpan atau catat
          kode booking Anda untuk memantau status secara berkala.
        </Alert>

        <!-- Official Queue Ticket Card -->
        <div
          class="printable-ticket-card bg-slate-900 border-2 border-blue-600/60 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden print:border-black print:text-black print:bg-white print:p-4"
        >
          <!-- Pixel corner markers for technical healthcare precision -->
          <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-blue-500/80 select-none pointer-events-none print:hidden">+</span>
          <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-blue-500/80 select-none pointer-events-none print:hidden">+</span>
          <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-blue-500/80 select-none pointer-events-none print:hidden">+</span>
          <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-blue-500/80 select-none pointer-events-none print:hidden">+</span>

          <!-- Watermark / Background Glow -->
          <div
            class="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none print:hidden"
          />

          <!-- Ticket Header -->
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4 print:border-black"
          >
            <div>
              <AppLogo
                size="sm"
                :clickable="false"
                theme="print-adaptive"
                show-subtitle
                subtitle="Tiket Reservasi Antrean Rawat Jalan"
              />
            </div>
            <div class="print:hidden">
              <StatusBadge
                status="waiting"
                label="Menunggu Giliran"
                size="md"
              />
            </div>
          </div>

          <!-- Big Numbers Display (Nomor Antrean & Kode Booking) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 text-center">
            <!-- Nomor Antrean Box -->
            <div
              class="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center print:border-black print:bg-white"
            >
              <span
                class="text-xs uppercase font-semibold text-slate-400 tracking-wider"
              >
                Nomor Antrean Anda
              </span>
              <div
                class="text-4xl sm:text-5xl font-mono font-extrabold text-blue-400 tracking-tight my-2 print:text-black"
              >
                {{ bookingResult.queueNumber }}
              </div>
              <Button
                size="sm"
                variant="outline"
                class="mt-1 print:hidden"
                @click="copyToClipboard(bookingResult.queueNumber, 'queue')"
              >
                <span v-if="copiedQueue">✓ Tersalin</span>
                <span v-else>Salin Nomor</span>
              </Button>
            </div>

            <!-- Kode Booking Box -->
            <div
              class="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center print:border-black print:bg-white"
            >
              <span
                class="text-xs uppercase font-semibold text-slate-400 tracking-wider"
              >
                Kode Booking Unik
              </span>
              <div
                class="text-2xl sm:text-3xl font-mono font-bold text-slate-100 tracking-widest my-3 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 print:border-black print:text-black print:bg-white"
              >
                {{ bookingResult.bookingCode }}
              </div>
              <Button
                size="sm"
                variant="outline"
                class="mt-1 print:hidden"
                @click="copyToClipboard(bookingResult.bookingCode, 'code')"
              >
                <span v-if="copiedCode">✓ Tersalin</span>
                <span v-else>Salin Kode</span>
              </Button>
            </div>
          </div>

          <!-- Details Grid -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-t border-b border-slate-800/80 text-xs print:border-black print:text-black"
          >
            <div class="space-y-2">
              <div class="flex justify-between sm:justify-start sm:gap-4">
                <span class="text-slate-500 w-28">Nama Pasien:</span>
                <span class="font-semibold text-slate-200 print:text-black">{{
                  bookingResult.patient.fullName
                }}</span>
              </div>
              <div class="flex justify-between sm:justify-start sm:gap-4">
                <span class="text-slate-500 w-28">Poliklinik:</span>
                <span class="font-semibold text-slate-200 print:text-black">{{
                  bookingResult.poliName
                }}</span>
              </div>
              <div class="flex justify-between sm:justify-start sm:gap-4">
                <span class="text-slate-500 w-28">Dokter:</span>
                <span class="font-semibold text-slate-200 print:text-black">{{
                  bookingResult.doctorName
                }}</span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between sm:justify-start sm:gap-4">
                <span class="text-slate-500 w-28">Tanggal:</span>
                <span class="font-semibold text-slate-200 print:text-black">{{
                  bookingResult.queueDate
                }}</span>
              </div>
              <div class="flex justify-between sm:justify-start sm:gap-4">
                <span class="text-slate-500 w-28">Estimasi Waktu:</span>
                <span class="font-semibold text-amber-400 print:text-black">{{
                  bookingResult.estimasi || "Menunggu panggilan"
                }}</span>
              </div>
              <div class="flex justify-between sm:justify-start sm:gap-4">
                <span class="text-slate-500 w-28">Status:</span>
                <span class="font-semibold text-blue-400 print:text-black"
                  >Menunggu di Poli</span
                >
              </div>
            </div>
          </div>

          <!-- Ticket Footer Info -->
          <div class="mt-4 text-slate-400 text-xs leading-relaxed space-y-1">
            <p>
              💡 <strong>Petunjuk Kunjungan:</strong> Harap hadir di ruang
              tunggu poliklinik 15 menit sebelum estimasi giliran pemeriksaan.
            </p>
            <p class="text-2xs text-slate-500">
              Tunjukkan kode booking atau nomor antrean ini kepada petugas medis
              saat nama Anda dipanggil.
            </p>
          </div>
        </div>

        <!-- Action Controls After Success -->
        <div
          class="flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden"
        >
          <div class="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              class="w-full sm:w-auto flex items-center gap-2"
              @click="printTicket"
            >
              <svg class="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Cetak / PDF</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              class="w-full sm:w-auto flex items-center gap-2"
              @click="handleDownloadTicket"
            >
              <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Unduh Bukti (PNG)</span>
            </Button>
          </div>

          <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button variant="ghost" size="md" @click="resetBooking">
              Daftar Antrean Lain
            </Button>

            <Button
              variant="primary"
              size="md"
              @click="
                router.push({
                  name: 'track-queue',
                  query: { code: bookingResult.bookingCode },
                })
              "
            >
              Lacak Status Sekarang →
            </Button>
          </div>
        </div>
      </div>

      <!-- 4B: STATE KONFIRMASI RINGKASAN (SEBELUM SUBMIT) -->
      <Card
        v-else
        title="Langkah 4: Konfirmasi Pendaftaran Antrean"
        subtitle="Periksa kembali data reservasi Anda sebelum nomor antrean diterbitkan."
      >
        <!-- Submit Error Alert -->
        <Alert
          v-if="submitError"
          variant="danger"
          title="Pendaftaran Gagal"
          class="mb-4"
        >
          {{ submitError }}
        </Alert>

        <div class="space-y-4 text-xs">
          <!-- Group 1: Layanan Medis -->
          <div
            class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5"
          >
            <div
              class="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2"
            >
              Layanan Medis & Jadwal
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span class="text-slate-500">Poliklinik Tujuan:</span>
                <p class="font-semibold text-slate-100 text-sm mt-0.5">
                  {{ selectedPoli?.name }}
                </p>
              </div>
              <div>
                <span class="text-slate-500">Dokter Spesialis:</span>
                <p class="font-semibold text-slate-100 text-sm mt-0.5">
                  {{ selectedDoctor?.name }}
                </p>
                <p class="text-2xs text-slate-400">
                  {{ selectedDoctor?.specialization }}
                </p>
              </div>
              <div>
                <span class="text-slate-500">Tanggal Kunjungan:</span>
                <p class="font-semibold text-slate-200 mt-0.5">
                  {{ todayFormatted }}
                </p>
              </div>
              <div>
                <span class="text-slate-500">Sisa Kuota Dokter:</span>
                <p class="font-semibold text-emerald-400 mt-0.5">
                  {{ selectedDoctor?.quota.remaining }} Pasien Tersedia
                </p>
              </div>
            </div>
          </div>

          <!-- Group 2: Data Pasien -->
          <div
            class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5"
          >
            <div
              class="font-semibold text-slate-200 text-sm border-b border-slate-800 pb-2"
            >
              Identitas Pasien
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span class="text-slate-500">Nama Pasien:</span>
                <p class="font-semibold text-slate-100 text-sm mt-0.5">
                  {{ form.fullName }}
                </p>
              </div>
              <div>
                <span class="text-slate-500">Jenis Kelamin:</span>
                <p class="font-semibold text-slate-200 mt-0.5">
                  {{ form.gender === "L" ? "Laki-laki (L)" : "Perempuan (P)" }}
                </p>
              </div>
              <div>
                <span class="text-slate-500">Usia / Tgl Lahir:</span>
                <p class="font-semibold text-slate-200 mt-0.5">
                  <span v-if="birthType === 'dob'">{{ form.dateOfBirth }}</span>
                  <span v-else>{{ form.age }} Tahun</span>
                </p>
              </div>
              <div>
                <span class="text-slate-500">Nomor WhatsApp / HP:</span>
                <p class="font-semibold text-slate-200 mt-0.5">
                  {{ form.phone }}
                </p>
              </div>
              <div v-if="form.nik" class="sm:col-span-2">
                <span class="text-slate-500">NIK:</span>
                <p class="font-semibold text-slate-200 mt-0.5">
                  {{ form.nik }}
                </p>
              </div>
            </div>
          </div>

          <!-- Peringatan Persetujuan -->
          <Alert variant="info">
            Dengan mengonfirmasi pendaftaran ini, Anda setuju untuk mematuhi
            tata tertib antrean klinik dan hadir tepat waktu sesuai estimasi
            giliran.
          </Alert>

          <!-- Tombol Konfirmasi -->
          <div
            class="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3"
          >
            <Button
              type="button"
              variant="secondary"
              size="md"
              :disabled="isSubmitting"
              @click="goToStep(3)"
            >
              ← Ubah Data Pasien
            </Button>

            <Button
              type="button"
              variant="primary"
              size="md"
              :loading="isSubmitting"
              @click="handleConfirmBooking"
            >
              Konfirmasi & Ambil Nomor Antrean →
            </Button>
          </div>
        </div>
      </Card>
    </section>

    <!-- Quick Tracker Link -->
    <div
      v-if="!bookingResult"
      class="text-center text-xs text-slate-400 pt-2 print:hidden"
    >
      Sudah memiliki kode booking sebelumnya?
      <router-link
        to="/track-queue"
        class="text-blue-500 hover:text-blue-400 font-medium ml-1 transition-colors"
      >
        Lacak antrean Anda di sini →
      </router-link>
    </div>
  </div>
</template>
