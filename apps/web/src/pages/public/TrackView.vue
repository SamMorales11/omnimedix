<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const searchCode = ref("");
const isSearching = ref(false);
const queueResult = ref<{
  code: string;
  patientName: string;
  poliName: string;
  queueNumber: string;
  currentCalling: string;
  status: "waiting" | "in_progress" | "completed";
} | null>(null);

function handleSearch() {
  if (!searchCode.value.trim()) return;
  isSearching.value = true;

  setTimeout(() => {
    queueResult.value = {
      code: searchCode.value.trim().toUpperCase(),
      patientName: "Ahmad Fauzi",
      poliName: "Poli Umum",
      queueNumber: "A-007",
      currentCalling: "A-005",
      status: "waiting",
    };
    isSearching.value = false;
  }, 400);
}

onMounted(() => {
  const codeParam = route.query["code"] as string;
  if (codeParam) {
    searchCode.value = codeParam;
    handleSearch();
  }
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 space-y-6">
    <div class="space-y-2 text-center">
      <Badge variant="info">Pelacakan Real-time</Badge>
      <h1 class="text-3xl font-extrabold text-slate-100 tracking-tight">
        Lacak Status Antrean & Resep
      </h1>
      <p class="text-xs text-slate-400">
        Masukkan kode booking kunjungan Anda untuk memantau panggilan antrean
        dan penyiapan obat
      </p>
    </div>

    <!-- Search Card -->
    <Card>
      <form @submit.prevent="handleSearch" class="flex gap-2">
        <Input
          id="searchCode"
          placeholder="Masukkan Kode Booking (Contoh: BK-123456)"
          v-model="searchCode"
          class="flex-1"
          required
        />
        <Button type="submit" variant="primary" :loading="isSearching">
          Lacak
        </Button>
      </form>
    </Card>

    <!-- Tracking Result Card -->
    <div v-if="queueResult" class="space-y-4 animate-fadeIn">
      <Card title="Status Kunjungan Pasien">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center py-2">
          <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 uppercase font-semibold">
              Nomor Anda
            </div>
            <div class="text-2xl font-bold text-teal-400 mt-1">
              {{ queueResult.queueNumber }}
            </div>
          </div>
          <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 uppercase font-semibold">
              Sedang Dipanggil
            </div>
            <div class="text-2xl font-bold text-amber-400 mt-1">
              {{ queueResult.currentCalling }}
            </div>
          </div>
          <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 uppercase font-semibold">
              Poliklinik
            </div>
            <div class="text-xs font-bold text-slate-200 mt-2">
              {{ queueResult.poliName }}
            </div>
          </div>
          <div class="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div class="text-[10px] text-slate-400 uppercase font-semibold">
              Status
            </div>
            <div class="mt-2">
              <Badge variant="warning">{{ queueResult.status }}</Badge>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span
              >Kode:
              <strong class="text-slate-200">{{
                queueResult.code
              }}</strong></span
            >
            <span
              >Pasien:
              <strong class="text-slate-200">{{
                queueResult.patientName
              }}</strong></span
            >
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
