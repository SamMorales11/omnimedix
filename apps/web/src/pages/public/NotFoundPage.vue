<script setup lang="ts">
import Button from "../../components/ui/Button.vue";
</script>

<template>
  <div class="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center px-4 py-16 overflow-hidden">
    <!-- Subtle Background Dot Pattern -->
    <div
      class="absolute inset-0 pointer-events-none opacity-30 [background-image:radial-gradient(rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black_30%,transparent_90%)]"
      aria-hidden="true"
    />

    <!-- Ambient Subtle Glow -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none rounded-full"
      aria-hidden="true"
    />

    <div class="relative z-10 max-w-md mx-auto space-y-6">
      <!-- Monospace Error Tag with Pixel Markers -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono select-none">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        <span>ERROR 404 // NOT FOUND</span>
      </div>

      <div class="space-y-3">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
          Halaman Tidak Ditemukan
        </h1>
        <p class="text-sm text-slate-400 leading-relaxed">
          Tautan yang Anda tuju tidak tersedia, telah dipindahkan, atau alamat URL yang Anda masukkan salah.
        </p>
      </div>

      <!-- Action Button -->
      <div class="pt-2 flex justify-center">
        <router-link to="/">
          <Button variant="primary" size="md" class="gap-2 group">
            <span class="font-mono text-xs transition-transform group-hover:-translate-x-1">←</span>
            <span>Kembali ke Beranda</span>
          </Button>
        </router-link>
      </div>
    </div>
  </div>
</template>
