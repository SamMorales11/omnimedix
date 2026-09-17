<script setup lang="ts">
import { ref } from "vue";
import Button from "../../components/ui/Button.vue";
import Card from "../../components/ui/Card.vue";
import Badge from "../../components/ui/Badge.vue";
import StatusBadge from "../../components/ui/StatusBadge.vue";
import Skeleton from "../../components/ui/Skeleton.vue";

const showSkeletonDemo = ref(false);

const liveQueues = [
  {
    poli: "Poli Umum",
    doctor: "dr. Hendra Setiawan, Sp.PD",
    current: "A-012",
    waiting: 4,
    status: "in_progress" as const,
  },
  {
    poli: "Poli Gigi & Mulut",
    doctor: "drg. Anita Wijaya",
    current: "B-006",
    waiting: 2,
    status: "in_progress" as const,
  },
  {
    poli: "Poli Pediatri (Anak)",
    doctor: "dr. Rian Pratama, Sp.A",
    current: "C-003",
    waiting: 1,
    status: "in_progress" as const,
  },
];
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
    <!-- Hero Section -->
    <section class="text-center space-y-6 max-w-3xl mx-auto">
      <div class="inline-flex items-center gap-2">
        <Badge variant="primary" dot>
          Modul Pasien • Layanan Publik Terpadu
        </Badge>
      </div>

      <h1
        class="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight"
      >
        Akses Layanan Medis &
        <span class="text-blue-500">Pendaftaran Antrean</span> Mandiri
      </h1>

      <p
        class="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto"
      >
        Platform registrasi poliklinik dan pelacakan antrean pemeriksaan dokter
        serta peresepan farmasi secara real-time tanpa antrean fisik yang
        panjang di loket klinik.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <router-link to="/booking">
          <Button size="lg" variant="primary"> Daftar Antrean Pasien → </Button>
        </router-link>
        <router-link to="/track-queue">
          <Button size="lg" variant="secondary"> Lacak Antrean & Resep </Button>
        </router-link>
      </div>
    </section>

    <!-- Fitur Layanan Pasien -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card
        hoverable
        title="1. Reservasi Poliklinik"
        subtitle="Pendaftaran Mandiri Cepat"
      >
        <p class="text-xs text-slate-400 leading-relaxed mb-4">
          Pilih poliklinik tujuan dan jadwal dokter spesialis. Dapatkan nomor
          antrean serta kode booking otomatis langsung dari ponsel Anda.
        </p>
        <router-link
          to="/booking"
          class="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
        >
          Ambil Nomor Antrean →
        </router-link>
      </Card>

      <Card
        hoverable
        title="2. Pantau Antrean Live"
        subtitle="Pelacakan Status Real-time"
      >
        <p class="text-xs text-slate-400 leading-relaxed mb-4">
          Cek nomor yang sedang diperiksa di ruang konsultasi. Hadir tepat waktu
          tanpa perlu menunggu lama di ruang tunggu rumah sakit.
        </p>
        <router-link
          to="/track-queue"
          class="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
        >
          Pantau Antrean Live →
        </router-link>
      </Card>

      <Card
        hoverable
        title="3. Status Dispensing Obat"
        subtitle="Integrasi Unit Farmasi"
      >
        <p class="text-xs text-slate-400 leading-relaxed mb-4">
          Setelah pemeriksaan selesai, e-resep otomatis terkirim ke unit
          farmasi. Pasien dapat memantau status penyiapan obat hingga siap
          diambil.
        </p>
        <router-link
          to="/track-queue"
          class="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
        >
          Cek Status Obat →
        </router-link>
      </Card>
    </section>

    <!-- Live Poliklinik Queue Overview (with Skeleton Loading Toggle) -->
    <section class="space-y-4">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3"
      >
        <div>
          <h2 class="text-base font-bold text-slate-100 m-0">
            Monitoring Antrean Poliklinik Hari Ini
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Pembaruan berkala antrean aktif di poliklinik rawat jalan
          </p>
        </div>

        <button
          type="button"
          @click="showSkeletonDemo = !showSkeletonDemo"
          class="text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-900 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
        >
          {{
            showSkeletonDemo
              ? "Tampilkan Data Aktif"
              : "Simulasi Loading Skeleton"
          }}
        </button>
      </div>

      <!-- Skeleton State Preview -->
      <div
        v-if="showSkeletonDemo"
        class="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div v-for="i in 3" :key="i" class="surface-card space-y-3">
          <div class="flex justify-between items-center">
            <Skeleton variant="text" width="50%" />
            <Skeleton variant="circular" width="16px" height="16px" />
          </div>
          <Skeleton variant="text" width="75%" class="h-3" />
          <div
            class="pt-2 border-t border-slate-800/60 flex justify-between items-baseline"
          >
            <Skeleton variant="rounded" width="40%" class="h-8" />
            <Skeleton variant="text" width="30%" class="h-3" />
          </div>
        </div>
      </div>

      <!-- Live Queue Card Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card v-for="item in liveQueues" :key="item.poli">
          <div class="flex items-start justify-between gap-2 mb-1">
            <h3 class="text-sm font-semibold text-slate-100 m-0">
              {{ item.poli }}
            </h3>
            <StatusBadge :status="item.status" label="Aktif" size="sm" />
          </div>
          <p class="text-xs text-slate-400 mb-3">
            {{ item.doctor }}
          </p>
          <div
            class="pt-2 border-t border-slate-800/80 flex items-baseline justify-between"
          >
            <div>
              <span
                class="text-[10px] text-slate-500 uppercase tracking-wider block"
                >Sedang Dilayani</span
              >
              <span class="font-mono text-xl font-bold text-blue-400">{{
                item.current
              }}</span>
            </div>
            <div class="text-right">
              <span
                class="text-[10px] text-slate-500 uppercase tracking-wider block"
                >Sisa Antrean</span
              >
              <span class="text-xs font-semibold text-slate-300"
                >{{ item.waiting }} Pasien</span
              >
            </div>
          </div>
        </Card>
      </div>
    </section>
  </div>
</template>
