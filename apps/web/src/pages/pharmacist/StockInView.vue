<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiClient } from "../../utils/api";
import { useToast } from "../../composables/useToast";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import Alert from "../../components/ui/Alert.vue";

export interface MedicineOption {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  currentStock: number;
  isActive: boolean;
  stockStatus: "normal" | "low" | "out";
}

export interface StockMovementHistory {
  id: string;
  medicineId: string;
  medicineName: string;
  medicineCategory: string;
  unit: string;
  type: "in" | "out";
  quantity: number;
  reason: string;
  referenceId: string | null;
  currentStock: number;
  createdAt: string;
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

// State obat dan riwayat
const medicines = ref<MedicineOption[]>([]);
const recentMovements = ref<StockMovementHistory[]>([]);
const isLoadingMedicines = ref(true);
const isLoadingMovements = ref(true);
const isSubmitting = ref(false);

// State feedback
const successMessage = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const fieldErrors = ref<Record<string, string>>({});

// State Form
const formData = ref({
  medicineId: "",
  quantity: 10,
  reason: "Pembelian Supplier",
  reference: "",
});

// Pilihan alasan cepat
const reasonPresets = [
  "Pembelian Supplier",
  "Pengadaan Rutin Farmasi",
  "Hibah Dinas Kesehatan",
  "Koreksi Stok Fisik",
  "Retur dari Rawat Inap",
];

// Obat yang sedang dipilih
const selectedMedicine = computed(() => {
  return (
    medicines.value.find((m) => m.id === formData.value.medicineId) || null
  );
});

// Perkiraan stok baru setelah obat masuk
const projectedStock = computed(() => {
  if (!selectedMedicine.value) return 0;
  const qty = Number(formData.value.quantity) || 0;
  return selectedMedicine.value.currentStock + qty;
});

// Ambil data obat aktif
async function fetchMedicines() {
  isLoadingMedicines.value = true;
  try {
    const response = await apiClient<ApiResponse<MedicineOption[]>>(
      "/pharmacist/medicines?is_active=true",
    );
    if (response.success && Array.isArray(response.data)) {
      medicines.value = response.data;

      // Jika ada query param ?medicineId=..., pre-select
      const paramMedId = route.query.medicineId as string;
      if (paramMedId && medicines.value.some((m) => m.id === paramMedId)) {
        formData.value.medicineId = paramMedId;
      } else if (medicines.value.length > 0 && !formData.value.medicineId) {
        const firstMed = medicines.value[0];
        if (firstMed) {
          formData.value.medicineId = firstMed.id;
        }
      }
    }
  } catch (err: unknown) {
    console.error("Gagal memuat opsi obat:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Gagal memuat daftar obat.";
  } finally {
    isLoadingMedicines.value = false;
  }
}

// Ambil riwayat obat masuk terbaru
async function fetchRecentMovements() {
  isLoadingMovements.value = true;
  try {
    const response = await apiClient<ApiResponse<StockMovementHistory[]>>(
      "/pharmacist/stock-movements?type=in&limit=10",
    );
    if (response.success && Array.isArray(response.data)) {
      recentMovements.value = response.data;
    }
  } catch (err: unknown) {
    console.error("Gagal memuat riwayat obat masuk:", err);
  } finally {
    isLoadingMovements.value = false;
  }
}

// Validasi Form
function validateForm(): boolean {
  const errors: Record<string, string> = {};

  if (!formData.value.medicineId) {
    errors.medicineId = "Pilih obat yang akan dicatat masuk.";
  }

  const qty = Number(formData.value.quantity);
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    errors.quantity =
      "Jumlah obat masuk harus berupa bilangan bulat positif lebih dari 0.";
  } else if (qty > 100000) {
    errors.quantity = "Jumlah obat masuk maksimal 100.000 unit per transaksi.";
  }

  if (!formData.value.reason.trim()) {
    errors.reason = "Alasan penerimaan obat wajib diisi.";
  }

  fieldErrors.value = errors;
  return Object.keys(errors).length === 0;
}

// Submit Pencatatan Obat Masuk
async function handleSubmitStockIn() {
  if (!validateForm()) return;

  isSubmitting.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const payload = {
      medicineId: formData.value.medicineId,
      type: "in" as const,
      quantity: Number(formData.value.quantity),
      reason: formData.value.reason.trim(),
      reference: formData.value.reference.trim() || undefined,
    };

    const response = await apiClient<
      ApiResponse<{
        id: string;
        medicineId: string;
        medicineName: string;
        currentStock: number;
        unit: string;
        quantity: number;
        type: string;
      }>
    >("/pharmacist/stock-movements", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.success) {
      const data = response.data;
      const msg = `Berhasil mencatat obat masuk: +${data.quantity} ${data.unit} untuk '${data.medicineName}'. Stok saat ini menjadi ${data.currentStock} ${data.unit}.`;
      successMessage.value = msg;
      toast.success(msg, "Stok Berhasil Diperbarui");

      // Perbarui stok lokal di dropdown list
      const med = medicines.value.find((m) => m.id === data.medicineId);
      if (med) {
        med.currentStock = data.currentStock;
        med.stockStatus =
          med.currentStock <= 0
            ? "out"
            : med.currentStock <= med.minStock
              ? "low"
              : "normal";
      }

      // Reset form quantity & reference, tetapi biarkan obat terpilih
      formData.value.quantity = 10;
      formData.value.reference = "";

      // Refresh riwayat mutasi
      fetchRecentMovements();
    } else {
      throw new Error(
        response.error?.message || "Gagal mencatat mutasi obat masuk.",
      );
    }
  } catch (err: unknown) {
    console.error("Gagal simpan obat masuk:", err);
    const errorObj = err as {
      data?: { error?: { message?: string } };
      message?: string;
    };
    errorMessage.value =
      errorObj?.data?.error?.message ||
      errorObj?.message ||
      "Terjadi kendala saat menyimpan pencatatan obat masuk.";
    toast.error(errorMessage.value!, "Gagal Mencatat");
  } finally {
    isSubmitting.value = false;
  }
}

// Format waktu
function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "-";
  }
}

onMounted(async () => {
  await fetchMedicines();
  await fetchRecentMovements();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Top Bar -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4"
    >
      <div class="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          @click="router.push('/pharmacist/medicines')"
          title="Kembali ke Katalog Obat"
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
          Katalog Obat
        </Button>

        <div>
          <div class="flex items-center gap-2">
            <h1
              class="text-xl sm:text-2xl font-bold tracking-tight text-slate-100"
            >
              Pencatatan Obat Masuk (Stock In)
            </h1>
            <Badge variant="success">Inventaris Farmasi</Badge>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Pencatatan pengadaan supplier, pembelian rutin, atau penambahan stok
            fisik apotek.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          @click="router.push('/pharmacist')"
        >
          Daftar Resep
        </Button>
      </div>
    </div>

    <!-- Alert Sukses Setelah Simpan -->
    <Alert
      v-if="successMessage"
      variant="success"
      title="Pencatatan Berhasil Disimpan"
      dismissible
      @dismiss="successMessage = null"
    >
      {{ successMessage }}
    </Alert>

    <!-- Alert Gagal / Error -->
    <Alert
      v-if="errorMessage"
      variant="danger"
      title="Terjadi Kendala"
      dismissible
      @dismiss="errorMessage = null"
    >
      {{ errorMessage }}
    </Alert>

    <!-- Main Two-Column Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Kolom Kiri: Form Pencatatan Obat Masuk -->
      <div class="lg:col-span-7">
        <Card title="Formulir Penerimaan Obat" class="relative overflow-hidden bg-slate-900/70 border-slate-800 shadow-sm">
          <span class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
          <span class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
          <!-- Loading state obat -->
          <div v-if="isLoadingMedicines" class="space-y-4 py-3">
            <Skeleton class="h-10 w-full rounded-lg" />
            <Skeleton class="h-20 w-full rounded-lg" />
            <Skeleton class="h-10 w-full rounded-lg" />
            <Skeleton class="h-10 w-full rounded-lg" />
          </div>

          <!-- Empty state jika belum ada obat terdaftar -->
          <EmptyState
            v-else-if="medicines.length === 0"
            title="Tidak Ada Obat Aktif"
            description="Belum ada master data obat aktif yang dapat ditambahkan stoknya. Silakan tambahkan obat baru terlebih dahulu."
          >
            <template #action>
              <Button
                size="sm"
                variant="primary"
                @click="router.push('/pharmacist/medicines')"
              >
                Buka Katalog Obat
              </Button>
            </template>
          </EmptyState>

          <!-- Form Pencatatan -->
          <form v-else @submit.prevent="handleSubmitStockIn" class="space-y-5">
            <!-- 1. Pilih Obat -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Pilih Obat yang Masuk <span class="text-rose-400">*</span>
              </label>
              <select
                v-model="formData.medicineId"
                class="w-full h-10 rounded-lg bg-slate-950 border border-slate-700/80 px-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option v-for="med in medicines" :key="med.id" :value="med.id">
                  {{ med.name }} — [{{ med.category }}] (Sisa Stok:
                  {{ med.currentStock }} {{ med.unit }})
                </option>
              </select>
              <p
                v-if="fieldErrors.medicineId"
                class="text-[11px] text-rose-400 mt-1"
              >
                {{ fieldErrors.medicineId }}
              </p>
            </div>

            <!-- Preview Status Obat Terpilih -->
            <div
              v-if="selectedMedicine"
              class="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-3"
            >
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-bold text-slate-100">
                    {{ selectedMedicine.name }}
                  </div>
                  <div class="text-xs text-slate-400 mt-0.5">
                    Kategori: {{ selectedMedicine.category }} • Satuan:
                    {{ selectedMedicine.unit }}
                  </div>
                </div>

                <span
                  v-if="selectedMedicine.stockStatus === 'out'"
                  class="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/80"
                >
                  Stok Habis (0)
                </span>
                <span
                  v-else-if="selectedMedicine.stockStatus === 'low'"
                  class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/80"
                >
                  Stok Menipis
                </span>
                <span
                  v-else
                  class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                >
                  Stok Normal
                </span>
              </div>

              <!-- Kalkulasi Realtime Penambahan Stok -->
              <div
                class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center"
              >
                <div class="p-2 rounded bg-slate-900/60">
                  <span class="block text-[10px] text-slate-400"
                    >Stok Saat Ini</span
                  >
                  <span class="text-sm font-bold text-slate-200">
                    {{ selectedMedicine.currentStock }}
                    {{ selectedMedicine.unit }}
                  </span>
                </div>
                <div
                  class="p-2 rounded bg-blue-950/30 border border-blue-800/30"
                >
                  <span class="block text-[10px] text-blue-300"
                    >Jumlah Tambah</span
                  >
                  <span class="text-sm font-bold text-blue-400">
                    +{{ formData.quantity || 0 }} {{ selectedMedicine.unit }}
                  </span>
                </div>
                <div
                  class="p-2 rounded bg-emerald-950/30 border border-emerald-800/30"
                >
                  <span class="block text-[10px] text-emerald-300"
                    >Total Stok Baru</span
                  >
                  <span class="text-sm font-bold text-emerald-400">
                    {{ projectedStock }} {{ selectedMedicine.unit }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 2. Jumlah Obat Masuk -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Jumlah Obat Masuk (Quantity)
                <span class="text-rose-400">*</span>
              </label>
              <Input
                v-model.number="formData.quantity"
                type="number"
                min="1"
                placeholder="Contoh: 50, 100"
                size="md"
                :helperText="
                  selectedMedicine
                    ? `Satuan dalam: ${selectedMedicine.unit}`
                    : ''
                "
                :error="fieldErrors.quantity"
              />
            </div>

            <!-- 3. Alasan Penerimaan (Presets & Input) -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Alasan / Sumber Penerimaan <span class="text-rose-400">*</span>
              </label>

              <!-- Quick Presets -->
              <div class="flex flex-wrap gap-1.5 mb-2">
                <button
                  v-for="preset in reasonPresets"
                  :key="preset"
                  type="button"
                  class="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                  :class="[
                    formData.reason === preset
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700',
                  ]"
                  @click="formData.reason = preset"
                >
                  {{ preset }}
                </button>
              </div>

              <Input
                v-model="formData.reason"
                placeholder="Tulis alasan atau pilih preset di atas..."
                size="md"
                :error="fieldErrors.reason"
              />
            </div>

            <!-- 4. Nomor Referensi / Faktur (Opsional) -->
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1.5">
                Nomor Referensi / Faktur Supplier (Opsional)
              </label>
              <Input
                v-model="formData.reference"
                placeholder="Contoh: INV-2026-0901, PO-8821, Surat Jalan No. 12"
                size="md"
                helperText="Membantu rekonsiliasi faktur pembelian atau bukti serah terima"
              />
            </div>

            <!-- Tombol Submit -->
            <div
              class="pt-3 border-t border-slate-800 flex items-center justify-end gap-3"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                @click="router.push('/pharmacist/medicines')"
              >
                Batal
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                :loading="isSubmitting"
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
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </template>
                Simpan Obat Masuk
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <!-- Kolom Kanan: Riwayat Obat Masuk Terkini -->
      <div class="lg:col-span-5">
        <Card title="Riwayat Penerimaan Terkini" class="relative overflow-hidden bg-slate-900/70 border-slate-800 shadow-sm">
          <span class="absolute -top-1 -left-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
          <span class="absolute -top-1 -right-1 font-mono text-[9px] text-slate-700 select-none pointer-events-none">+</span>
          <template #action>
            <Button
              size="sm"
              variant="ghost"
              :loading="isLoadingMovements"
              @click="fetchRecentMovements"
            >
              Segarkan
            </Button>
          </template>

          <!-- Loading state -->
          <div v-if="isLoadingMovements" class="space-y-3 py-2">
            <div
              v-for="i in 4"
              :key="i"
              class="p-3 border-b border-slate-800/60 space-y-2"
            >
              <Skeleton class="h-4 w-36" />
              <Skeleton class="h-3 w-48" />
            </div>
          </div>

          <!-- Empty state -->
          <EmptyState
            v-else-if="recentMovements.length === 0"
            title="Belum Ada Riwayat"
            description="Belum ada transaksi obat masuk yang tercatat."
          />

          <!-- Riwayat List -->
          <div v-else class="divide-y divide-slate-800/80">
            <div
              v-for="item in recentMovements"
              :key="item.id"
              class="py-3 px-1 space-y-1 hover:bg-slate-900/40 rounded transition-colors"
            >
              <div class="flex items-center justify-between">
                <div
                  class="font-semibold text-slate-200 text-xs truncate max-w-[200px]"
                  :title="item.medicineName"
                >
                  {{ item.medicineName }}
                </div>
                <span
                  class="font-bold text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 whitespace-nowrap"
                >
                  +{{ item.quantity }} {{ item.unit }}
                </span>
              </div>

              <div
                class="flex items-center justify-between text-[11px] text-slate-400"
              >
                <span class="truncate max-w-[180px]" :title="item.reason">
                  {{ item.reason }}
                </span>
                <span>{{ formatDateTime(item.createdAt) }}</span>
              </div>

              <div
                v-if="item.referenceId"
                class="text-[10px] font-mono text-slate-500 pt-0.5"
              >
                Ref: {{ item.referenceId }}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
