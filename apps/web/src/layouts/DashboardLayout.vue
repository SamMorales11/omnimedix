<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import Sidebar from "../components/layout/Sidebar.vue";
import Button from "../components/ui/Button.vue";
import Badge from "../components/ui/Badge.vue";
import AppLogo from "../components/ui/AppLogo.vue";
import { useAuth } from "../composables/useAuth";

const route = useRoute();
const { user, handleLogout } = useAuth();

const isCollapsed = ref(false);
const isOpenMobile = ref(false);

const pageTitle = computed(
  () => (route.meta["title"] as string) || "Dashboard",
);
</script>

<template>
  <div
    class="min-h-screen flex bg-slate-950 text-slate-100 antialiased selection:bg-blue-600/30 selection:text-blue-200"
  >
    <!-- Sidebar (Collapsible & Mobile Drawer) -->
    <Sidebar
      :is-collapsed="isCollapsed"
      :is-open-mobile="isOpenMobile"
      @close-mobile="isOpenMobile = false"
      @toggle-collapse="isCollapsed = !isCollapsed"
    />

    <!-- Main Content Container -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Topbar Header -->
      <header
        class="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between"
      >
        <!-- Left: Mobile Menu Trigger + Breadcrumb/Title -->
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="isOpenMobile = true"
            class="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-slate-800 transition-colors"
            aria-label="Buka navigasi menu"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <AppLogo size="xs" :show-text="false" class="lg:hidden" />

          <div>
            <h1 class="text-sm font-semibold tracking-tight text-slate-100 m-0">
              {{ pageTitle }}
            </h1>
          </div>
        </div>

        <!-- Right: User Identity, Role, and Logout -->
        <div class="flex items-center gap-3">
          <div v-if="user" class="flex items-center gap-2">
            <div class="hidden sm:flex flex-col text-right">
              <span class="text-xs font-medium text-slate-200 leading-tight">
                {{ user.name }}
              </span>
              <span class="text-[11px] text-slate-400">
                {{ user.email }}
              </span>
            </div>
            <Badge variant="primary" class="font-mono text-2xs">
              {{ user.role }}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            @click="handleLogout"
            class="text-slate-400 hover:text-rose-400"
            title="Keluar dari sesi"
          >
            <svg
              class="h-4 w-4 sm:mr-1.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
            <span class="hidden sm:inline">Keluar</span>
          </Button>
        </div>
      </header>

      <!-- Area Konten Utama -->
      <main
        class="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto"
      >
        <slot>
          <router-view />
        </slot>
      </main>
    </div>
  </div>
</template>
