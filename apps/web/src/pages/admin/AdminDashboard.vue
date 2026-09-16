<script setup lang="ts">
import Card from "../../components/ui/Card.vue";
import Badge from "../../components/ui/Badge.vue";
import Button from "../../components/ui/Button.vue";
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-100">Panel Administrator</h1>
        <p class="text-xs text-slate-400 mt-1">
          Pengaturan sistem, master data poliklinik, tenaga medis, dan audit
          aktivitas
        </p>
      </div>
      <Badge variant="info">Super Administrator</Badge>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <Card>
        <div class="text-xs text-slate-400 font-medium">Total Pengguna</div>
        <div class="text-2xl font-extrabold text-slate-100 mt-1">24</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Dokter, Farmasi & Admin
        </div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">Poliklinik Aktif</div>
        <div class="text-2xl font-extrabold text-teal-400 mt-1">6</div>
        <div class="text-[11px] text-slate-500 mt-1">Umum, Gigi, Anak, dll</div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">Katalog Obat</div>
        <div class="text-2xl font-extrabold text-sky-400 mt-1">142</div>
        <div class="text-[11px] text-slate-500 mt-1">Item aktif terdaftar</div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">
          Audit Aktivitas (24 Jam)
        </div>
        <div class="text-2xl font-extrabold text-slate-300 mt-1">189</div>
        <div class="text-[11px] text-slate-500 mt-1">Event log tercatat</div>
      </Card>
    </div>

    <!-- Actions -->
    <div class="flex gap-3">
      <Button variant="primary" size="sm">+ Tambah Staf Medis</Button>
      <Button variant="secondary" size="sm">+ Tambah Poliklinik</Button>
      <Button variant="outline" size="sm">Export Laporan Audit</Button>
    </div>
  </div>
</template>
