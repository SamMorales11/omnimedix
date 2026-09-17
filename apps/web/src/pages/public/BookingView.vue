<script setup lang="ts">
import { ref } from "vue";
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import Alert from "../../components/ui/Alert.vue";
import Skeleton from "../../components/ui/Skeleton.vue";

// State UI form placeholder (tanpa business logic database)
const nik = ref("");
const fullName = ref("");
const phone = ref("");
const selectedPoli = ref("Poli Umum");
const visitDate = ref(new Date().toISOString().split("T")[0]);
const isSimulatingLoading = ref(false);

function triggerLoadingDemo() {
  isSimulatingLoading.value = true;
  setTimeout(() => {
    isSimulatingLoading.value = false;
  }, 1200);
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
    <!-- Header Section -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <router-link
          to="/"
          class="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
        >
          ← Kembali ke Beranda
        </router-link>
        <Badge variant="primary">Layanan Pasien</Badge>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
        Pendaftaran Antrean Poliklinik
      </h1>
      <p class="text-xs sm:text-sm text-slate-400 leading-relaxed">
        Lengkapi formulir pendaftaran di bawah ini untuk mendapatkan nomor
        antrean dan kode booking pelayanan medis rawat jalan.
      </p>
    </div>

    <!-- Alert Informasi Pendaftaran -->
    <Alert variant="info" title="Petunjuk Kunjungan">
      Pastikan nomor kontak WhatsApp aktif untuk menerima notifikasi pengingat
      dan pembaruan nomor antrean otomatis.
    </Alert>

    <!-- Skeleton Loading Placeholder View -->
    <div
      v-if="isSimulatingLoading"
      class="surface-card space-y-6 animate-pulse"
    >
      <div class="space-y-2">
        <Skeleton variant="text" width="40%" class="h-4" />
        <Skeleton variant="text" width="70%" class="h-3" />
      </div>

      <div class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <Skeleton variant="text" width="30%" class="h-3" />
          <Skeleton variant="rounded" class="h-10" />
        </div>
        <div class="space-y-1.5">
          <Skeleton variant="text" width="25%" class="h-3" />
          <Skeleton variant="rounded" class="h-10" />
        </div>
        <div class="space-y-1.5">
          <Skeleton variant="text" width="35%" class="h-3" />
          <Skeleton variant="rounded" class="h-10" />
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 flex justify-end">
        <Skeleton variant="rounded" width="160px" class="h-10" />
      </div>
    </div>

    <!-- Main Registration Form Card -->
    <Card
      v-else
      title="Formulir Reservasi Pasien"
      subtitle="Semua kolom dengan tanda bintang (*) wajib diisi"
    >
      <form @submit.prevent="triggerLoadingDemo" class="space-y-4" novalidate>
        <!-- NIK Pasien -->
        <Input
          id="nik"
          label="Nomor Induk Kependudukan (NIK)"
          placeholder="16 digit NIK sesuai KTP"
          v-model="nik"
          helper-text="Digunakan untuk sinkronisasi rekam medis elektronik"
          required
        />

        <!-- Nama Lengkap Pasien -->
        <Input
          id="fullName"
          label="Nama Lengkap Pasien"
          placeholder="Sesuai kartu identitas resmi"
          v-model="fullName"
          required
        />

        <!-- Nomor Telepon / WA -->
        <Input
          id="phone"
          label="Nomor WhatsApp / Kontak"
          placeholder="08xxxxxxxxxx"
          type="tel"
          v-model="phone"
          required
        />

        <!-- Pilihan Poliklinik -->
        <div class="space-y-1.5 text-left">
          <label
            for="poliSelect"
            class="block text-xs font-medium text-slate-300"
          >
            Pilih Poliklinik Spesialis <span class="text-rose-400">*</span>
          </label>
          <select
            id="poliSelect"
            v-model="selectedPoli"
            class="surface-input"
            required
          >
            <option value="Poli Umum">
              Poli Umum (dr. Hendra Setiawan, Sp.PD)
            </option>
            <option value="Poli Gigi & Mulut">
              Poli Gigi & Mulut (drg. Anita Wijaya)
            </option>
            <option value="Poli Pediatri (Anak)">
              Poli Pediatri / Anak (dr. Rian Pratama, Sp.A)
            </option>
            <option value="Poli Penyakit Dalam">Poli Penyakit Dalam</option>
          </select>
        </div>

        <!-- Tanggal Kunjungan -->
        <Input
          id="visitDate"
          label="Tanggal Rencana Kunjungan"
          type="date"
          v-model="visitDate"
          required
        />

        <!-- Tombol Aksi -->
        <div
          class="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <button
            type="button"
            @click="triggerLoadingDemo"
            class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Simulasi Loading Skeleton
          </button>

          <Button type="submit" variant="primary" size="md">
            Ambil Nomor Antrean →
          </Button>
        </div>
      </form>
    </Card>

    <!-- Footer Quick Navigation -->
    <div class="text-center text-xs text-slate-400 pt-2">
      Sudah memiliki kode booking?
      <router-link
        to="/track-queue"
        class="text-blue-500 hover:text-blue-400 font-medium ml-1"
      >
        Lacak status antrean di sini →
      </router-link>
    </div>
  </div>
</template>
