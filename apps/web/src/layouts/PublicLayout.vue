<script setup lang="ts">
import Navbar from "../components/layout/Navbar.vue";
import AppFooter from "../components/layout/AppFooter.vue";
</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600/30 selection:text-blue-200"
  >
    <!-- Header dengan Logo Omnimedix dan Navigasi Minimal -->
    <Navbar />

    <!-- Konten Utama yang Fokus -->
    <main class="flex-1 w-full flex flex-col">
      <slot>
        <router-view />
      </slot>
    </main>

    <!-- Footer Ringan -->
    <AppFooter />
  </div>
</template>
