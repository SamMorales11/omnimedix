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
const emailError = ref("");
const passwordError = ref("");

function validate(): boolean {
  emailError.value = "";
  passwordError.value = "";
  let isValid = true;

  if (!email.value.trim()) {
    emailError.value = "Email wajib diisi.";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    emailError.value = "Format email tidak valid.";
    isValid = false;
  }

  if (!password.value) {
    passwordError.value = "Kata sandi wajib diisi.";
    isValid = false;
  } else if (password.value.length < 6) {
    passwordError.value = "Kata sandi minimal 6 karakter.";
    isValid = false;
  }

  return isValid;
}

function getRedirectForRole(role: Role | null): string {
  switch (role) {
    case Role.ADMIN:
      return "/admin";
    case Role.PHARMACIST:
      return "/pharmacist";
    case Role.DOCTOR:
      return "/doctor";
    default:
      return "/";
  }
}

async function handleLogin() {
  if (!validate()) return;

  const success = await authStore.login(email.value.trim(), password.value);
  if (success) {
    const redirectUrl =
      (route.query["redirect"] as string) ||
      getRedirectForRole(authStore.userRole);
    await router.push(redirectUrl);
  }
}

function fillDemo(role: Role) {
  authStore.error = null;
  emailError.value = "";
  passwordError.value = "";

  if (role === Role.DOCTOR) {
    email.value = "dokter@omnimedix.local";
    password.value = "Dokter123!";
  } else if (role === Role.PHARMACIST) {
    email.value = "apoteker@omnimedix.local";
    password.value = "Apoteker123!";
  } else {
    email.value = "admin@omnimedix.local";
    password.value = "Admin123!";
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1.5">
      <h2 class="text-xl font-bold text-slate-100 tracking-tight">
        Masuk Portal Medis
      </h2>
      <p class="text-xs text-slate-400">
        Masukkan kredensial akun terdaftar untuk mengakses sistem layanan klinis
      </p>
    </div>

    <!-- Global Error Banner -->
    <div
      v-if="authStore.error"
      class="p-3.5 text-xs rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 flex items-start gap-2.5 animate-fadeIn"
    >
      <span class="text-rose-400 font-bold shrink-0 mt-0.5">⚠️</span>
      <div class="flex-1">{{ authStore.error }}</div>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <Input
        id="email"
        label="Alamat Email"
        type="email"
        placeholder="nama@omnimedix.local"
        v-model="email"
        :error="emailError"
        :disabled="authStore.isLoading"
        required
      />

      <Input
        id="password"
        label="Kata Sandi"
        type="password"
        placeholder="••••••••"
        v-model="password"
        :error="passwordError"
        :disabled="authStore.isLoading"
        required
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        block
        :loading="authStore.isLoading"
        :disabled="authStore.isLoading"
      >
        {{ authStore.isLoading ? "Memverifikasi..." : "Masuk ke Sistem" }}
      </Button>
    </form>

    <!-- Preset Demo Credentials -->
    <div class="pt-4 border-t border-slate-800/80 space-y-2.5">
      <p
        class="text-[11px] text-slate-500 font-medium text-center uppercase tracking-wider"
      >
        Pilih Akun Demo Cepat:
      </p>
      <div class="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          :disabled="authStore.isLoading"
          @click="fillDemo(Role.DOCTOR)"
        >
          🩺 Dokter
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="authStore.isLoading"
          @click="fillDemo(Role.PHARMACIST)"
        >
          💊 Farmasi
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="authStore.isLoading"
          @click="fillDemo(Role.ADMIN)"
        >
          ⚙️ Admin
        </Button>
      </div>
    </div>
  </div>
</template>
