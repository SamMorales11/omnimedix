<script setup lang="ts">
import { computed } from "vue";
import AppLogo from "../ui/AppLogo.vue";

const currentYear = computed(() => new Date().getFullYear());
</script>

<template>
  <footer class="relative mt-auto border-t border-slate-900/90 bg-slate-950/90 backdrop-blur-sm select-none">
    <!-- Subtle pixel corner markers at border boundary -->
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <span class="absolute -top-[5px] left-4 sm:left-6 lg:left-8 font-mono text-[9px] text-slate-800 select-none pointer-events-none">+</span>
      <span class="absolute -top-[5px] right-4 sm:right-6 lg:right-8 font-mono text-[9px] text-slate-800 select-none pointer-events-none">+</span>

      <div class="py-7 flex flex-col md:flex-row items-center justify-between gap-5">
        <!-- Logo & Nama & Keterangan Singkat -->
        <div class="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 text-center sm:text-left">
          <AppLogo size="xs" />

          <span class="hidden sm:inline text-slate-700 font-mono text-xs">/</span>

          <p class="text-xs text-slate-400 font-normal">
            Sistem Manajemen Rumah Sakit
          </p>
        </div>

        <!-- 2-3 Link Penting & Copyright -->
        <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs">
          <nav class="flex items-center gap-4 sm:gap-5 text-slate-400">
            <router-link
              to="/booking"
              class="hover:text-slate-200 transition-colors"
            >
              Pendaftaran Antrean
            </router-link>
            <router-link
              to="/track-queue"
              class="hover:text-slate-200 transition-colors"
            >
              Lacak Status
            </router-link>
            <router-link
              to="/auth/login"
              class="hover:text-slate-200 transition-colors inline-flex items-center gap-1 text-slate-400 hover:text-blue-400"
            >
              <span>Portal Staf</span>
              <span class="font-mono text-[10px] text-slate-500">→</span>
            </router-link>
          </nav>

          <span class="hidden sm:inline text-slate-800">|</span>

          <p class="text-slate-500 font-mono text-[11px]">
            &copy; {{ currentYear }} Omnimedix. Hak Cipta Dilindungi.
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>
