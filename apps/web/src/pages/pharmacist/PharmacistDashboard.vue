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
          Konsol Farmasi & Apotek
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Dispensing obat, peracikan resep, dan manajemen stok inventaris
        </p>
      </div>
      <Badge variant="info">Unit Farmasi Pusat</Badge>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <div class="text-xs text-slate-400 font-medium">
          Resep Masuk (Pending)
        </div>
        <div class="text-2xl font-extrabold text-amber-400 mt-1">3</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Perlu diverifikasi dan disiapkan
        </div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">
          Resep Diserahkan Hari Ini
        </div>
        <div class="text-2xl font-extrabold text-teal-400 mt-1">18</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Obat telah diserahkan ke pasien
        </div>
      </Card>

      <Card>
        <div class="text-xs text-slate-400 font-medium">
          Obat Menipis (Low Stock)
        </div>
        <div class="text-2xl font-extrabold text-rose-400 mt-1">2</div>
        <div class="text-[11px] text-slate-500 mt-1">
          Stok di bawah batas minimum
        </div>
      </Card>
    </div>

    <!-- Prescription Queue -->
    <Card title="Antrean Resep Masuk">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300">
          <thead
            class="bg-slate-800/60 text-slate-400 uppercase font-semibold text-[10px]"
          >
            <tr>
              <th class="p-3">ID Resep</th>
              <th class="p-3">Nama Pasien</th>
              <th class="p-3">Dokter Peresep</th>
              <th class="p-3">Status</th>
              <th class="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80">
            <tr>
              <td class="p-3 font-mono font-bold text-teal-400">
                RX-2026-0041
              </td>
              <td class="p-3 font-medium text-slate-200">Ahmad Fauzi</td>
              <td class="p-3 text-slate-300">dr. Hendra Setiawan, Sp.PD</td>
              <td class="p-3">
                <Badge variant="warning">Sedang Disiapkan</Badge>
              </td>
              <td class="p-3 text-right">
                <Button size="sm" variant="primary">Dispense & Serahkan</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
