<script setup lang="ts">
import Navbar from "../components/layout/Navbar.vue";
import AppFooter from "../components/layout/AppFooter.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
    <Navbar />
    <main class="flex-1">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>
