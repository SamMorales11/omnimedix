<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import { Role } from "@omnimedix/shared";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const formError = ref("");

async function handleSubmit() {
  formError.value = "";
  if (!email.value || !password.value) {
    formError.value = "Silakan isi email dan password.";
    return;
  }

  const success = await authStore.login(email.value, password.value);
  if (success) {
    const redirectPath =
      (route.query["redirect"] as string) ||
      getDefaultRouteForRole(authStore.userRole);
    await router.push(redirectPath);
  } else {
    formError.value =
      authStore.error || "Login gagal. Periksa email atau password.";
  }
}

function getDefaultRouteForRole(role: Role | null): string {
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

// Quick fill credentials for development testing
function fillDemo(role: Role) {
  if (role === Role.DOCTOR) {
    email.value = "dokter@omnimedix.local";
    password.value = "password123";
  } else if (role === Role.PHARMACIST) {
    email.value = "farmasi@omnimedix.local";
    password.value = "password123";
  } else {
    email.value = "admin@omnimedix.local";
    password.value = "password123";
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h2 class="text-xl font-bold text-slate-100">Masuk Akun</h2>
      <p class="text-xs text-slate-400">
        Gunakan kredensial staf medis Omnimedix Anda
      </p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div
        v-if="formError"
        class="p-3 text-xs rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300"
      >
        {{ formError }}
      </div>

      <Input
        id="email"
        label="Alamat Email"
        type="email"
        placeholder="nama@omnimedix.local"
        v-model="email"
        required
      />

      <Input
        id="password"
        label="Kata Sandi"
        type="password"
        placeholder="••••••••"
        v-model="password"
        required
      />

      <Button
        type="submit"
        variant="primary"
        block
        :loading="authStore.isLoading"
      >
        Masuk ke Sistem
      </Button>
    </form>

    <!-- Quick Role Dev Demo Presets -->
    <div class="pt-4 border-t border-slate-800/80 space-y-2">
      <p class="text-[11px] text-slate-500 font-medium text-center">
        Isi Otomatis Kredensial Demo:
      </p>
      <div class="grid grid-cols-3 gap-2">
        <Button size="sm" variant="outline" @click="fillDemo(Role.DOCTOR)"
          >Dokter</Button
        >
        <Button size="sm" variant="outline" @click="fillDemo(Role.PHARMACIST)"
          >Farmasi</Button
        >
        <Button size="sm" variant="outline" @click="fillDemo(Role.ADMIN)"
          >Admin</Button
        >
      </div>
    </div>
  </div>
</template>
