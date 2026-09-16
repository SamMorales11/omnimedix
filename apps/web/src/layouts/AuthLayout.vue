<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12"
  >
    <div class="w-full max-w-md space-y-8">
      <div class="text-center space-y-2">
        <router-link to="/" class="inline-flex items-center gap-2">
          <div
            class="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center font-bold text-slate-950 text-lg shadow-md shadow-teal-500/20"
          >
            +
          </div>
          <span class="font-bold text-2xl tracking-tight text-slate-100">
            Omni<span class="text-teal-400">medix</span>
          </span>
        </router-link>
        <p class="text-xs text-slate-400">
          Sistem Informasi & Manajemen Pelayanan Medis Terpadu
        </p>
      </div>

      <div
        class="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-md shadow-xl"
      >
        <router-view />
      </div>

      <div class="text-center text-xs text-slate-500">
        <router-link to="/" class="hover:text-teal-400 transition-colors">
          ← Kembali ke Beranda
        </router-link>
      </div>
    </div>
  </div>
</template>
