<script setup lang="ts">
import { useAuth } from "../../composables/useAuth";
import Button from "../ui/Button.vue";
import Badge from "../ui/Badge.vue";
import { Role } from "@omnimedix/shared";

const { user, userRole, isAuthenticated, handleLogout } = useAuth();

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
      <div class="flex items-center gap-6">
        <router-link to="/" class="flex items-center gap-2.5">
          <div
            class="h-8 w-8 rounded-lg bg-gradient-to-tr from-teal-500 to-sky-400 flex items-center justify-center font-bold text-slate-950 text-base shadow-sm shadow-teal-500/30"
          >
            +
          </div>
          <span class="font-bold text-lg tracking-tight text-slate-100">
            Omni<span class="text-teal-400">medix</span>
          </span>
        </router-link>

        <nav
          class="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400"
        >
          <router-link
            to="/booking"
            class="hover:text-teal-300 transition-colors"
            active-class="text-teal-400"
          >
            Daftar Antrean
          </router-link>
          <router-link
            to="/track"
            class="hover:text-teal-300 transition-colors"
            active-class="text-teal-400"
          >
            Lacak Resep & Status
          </router-link>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <template v-if="isAuthenticated && user">
          <router-link :to="getDashboardLink(userRole)">
            <Button variant="secondary" size="sm">Buka Dashboard</Button>
          </router-link>
          <div class="hidden sm:flex items-center gap-2">
            <span class="text-xs text-slate-300 font-medium">{{
              user.name
            }}</span>
            <Badge variant="info">{{ user.role }}</Badge>
          </div>
          <Button variant="ghost" size="sm" @click="handleLogout"
            >Keluar</Button
          >
        </template>
        <template v-else>
          <router-link to="/auth/login">
            <Button variant="primary" size="sm">Masuk Portal</Button>
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>
