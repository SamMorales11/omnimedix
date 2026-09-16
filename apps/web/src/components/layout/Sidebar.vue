<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import Badge from "../ui/Badge.vue";
import { Role } from "@omnimedix/shared";

const route = useRoute();
const { user, handleLogout } = useAuth();

interface MenuItem {
  title: string;
  path: string;
  role?: Role;
}

const menuItems: MenuItem[] = [
  { title: "Admin Dashboard", path: "/admin", role: Role.ADMIN },
  { title: "Doctor Console", path: "/doctor", role: Role.DOCTOR },
  { title: "Farmasi & Obat", path: "/pharmacist", role: Role.PHARMACIST },
];

const filteredMenu = computed(() => {
  const currentUser = user.value;
  if (!currentUser) return menuItems;
  return menuItems.filter(
    (item) => !item.role || item.role === currentUser.role,
  );
});
</script>

<template>
  <aside
    class="w-64 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between shrink-0 min-h-screen"
  >
    <div class="p-4 space-y-6">
      <div
        class="flex items-center gap-2.5 px-2 py-3 border-b border-slate-800/80"
      >
        <div
          class="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-sm"
        >
          OM
        </div>
        <div>
          <div class="font-bold text-sm text-slate-100">Omnimedix</div>
          <div class="text-[11px] text-slate-400">Hospital & Clinic</div>
        </div>
      </div>

      <nav class="space-y-1">
        <div
          class="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
        >
          Navigasi Menu
        </div>
        <router-link
          v-for="item in filteredMenu"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors',
            route.path.startsWith(item.path)
              ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900',
          ]"
        >
          <span>{{ item.title }}</span>
          <Badge v-if="item.role" size="sm" variant="default">{{
            item.role
          }}</Badge>
        </router-link>
      </nav>
    </div>

    <!-- User Profile Footer -->
    <div class="p-4 border-t border-slate-800/80 bg-slate-900/30">
      <div v-if="user" class="flex items-center justify-between">
        <div class="min-w-0 pr-2">
          <p class="text-xs font-medium text-slate-200 truncate">
            {{ user.name }}
          </p>
          <p class="text-[11px] text-slate-400 truncate">{{ user.email }}</p>
        </div>
        <button
          @click="handleLogout"
          class="text-xs text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded hover:bg-slate-800"
          title="Keluar"
        >
          Keluar
        </button>
      </div>
    </div>
  </aside>
</template>
