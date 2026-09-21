<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import AuthLayout from "../../layouts/AuthLayout.vue";
import { useAuthStore } from "../../stores/auth";
import Button from "../../components/ui/Button.vue";
import Input from "../../components/ui/Input.vue";
import Alert from "../../components/ui/Alert.vue";
import Badge from "../../components/ui/Badge.vue";
import { Role } from "@omnimedix/shared";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const emailError = ref("");
const passwordError = ref("");
const selectedDemoRole = ref<Role | null>(null);

function validate(): boolean {
  emailError.value = "";
  passwordError.value = "";
  let isValid = true;

  if (!email.value.trim()) {
    emailError.value = "Alamat email wajib diisi.";
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    emailError.value =
      "Format email tidak valid (contoh: user@omnimedix.local).";
    isValid = false;
  }

  if (!password.value) {
    passwordError.value = "Kata sandi wajib diisi.";
    isValid = false;
  } else if (password.value.length < 6) {
    passwordError.value = "Kata sandi harus memiliki minimal 6 karakter.";
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
    const redirectQuery = route.query["redirect"] as string | undefined;
    let target = getRedirectForRole(authStore.userRole);

    // Pastikan redirect query hanya digunakan jika sesuai dengan izin role pengguna
    if (redirectQuery && redirectQuery.startsWith("/")) {
      const isRoleAllowed =
        (authStore.userRole === Role.ADMIN && redirectQuery.startsWith("/admin")) ||
        (authStore.userRole === Role.DOCTOR && redirectQuery.startsWith("/doctor")) ||
        (authStore.userRole === Role.PHARMACIST && redirectQuery.startsWith("/pharmacist"));

      if (isRoleAllowed) {
        target = redirectQuery;
      }
    }

    await router.push(target);
  }
}

interface DemoAccount {
  role: Role;
  label: string;
  email: string;
  pass: string;
  badge: string;
}

const demoAccounts: DemoAccount[] = [
  {
    role: Role.DOCTOR,
    label: "Dokter",
    email: "dokter@omnimedix.local",
    pass: "Dokter123!",
    badge: "Poli Umum",
  },
  {
    role: Role.PHARMACIST,
    label: "Apoteker",
    email: "apoteker@omnimedix.local",
    pass: "Apoteker123!",
    badge: "Unit Farmasi",
  },
  {
    role: Role.ADMIN,
    label: "Admin",
    email: "admin@omnimedix.local",
    pass: "Admin123!",
    badge: "Master Sistem",
  },
];

function selectDemo(demo: DemoAccount) {
  authStore.error = null;
  emailError.value = "";
  passwordError.value = "";
  email.value = demo.email;
  password.value = demo.pass;
  selectedDemoRole.value = demo.role;
}
</script>

<template>
  <AuthLayout>
    <div class="space-y-6">
      <!-- Header Form -->
      <div class="space-y-1">
        <h2 class="text-lg font-bold text-slate-100 tracking-tight">
          Masuk Portal Medis
        </h2>
        <p class="text-xs text-slate-400 leading-normal">
          Gunakan akun terdaftar untuk mengakses rekam medis dan antrean pasien.
        </p>
      </div>

      <!-- Alert Error State (Soft, Informatif, Tidak Mengganggu) -->
      <Alert
        v-if="authStore.error"
        variant="danger"
        dismissible
        @dismiss="authStore.error = null"
      >
        {{ authStore.error }}
      </Alert>

      <!-- Form Login -->
      <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
        <Input
          id="email"
          label="Alamat Email Medis"
          type="email"
          placeholder="nama@omnimedix.local"
          v-model="email"
          :error="emailError"
          :disabled="authStore.isLoading"
          autocomplete="email"
          required
        />

        <div class="space-y-1.5">
          <div class="relative">
            <Input
              id="password"
              label="Kata Sandi Akun"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              v-model="password"
              :error="passwordError"
              :disabled="authStore.isLoading"
              autocomplete="current-password"
              required
            />
            <!-- Show/Hide Password Toggle -->
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3 top-7 text-slate-400 hover:text-slate-200 transition-colors p-1"
              :title="showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'"
              :aria-label="
                showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'
              "
              tabindex="-1"
            >
              <!-- Eye Off -->
              <svg
                v-if="showPassword"
                class="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
              <!-- Eye -->
              <svg
                v-else
                class="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.75"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          block
          :loading="authStore.isLoading"
          :disabled="authStore.isLoading"
        >
          {{
            authStore.isLoading
              ? "Memverifikasi Kredensial..."
              : "Masuk ke Sistem"
          }}
        </Button>
      </form>

      <!-- Petunjuk Singkat & Preset Demo Cepat (Bersih & Rapi) -->
      <div class="pt-4 border-t border-slate-800/70 space-y-2.5">
        <div class="flex items-center justify-between">
          <span
            class="text-[11px] font-medium text-slate-400 uppercase tracking-wider"
          >
            Akun Uji Coba (Demo)
          </span>
          <span class="text-[11px] text-slate-500">
            Klik untuk isi otomatis
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="demo in demoAccounts"
            :key="demo.role"
            type="button"
            @click="selectDemo(demo)"
            :disabled="authStore.isLoading"
            :class="[
              'p-2 rounded-lg border text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer',
              selectedDemoRole === demo.role
                ? 'bg-blue-950/40 border-blue-600/60 text-blue-300'
                : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300',
            ]"
          >
            <div class="flex items-center justify-between mb-0.5">
              <span class="text-xs font-semibold text-slate-200">
                {{ demo.label }}
              </span>
              <span
                v-if="selectedDemoRole === demo.role"
                class="h-1.5 w-1.5 rounded-full bg-blue-400"
                aria-hidden="true"
              />
            </div>
            <div class="text-[10px] text-slate-400 truncate">
              {{ demo.badge }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </AuthLayout>
</template>
