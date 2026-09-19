<script setup lang="ts">
// AuthLayout: Bersih, centered, bebas distraksi untuk alur otentikasi portal medis
import AppLogo from "../components/ui/AppLogo.vue";
</script>

<template>
  <div
    class="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 selection:bg-blue-600/30 selection:text-blue-200 overflow-hidden"
  >
    <!-- Subtle Background Dot Pattern -->
    <div
      class="absolute inset-0 pointer-events-none opacity-30 [background-image:radial-gradient(rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black_30%,transparent_90%)]"
      aria-hidden="true"
    />

    <!-- Ambient Subtle Glow -->
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full"
      aria-hidden="true"
    />

    <div class="relative z-10 w-full max-w-md space-y-6">
      <!-- Logo Omnimedix & Judul Singkat -->
      <div class="flex flex-col items-center text-center">
        <AppLogo
          size="lg"
          show-subtitle
          subtitle="Sistem Informasi & Manajemen Pelayanan Medis Terpadu"
        />
      </div>

      <!-- Wadah Konten Utama (Form Login / Auth) with Pixel Corner Markers -->
      <div
        class="relative bg-slate-900/90 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur-sm"
      >
        <span class="absolute -top-1.5 -left-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -top-1.5 -right-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -bottom-1.5 -left-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>
        <span class="absolute -bottom-1.5 -right-1.5 font-mono text-[10px] text-slate-700 select-none pointer-events-none">+</span>

        <slot>
          <router-view />
        </slot>
      </div>

      <!-- Navigasi Kembali Ringan -->
      <div class="text-center text-xs text-slate-500">
        <router-link
          to="/"
          class="hover:text-slate-300 transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1 group"
        >
          <span class="font-mono text-xs transition-transform group-hover:-translate-x-0.5">←</span>
          <span>Kembali ke Beranda</span>
        </router-link>
      </div>
    </div>
  </div>
</template>
