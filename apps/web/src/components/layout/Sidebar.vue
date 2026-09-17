<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "../../composables/useAuth";
import Badge from "../ui/Badge.vue";
import { Role } from "@omnimedix/shared";

interface Props {
  isCollapsed?: boolean;
  isOpenMobile?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isCollapsed: false,
  isOpenMobile: false,
});

const emit = defineEmits<{
  closeMobile: [];
  toggleCollapse: [];
}>();

const route = useRoute();
const { user, handleLogout } = useAuth();

interface MenuItem {
  title: string;
  path: string;
  role?: Role;
  icon: "home" | "stethoscope" | "pill" | "settings" | "external";
}

const menuItems: MenuItem[] = [
  {
    title: "Panel Administrator",
    path: "/admin",
    role: Role.ADMIN,
    icon: "settings",
  },
  {
    title: "Konsol Antrean Pasien",
    path: "/doctor",
    role: Role.DOCTOR,
    icon: "stethoscope",
  },
  {
    title: "Farmasi & Resep",
    path: "/pharmacist",
    role: Role.PHARMACIST,
    icon: "pill",
  },
];

const filteredMenu = computed(() => {
  const currentUser = user.value;
  if (!currentUser) return [];
  return menuItems.filter(
    (item) => !item.role || item.role === currentUser.role,
  );
});
</script>

<template>
  <!-- Mobile Backdrop Overlay -->
  <Transition
    enter-active-class="transition-opacity ease-linear duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity ease-linear duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="props.isOpenMobile"
      class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
      aria-hidden="true"
      @click="emit('closeMobile')"
    />
  </Transition>

  <!-- Sidebar Container -->
  <aside
    :class="[
      'fixed inset-y-0 left-0 z-50 lg:static flex flex-col justify-between shrink-0 border-r border-slate-800/80 bg-slate-950 transition-all duration-200 ease-in-out select-none',
      props.isCollapsed ? 'lg:w-18' : 'lg:w-64',
      props.isOpenMobile
        ? 'translate-x-0 w-64 shadow-2xl'
        : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <!-- Top Header & Brand -->
    <div>
      <div
        class="h-16 flex items-center justify-between px-4 border-b border-slate-800/80"
      >
        <router-link
          to="/"
          class="flex items-center gap-2.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1"
        >
          <div
            class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0"
          >
            +
          </div>
          <div v-if="!props.isCollapsed" class="min-w-0">
            <span
              class="font-bold text-base tracking-tight text-slate-100 truncate block"
            >
              Omni<span class="text-blue-500">medix</span>
            </span>
          </div>
        </router-link>

        <!-- Mobile Close Button -->
        <button
          type="button"
          @click="emit('closeMobile')"
          class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          aria-label="Tutup navigasi"
        >
          <svg
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

      <!-- Navigation Links -->
      <div class="p-3 space-y-4">
        <div
          v-if="!props.isCollapsed"
          class="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
        >
          Layanan Medis
        </div>

        <nav class="space-y-1">
          <router-link
            v-for="item in filteredMenu"
            :key="item.path"
            :to="item.path"
            :title="props.isCollapsed ? item.title : undefined"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors group',
              route.path.startsWith(item.path)
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent',
              props.isCollapsed ? 'justify-center px-2' : '',
            ]"
            @click="emit('closeMobile')"
          >
            <!-- Stethoscope Icon -->
            <svg
              v-if="item.icon === 'stethoscope'"
              class="h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.75"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12A7.5 7.5 0 0012 19.5m0 0A7.5 7.5 0 0019.5 12M12 19.5V21m0 0h3m-3 0H9m1.5-16.5A1.5 1.5 0 009 3m3 1.5A1.5 1.5 0 0113.5 3"
              />
            </svg>

            <!-- Pill Icon -->
            <svg
              v-else-if="item.icon === 'pill'"
              class="h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.75"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
              />
            </svg>

            <!-- Settings Icon -->
            <svg
              v-else
              class="h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.75"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>

            <span v-if="!props.isCollapsed" class="truncate flex-1">
              {{ item.title }}
            </span>

            <Badge
              v-if="!props.isCollapsed && item.role"
              size="sm"
              variant="default"
              class="ml-auto text-[10px]"
            >
              {{ item.role }}
            </Badge>
          </router-link>
        </nav>

        <!-- Secondary Section: Public Navigation Shortcut -->
        <div class="pt-4 border-t border-slate-800/80">
          <router-link
            to="/"
            :title="props.isCollapsed ? 'Beranda Utama' : undefined"
            :class="[
              'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors',
              props.isCollapsed ? 'justify-center px-2' : '',
            ]"
            @click="emit('closeMobile')"
          >
            <svg
              class="h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.75"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            <span v-if="!props.isCollapsed">Portal Publik</span>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Bottom User Bar & Collapse Trigger (Desktop) -->
    <div class="border-t border-slate-800/80 bg-slate-950 p-3 space-y-2">
      <!-- User Profile Snapshot -->
      <div
        v-if="user && !props.isCollapsed"
        class="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between"
      >
        <div class="min-w-0 pr-2">
          <p class="text-xs font-medium text-slate-200 truncate">
            {{ user.name }}
          </p>
          <p class="text-[11px] text-slate-400 truncate">{{ user.email }}</p>
        </div>
        <button
          @click="handleLogout"
          class="text-xs text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-md hover:bg-slate-800"
          title="Keluar dari akun"
          aria-label="Keluar"
        >
          <svg
            class="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
        </button>
      </div>

      <!-- Collapse Desktop Toggle Button -->
      <button
        type="button"
        @click="emit('toggleCollapse')"
        :class="[
          'hidden lg:flex w-full items-center py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors',
          props.isCollapsed ? 'justify-center px-2' : 'justify-between px-3',
        ]"
        :title="props.isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'"
        :aria-label="props.isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'"
      >
        <span v-if="!props.isCollapsed" class="text-[11px] font-medium">
          Ciutkan Menu
        </span>
        <svg
          :class="[
            'h-4 w-4 transition-transform duration-200',
            props.isCollapsed ? 'rotate-180' : '',
          ]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"
          />
        </svg>
      </button>
    </div>
  </aside>
</template>
