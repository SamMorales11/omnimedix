<script setup lang="ts">
import Button from "../../components/ui/Button.vue";
</script>

<template>
  <div
    class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4"
  >
    <div class="text-6xl font-black text-blue-500">404</div>
    <h2 class="text-xl font-bold text-slate-100">Halaman Tidak Ditemukan</h2>
    <p class="text-xs text-slate-400 max-w-sm">
      Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
    </p>
    <router-link to="/">
      <Button variant="secondary" size="sm">Kembali ke Beranda</Button>
    </router-link>
  </div>
</template>
