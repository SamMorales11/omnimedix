<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import Button from "../ui/Button.vue";
import { Role } from "@omnimedix/shared";
import AppLogo from "../ui/AppLogo.vue";

const route = useRoute();
const { user, userRole, isAuthenticated, handleLogout } = useAuth();
const isMobileMenuOpen = ref(false);

// Menutup menu mobile saat navigasi rute berubah
watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);

function getDashboardLink(role: Role | null): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.PHARMACIST:
      return "/pharmacist";
    case Role.DOCTOR:
    default:
      return "/doctor";
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 transition-all"
  >
    <!-- Track Garis Bawah Pixelated (Halus, Modern & Presisi) -->
    <div
      class="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-[repeating-linear-gradient(90deg,#2563eb_0px,#2563eb_4px,transparent_4px,transparent_8px)] opacity-40 pointer-events-none select-none"
      aria-hidden="true"
    ></div>

    <div
      class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-4"
    >
      <!-- Penanda Sudut Teknis / Cross Markers di Batas Layout -->
      <span
        class="absolute -bottom-[6px] left-4 sm:left-6 lg:left-8 font-mono text-[10px] font-bold text-blue-500/80 select-none pointer-events-none"
        aria-hidden="true"
        >+</span
      >
      <span
        class="absolute -bottom-[6px] right-4 sm:right-6 lg:right-8 font-mono text-[10px] font-bold text-blue-500/80 select-none pointer-events-none"
        aria-hidden="true"
        >+</span
      >

      <!-- 1. Brand Logo & Identity (Kiri) -->
      <div class="flex items-center gap-6 lg:gap-8">
        <AppLogo
          size="md"
          show-subtitle
          subtitle="Healthcare Information System"
        />

        <!-- 2. Menu Navigasi Desktop -->
        <nav
          class="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-400"
        >
          <!-- Link: Beranda -->
          <router-link to="/" v-slot="{ isExactActive, navigate }" custom>
            <a
              href="/"
              @click.prevent="navigate"
              :class="[
                'relative px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all duration-150 flex items-center gap-1.5 group select-none',
                isExactActive
                  ? 'text-white bg-slate-900/90 border border-slate-800 shadow-[0_0_12px_rgba(37,99,235,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800/60',
              ]"
            >
              <span
                :class="[
                  'font-mono text-[10px] transition-all duration-150',
                  isExactActive
                    ? 'text-blue-400 opacity-100'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400/70',
                ]"
                >[</span
              >
              <span>Beranda</span>
              <span
                :class="[
                  'font-mono text-[10px] transition-all duration-150',
                  isExactActive
                    ? 'text-blue-400 opacity-100'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400/70',
                ]"
                >]</span
              >

              <!-- Indikator Bar Pixel Saat Aktif -->
              <span
                v-if="isExactActive"
                class="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6] pointer-events-none"
              ></span>
            </a>
          </router-link>

          <!-- Link: Daftar Antrean -->
          <router-link to="/booking" v-slot="{ isActive, navigate }" custom>
            <a
              href="/booking"
              @click.prevent="navigate"
              :class="[
                'relative px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all duration-150 flex items-center gap-1.5 group select-none',
                isActive
                  ? 'text-white bg-slate-900/90 border border-slate-800 shadow-[0_0_12px_rgba(37,99,235,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800/60',
              ]"
            >
              <span
                :class="[
                  'font-mono text-[10px] transition-all duration-150',
                  isActive
                    ? 'text-blue-400 opacity-100'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400/70',
                ]"
                >[</span
              >
              <span>Daftar Antrean</span>
              <span
                :class="[
                  'font-mono text-[10px] transition-all duration-150',
                  isActive
                    ? 'text-blue-400 opacity-100'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400/70',
                ]"
                >]</span
              >

              <span
                v-if="isActive"
                class="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6] pointer-events-none"
              ></span>
            </a>
          </router-link>

          <!-- Link: Lacak Antrean & Resep -->
          <router-link to="/track-queue" v-slot="{ isActive, navigate }" custom>
            <a
              href="/track-queue"
              @click.prevent="navigate"
              :class="[
                'relative px-3.5 py-2 rounded-[4px] text-xs font-medium transition-all duration-150 flex items-center gap-1.5 group select-none',
                isActive || route.path.startsWith('/track')
                  ? 'text-white bg-slate-900/90 border border-slate-800 shadow-[0_0_12px_rgba(37,99,235,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent hover:border-slate-800/60',
              ]"
            >
              <span
                :class="[
                  'font-mono text-[10px] transition-all duration-150',
                  isActive || route.path.startsWith('/track')
                    ? 'text-blue-400 opacity-100'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400/70',
                ]"
                >[</span
              >
              <span>Lacak Antrean & Resep</span>
              <span
                :class="[
                  'font-mono text-[10px] transition-all duration-150',
                  isActive || route.path.startsWith('/track')
                    ? 'text-blue-400 opacity-100'
                    : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-blue-400/70',
                ]"
                >]</span
              >

              <span
                v-if="isActive || route.path.startsWith('/track')"
                class="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-blue-500 shadow-[0_0_8px_#3b82f6] pointer-events-none"
              ></span>
            </a>
          </router-link>
        </nav>
      </div>

      <!-- 3. Tombol Aksi Desktop (Kanan) -->
      <div class="hidden sm:flex items-center gap-3">
        <template v-if="isAuthenticated && user">
          <div
            class="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-slate-900/80 border border-slate-800"
          >
            <span
              class="w-1.5 h-1.5 bg-emerald-500 rounded-none shadow-[0_0_6px_#10b981]"
            ></span>
            <span class="text-xs text-slate-300 font-medium">{{ user.name }}</span>
            <span
              class="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-blue-950/80 border border-blue-500/30 text-blue-400 uppercase font-semibold tracking-wider"
            >
              {{ user.role }}
            </span>
          </div>

          <router-link :to="getDashboardLink(userRole)">
            <Button
              variant="secondary"
              size="sm"
              class="rounded-[4px] border-slate-700 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.8)] hover:shadow-[3px_3px_0px_0px_rgba(30,41,59,0.9)]"
            >
              Buka Dashboard
            </Button>
          </router-link>

          <Button
            variant="ghost"
            size="sm"
            class="text-slate-400 hover:text-rose-400 rounded-[4px]"
            @click="handleLogout"
          >
            Keluar
          </Button>
        </template>

        <template v-else>
          <!-- Tombol Utama "Masuk Portal" dengan Aksen Pixel Drop-Shadow -->
          <router-link to="/auth/login" class="inline-flex">
            <button
              type="button"
              class="group relative inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-[4px] border border-blue-400/40 shadow-[2px_2px_0px_0px_rgba(29,78,216,0.6)] hover:shadow-[3px_3px_0px_0px_rgba(37,99,235,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-150 cursor-pointer select-none"
            >
              <!-- Detail Pixel Kecil di Sudut Tombol -->
              <span
                class="absolute top-0 right-0 w-1 h-1 bg-white/60 pointer-events-none"
              ></span>
              <span>Masuk Portal</span>
              <span
                class="font-mono text-[12px] text-blue-200 transition-transform duration-150 group-hover:translate-x-1"
                >→</span
              >
            </button>
          </router-link>
        </template>
      </div>

      <!-- 4. Tombol Hamburger Mobile -->
      <div class="flex sm:hidden items-center gap-2">
        <button
          type="button"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="relative p-2 rounded-[4px] text-slate-300 hover:text-white bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/50"
          :aria-expanded="isMobileMenuOpen"
          aria-label="Toggle menu navigasi"
        >
          <!-- Aksen Pixel Mikro di Sudut Hamburger -->
          <span
            class="absolute top-0 left-0 w-1 h-1 bg-blue-500/60 pointer-events-none"
          ></span>

          <svg
            v-if="!isMobileMenuOpen"
            class="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            class="h-5 w-5 text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 5. Panel Navigasi Dropdown Mobile -->
    <div
      v-if="isMobileMenuOpen"
      class="sm:hidden border-t border-slate-800/90 bg-slate-950/98 backdrop-blur-xl px-4 pt-3 pb-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <nav class="flex flex-col space-y-1.5 text-xs font-medium text-slate-300">
        <router-link
          to="/"
          class="px-3 py-2 rounded-[4px] hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-between border border-transparent hover:border-slate-800"
          exact-active-class="bg-slate-900 text-white font-semibold border-slate-800 shadow-xs"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] text-blue-400">[01]</span>
            <span>Beranda</span>
          </div>
          <span class="font-mono text-[10px] text-slate-600">→</span>
        </router-link>

        <router-link
          to="/booking"
          class="px-3 py-2 rounded-[4px] hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-between border border-transparent hover:border-slate-800"
          active-class="bg-slate-900 text-white font-semibold border-slate-800 shadow-xs"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] text-blue-400">[02]</span>
            <span>Daftar Antrean</span>
          </div>
          <span class="font-mono text-[10px] text-slate-600">→</span>
        </router-link>

        <router-link
          to="/track-queue"
          class="px-3 py-2 rounded-[4px] hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-between border border-transparent hover:border-slate-800"
          active-class="bg-slate-900 text-white font-semibold border-slate-800 shadow-xs"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] text-blue-400">[03]</span>
            <span>Lacak Antrean & Resep</span>
          </div>
          <span class="font-mono text-[10px] text-slate-600">→</span>
        </router-link>
      </nav>

      <!-- Aksi CTA / Profil Pengguna Mobile -->
      <div
        class="pt-3 border-t border-dashed border-slate-800/80 flex flex-col gap-2.5"
      >
        <template v-if="isAuthenticated && user">
          <div
            class="px-3 py-2 rounded-[4px] bg-slate-900/60 border border-slate-800 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-none"></span>
              <span class="text-xs text-slate-200 font-medium">{{ user.name }}</span>
            </div>
            <span
              class="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-blue-950 text-blue-400 border border-blue-500/30 uppercase font-semibold"
            >
              {{ user.role }}
            </span>
          </div>

          <router-link :to="getDashboardLink(userRole)" class="w-full">
            <Button variant="secondary" size="sm" block class="rounded-[4px]">
              Buka Dashboard
            </Button>
          </router-link>

          <Button
            variant="ghost"
            size="sm"
            block
            class="rounded-[4px] text-slate-400 hover:text-rose-400"
            @click="handleLogout"
          >
            Keluar
          </Button>
        </template>

        <template v-else>
          <router-link to="/auth/login" class="w-full">
            <button
              type="button"
              class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-[4px] border border-blue-400/40 shadow-[2px_2px_0px_0px_rgba(29,78,216,0.6)] transition-all cursor-pointer"
            >
              <span>Masuk Portal</span>
              <span class="font-mono text-[11px] text-blue-200">→</span>
            </button>
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>
