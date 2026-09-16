<script setup lang="ts">
import Sidebar from "../components/layout/Sidebar.vue";
</script>

<template>
  <div class="min-h-screen flex bg-slate-950 text-slate-100">
    <Sidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <main class="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>
