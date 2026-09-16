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
        <h1 class="text-2xl font-bold text-slate-100">
          Konsol Poliklinik Dokter
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Pemeriksaan pasien, diagnosa, dan pembuatan e-resep farmasi
        </p>
      </div>
      <Badge variant="success">Poli Umum • Aktif</Badge>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <div class="text-xs text-slate-400 font-medium">Antrean Menunggu</div>
        <div class="text-2xl font-extrabold text-teal-400 mt-1">4</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Pasien sedang mengantre di poli
        </div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">
          Pasien Selesai Hari Ini
        </div>
        <div class="text-2xl font-extrabold text-slate-100 mt-1">12</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Pemeriksaan telah diselesaikan
        </div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">Resep Diterbitkan</div>
        <div class="text-2xl font-extrabold text-sky-400 mt-1">10</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Terkirim ke unit farmasi
        </div>
      </Card>
    </div>

    <!-- Queue Table -->
    <Card title="Daftar Antrean Pasien">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead
            class="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px]"
          >
            <tr>
              <th class="p-3">No. Antrean</th>
              <th class="p-3">Nama Pasien</th>
              <th class="p-3">NIK</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80">
            <tr>
              <td class="p-3 font-bold text-teal-400">A-001</td>
              <td class="p-3 font-medium text-slate-200">Ahmad Fauzi</td>
              <td class="p-3 text-slate-400">3271048892000001</td>
              <td class="p-3">
                <Badge variant="warning">Sedang Diperiksa</Badge>
              </td>
              <td class="p-3 text-right">
                <Button size="sm" variant="primary">Lanjutkan Periksa</Button>
              </td>
            </tr>
            <tr>
              <td class="p-3 font-bold text-teal-400">A-002</td>
              <td class="p-3 font-medium text-slate-200">Siti Rahmawati</td>
              <td class="p-3 text-slate-400">3271048892000002</td>
              <td class="p-3"><Badge variant="default">Menunggu</Badge></td>
              <td class="p-3 text-right">
                <Button size="sm" variant="outline">Panggil Pasien</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
