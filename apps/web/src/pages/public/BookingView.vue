<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Badge from "../../components/ui/Badge.vue";
import { ref } from "vue";

const nik = ref("");
const fullName = ref("");
const phone = ref("");
const selectedPoli = ref("Poli Umum");
const isSubmitted = ref(false);
const generatedCode = ref("");

function handleSubmit() {
  if (!fullName.value || !phone.value) return;
  generatedCode.value = `BK-${Math.floor(100000 + Math.random() * 900000)}`;
  isSubmitted.value = true;
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 space-y-6">
    <div class="space-y-2 text-center">
      <Badge variant="info">Layanan Publik</Badge>
      <h1 class="text-3xl font-extrabold text-slate-100 tracking-tight">
        Pendaftaran Antrean Online
      </h1>
      <p class="text-xs text-slate-400">
        Daftar kunjungan ke poliklinik secara mandiri tanpa perlu antre di loket
        pendaftaran fisik
      </p>
    </div>

    <Card v-if="!isSubmitted">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <Input
          id="fullName"
          label="Nama Lengkap Pasien"
          placeholder="Sesuai KTP / Identitas"
          v-model="fullName"
          required
        />

        <Input
          id="nik"
          label="NIK (Nomor Induk Kependudukan - Opsional)"
          placeholder="16 digit NIK"
          v-model="nik"
        />

        <Input
          id="phone"
          label="Nomor WhatsApp / Telepon"
          placeholder="08xxxxxxxxxx"
          type="tel"
          v-model="phone"
          required
        />

        <div class="space-y-1.5">
          <label class="block text-xs font-medium text-slate-300"
            >Pilih Poliklinik Tujuan</label
          >
          <select
            v-model="selectedPoli"
            class="w-full px-3.5 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          >
            <option value="Poli Umum">Poli Umum</option>
            <option value="Poli Gigi & Mulut">Poli Gigi & Mulut</option>
            <option value="Poli Anak (Pediatri)">Poli Anak (Pediatri)</option>
            <option value="Poli Penyakit Dalam">Poli Penyakit Dalam</option>
          </select>
        </div>

        <div class="pt-2">
          <Button type="submit" variant="primary" block>
            Ambil Nomor Antrean
          </Button>
        </div>
      </form>
    </Card>

    <!-- Success Ticket Result -->
    <Card
      v-else
      class="text-center space-y-4 border-teal-500/40 bg-teal-950/20"
    >
      <div
        class="inline-flex h-12 w-12 rounded-full bg-teal-500/20 text-teal-300 items-center justify-center text-2xl"
      >
        ✓
      </div>
      <div>
        <h3 class="text-lg font-bold text-slate-100">
          Pendaftaran Antrean Berhasil!
        </h3>
        <p class="text-xs text-slate-400 mt-1">
          Simpan kode booking berikut untuk pengecekan status kunjungan:
        </p>
      </div>
      <div
        class="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-2xl font-bold text-teal-400"
      >
        {{ generatedCode }}
      </div>
      <div class="text-xs text-slate-300 space-y-1">
        <div><strong>Pasien:</strong> {{ fullName }}</div>
        <div><strong>Poli Tujuan:</strong> {{ selectedPoli }}</div>
      </div>
      <div class="flex justify-center gap-3 pt-2">
        <router-link :to="`/track?code=${generatedCode}`">
          <Button variant="primary" size="sm">Pantau Antrean Live →</Button>
        </router-link>
        <Button
          variant="outline"
          size="sm"
          @click="
            isSubmitted = false;
            fullName = '';
            phone = '';
          "
        >
          Daftar Pasien Baru
        </Button>
      </div>
    </Card>
  </div>
</template>
