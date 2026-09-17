<script setup lang="ts">
// AuthLayout: Bersih, centered, bebas distraksi untuk alur otentikasi portal medis
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 selection:bg-blue-600/30 selection:text-blue-200"
  >
    <div class="w-full max-w-md space-y-6">
      <!-- Logo Omnimedix & Judul Singkat -->
      <div class="text-center space-y-2">
        <router-link
          to="/"
          class="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
        >
          <div
            class="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-sm group-hover:bg-blue-500 transition-colors"
          >
            +
          </div>
          <span class="font-bold text-2xl tracking-tight text-slate-100">
            Omni<span class="text-blue-500">medix</span>
          </span>
        </router-link>
        <p class="text-xs text-slate-400">
          Sistem Informasi & Manajemen Pelayanan Medis Terpadu
        </p>
      </div>

      <!-- Wadah Konten Utama (Form Login / Auth) -->
      <div
        class="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm"
      >
        <slot>
          <router-view />
        </slot>
      </div>

      <!-- Navigasi Kembali Ringan -->
      <div class="text-center text-xs text-slate-500">
        <router-link
          to="/"
          class="hover:text-slate-300 transition-colors inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
        >
          ← Kembali ke Beranda
        </router-link>
      </div>
    </div>
  </div>
</template>
