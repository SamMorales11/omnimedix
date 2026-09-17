<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import { Role } from "@omnimedix/shared";

const route = useRoute();
const { user, userRole, isAuthenticated, handleLogout } = useAuth();
const isMobileMenuOpen = ref(false);

// Close mobile menu on navigation
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
    class="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md"
  >
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
    >
      <!-- Logo & Desktop Navigation -->
      <div class="flex items-center gap-6">
        <router-link to="/" class="flex items-center gap-2.5">
          <div
            class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm"
          >
            +
          </div>
          <span class="font-bold text-lg tracking-tight text-slate-100">
            Omni<span class="text-blue-500">medix</span>
          </span>
        </router-link>

        <nav
          class="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400"
        >
          <router-link
            to="/booking"
            class="hover:text-slate-200 transition-colors"
            active-class="text-blue-500 font-semibold"
          >
            Daftar Antrean
          </router-link>
          <router-link
            to="/track-queue"
            class="hover:text-slate-200 transition-colors"
            active-class="text-blue-500 font-semibold"
          >
            Lacak Antrean & Resep
          </router-link>
        </nav>
      </div>

      <!-- Desktop Action CTA -->
      <div class="hidden sm:flex items-center gap-3">
        <template v-if="isAuthenticated && user">
          <router-link :to="getDashboardLink(userRole)">
            <Button variant="secondary" size="sm">Buka Dashboard</Button>
          </router-link>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-300 font-medium">{{
              user.name
            }}</span>
            <Badge variant="primary">{{ user.role }}</Badge>
          </div>
          <Button variant="ghost" size="sm" @click="handleLogout">
            Keluar
          </Button>
        </template>
        <template v-else>
          <router-link to="/auth/login">
            <Button variant="primary" size="sm">Masuk Portal</Button>
          </router-link>
        </template>
      </div>

      <!-- Mobile Hamburger Button -->
      <div class="flex sm:hidden items-center gap-2">
        <button
          type="button"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800 transition-colors"
          :aria-expanded="isMobileMenuOpen"
          aria-label="Toggle navigasi menu"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Nav Dropdown Menu -->
    <div
      v-if="isMobileMenuOpen"
      class="sm:hidden border-t border-slate-800/80 bg-slate-950 px-4 pt-3 pb-5 space-y-3"
    >
      <nav class="flex flex-col space-y-2 text-sm font-medium text-slate-300">
        <router-link
          to="/booking"
          class="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
          active-class="bg-slate-900 text-blue-400 font-semibold"
        >
          Daftar Antrean
        </router-link>
        <router-link
          to="/track-queue"
          class="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
          active-class="bg-slate-900 text-blue-400 font-semibold"
        >
          Lacak Antrean & Resep
        </router-link>
      </nav>

      <div class="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
        <template v-if="isAuthenticated && user">
          <div class="px-3 py-1 flex items-center justify-between">
            <span class="text-xs text-slate-300 font-medium">{{
              user.name
            }}</span>
            <Badge variant="primary">{{ user.role }}</Badge>
          </div>
          <router-link :to="getDashboardLink(userRole)" class="w-full">
            <Button variant="secondary" size="sm" block>
              Buka Dashboard
            </Button>
          </router-link>
          <Button variant="ghost" size="sm" block @click="handleLogout">
            Keluar
          </Button>
        </template>
        <template v-else>
          <router-link to="/auth/login" class="w-full">
            <Button variant="primary" size="sm" block>Masuk Portal</Button>
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>
