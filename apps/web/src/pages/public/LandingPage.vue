<script setup lang="ts">
import Button from "../../components/ui/Button.vue";
import Card from "../../components/ui/Card.vue";
import Badge from "../../components/ui/Badge.vue";
import AppLogo from "../../components/ui/AppLogo.vue";
</script>

<template>
  <div class="space-y-24 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    <!-- Hero Section -->
    <section class="text-center space-y-6 pt-10 max-w-3xl mx-auto flex flex-col items-center">
      <AppLogo size="lg" show-subtitle subtitle="Platform Rekam Medis & Antrean Klinik" class="mb-2" />
      <Badge variant="info" size="md">
        Omnimedix Monorepo • Vue 3 + Hono + Neon
      </Badge>
      <h1
        class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100"
      >
        Platform Rekam Medis & Antrean Klinik
        <span class="text-blue-500"> Cerdas & Real-time </span>
      </h1>
      <p class="text-base sm:text-lg text-slate-400 leading-relaxed">
        Solusi klinis terintegrasi untuk pendaftaran pasien, dokter poliklinik,
        rekam medis elektronik, serta peresepan obat dan manajemen inventaris
        farmasi.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-4 pt-4">
        <router-link to="/auth/login">
          <Button size="lg" variant="primary">Masuk ke Portal</Button>
        </router-link>
        <router-link to="/doctor">
          <Button size="lg" variant="outline">Preview Konsol Dokter</Button>
        </router-link>
      </div>
    </section>

    <!-- Role Modules Overview -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card
        hoverable
        title="Dokter & Poliklinik"
        subtitle="Pemeriksaan & Resep Elektronik"
      >
        <p class="text-xs text-slate-400 leading-relaxed mb-4">
          Kelola antrean pasien per poli, input diagnosa ICD-10, riwayat medis
          pasien, dan buat resep langsung ke unit farmasi.
        </p>
        <router-link
          to="/doctor"
          class="text-xs font-semibold text-blue-500 hover:text-blue-400"
        >
          Akses Modul Dokter →
        </router-link>
      </Card>

      <Card hoverable title="Unit Farmasi" subtitle="Dispensing & Stok Obat">
        <p class="text-xs text-slate-400 leading-relaxed mb-4">
          Pemrosesan resep masuk real-time, racikan obat, penyiapan etiket, dan
          pencatatan riwayat mutasi stok obat otomatis.
        </p>
        <router-link
          to="/pharmacist"
          class="text-xs font-semibold text-blue-500 hover:text-blue-400"
        >
          Akses Modul Farmasi →
        </router-link>
      </Card>

      <Card
        hoverable
        title="Administrator"
        subtitle="Manajemen User & Master Data"
      >
        <p class="text-xs text-slate-400 leading-relaxed mb-4">
          Konfigurasi poliklinik, data dokter, akun staf medis, manajemen obat
          dan audit log aktivitas sistem.
        </p>
        <router-link
          to="/admin"
          class="text-xs font-semibold text-blue-500 hover:text-blue-400"
        >
          Akses Modul Admin →
        </router-link>
      </Card>
    </section>
  </div>
</template>
