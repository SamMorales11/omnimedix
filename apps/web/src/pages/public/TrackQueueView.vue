<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import StatusBadge from "../../components/ui/StatusBadge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";
import EmptyState from "../../components/ui/EmptyState.vue";

const route = useRoute();
const searchCode = ref("");
const isLoading = ref(false);
const hasSearched = ref(true); // Default tampilkan placeholder hasil

function simulateSearch() {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
    hasSearched.value = true;
  }, 900);
}

onMounted(() => {
  const codeParam = route.query["code"] as string;
  if (codeParam) {
    searchCode.value = codeParam;
  } else {
    searchCode.value = "BK-2026-0041";
  }
});
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
    <!-- Header Section -->
    <div class="space-y-2 text-center max-w-xl mx-auto">
      <Badge variant="primary" dot>Monitoring Real-time</Badge>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
        Pelacakan Antrean & Status Resep
      </h1>
      <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
        Pantau giliran pemeriksaan dokter dan kesiapan resep obat farmasi
        langsung dari perangkat Anda.
      </p>
    </div>

    <!-- Search Input Card -->
    <Card>
      <form
        @submit.prevent="simulateSearch"
        class="flex flex-col sm:flex-row gap-2.5"
      >
        <Input
          id="searchCode"
          placeholder="Masukkan Kode Booking (Contoh: BK-2026-0041)"
          v-model="searchCode"
          class="flex-1"
          required
        />
        <Button
          type="submit"
          variant="primary"
          :loading="isLoading"
          class="shrink-0"
        >
          Lacak Status Antrean
        </Button>
      </form>
    </Card>

    <!-- Skeleton Loading State -->
    <div v-if="isLoading" class="surface-card space-y-6 animate-pulse">
      <div
        class="flex justify-between items-center pb-4 border-b border-slate-800/80"
      >
        <Skeleton variant="text" width="35%" class="h-4" />
        <Skeleton variant="rounded" width="80px" class="h-6" />
      </div>

      <!-- 4 Status Blocks Skeleton -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 text-center"
        >
          <Skeleton variant="text" width="60%" class="mx-auto h-2.5" />
          <Skeleton variant="rounded" width="50%" class="mx-auto h-7" />
        </div>
      </div>

      <div class="space-y-2 pt-2">
        <Skeleton variant="text" width="100%" class="h-3" />
        <Skeleton variant="text" width="85%" class="h-3" />
      </div>
    </div>

    <!-- Placeholder Result Ticket Card -->
    <div v-else-if="hasSearched" class="space-y-4">
      <Card title="Status Kunjungan Pasien">
        <template #header>
          <div
            class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4"
          >
            <div>
              <h2 class="text-base font-bold text-slate-100 m-0">
                Informasi Antrean Pasien
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">
                Kode Booking:
                <strong class="text-slate-200 font-mono">{{
                  searchCode || "BK-2026-0041"
                }}</strong>
              </p>
            </div>
            <StatusBadge status="in_progress" label="Sedang Berlangsung" />
          </div>
        </template>

        <!-- 4 Key Metric Tiles -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-center">
          <!-- Nomor Anda -->
          <div
            class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80"
          >
            <div
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Nomor Anda
            </div>
            <div class="text-2xl font-mono font-bold text-blue-400 mt-1">
              A-007
            </div>
          </div>

          <!-- Sedang Dipanggil -->
          <div
            class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80"
          >
            <div
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Sedang Dilayani
            </div>
            <div class="text-2xl font-mono font-bold text-amber-400 mt-1">
              A-005
            </div>
          </div>

          <!-- Poliklinik -->
          <div
            class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80"
          >
            <div
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Poliklinik
            </div>
            <div class="text-xs font-bold text-slate-200 mt-2 truncate">
              Poli Umum
            </div>
          </div>

          <!-- Status Resep -->
          <div
            class="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80"
          >
            <div
              class="text-[10px] text-slate-400 uppercase font-semibold tracking-wider"
            >
              Farmasi / Obat
            </div>
            <div class="mt-2">
              <StatusBadge
                status="preparing"
                label="Sedang Diracing"
                size="sm"
              />
            </div>
          </div>
        </div>

        <!-- Detail Information Row -->
        <div
          class="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
        >
          <div class="space-y-1 text-slate-300">
            <div>
              <span class="text-slate-500">Nama Pasien:</span> Ahmad Fauzi
            </div>
            <div>
              <span class="text-slate-500">Dokter:</span> dr. Hendra Setiawan,
              Sp.PD
            </div>
          </div>
          <div class="space-y-1 text-slate-300 sm:text-right">
            <div>
              <span class="text-slate-500">Estimasi Giliran:</span> ± 10 - 15
              Menit
            </div>
            <div>
              <span class="text-slate-500">Lokasi:</span> Gedung Rawat Jalan,
              Lantai 1
            </div>
          </div>
        </div>

        <template #footer>
          <div
            class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <span class="text-slate-400">
              Perbarui secara berkala jika Anda berada di ruang tunggu.
            </span>
            <Button size="sm" variant="secondary" @click="simulateSearch">
              Muat Ulang Status ⟳
            </Button>
          </div>
        </template>
      </Card>
    </div>

    <!-- Empty State Fallback -->
    <EmptyState
      v-else
      title="Belum ada antrean yang dilacak"
      description="Masukkan kode booking tiket Anda pada kolom pencarian di atas untuk memeriksa status antrean dokter dan resep obat."
    />
  </div>
</template>
