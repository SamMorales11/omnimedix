<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export type ClinicalStatus =
  // Antrean
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  // Resep
  | "pending"
  | "preparing"
  | "ready"
  | "taken"
  // Stok Obat
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  // Umum / Akun
  | "active"
  | "inactive";

export interface StatusBadgeProps {
  status: ClinicalStatus;
  label?: string;
  size?: "sm" | "md";
  pulse?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<StatusBadgeProps>(), {
  size: "sm",
  pulse: false,
});

interface StatusConfig {
  defaultLabel: string;
  badgeClass: string;
  dotClass: string;
  shouldPulse: boolean;
}

const statusConfigMap: Record<ClinicalStatus, StatusConfig> = {
  // Antrean
  waiting: {
    defaultLabel: "Menunggu",
    badgeClass: "bg-amber-950/60 text-amber-300 border-amber-800/80",
    dotClass: "bg-amber-400",
    shouldPulse: false,
  },
  in_progress: {
    defaultLabel: "Sedang Dilayani",
    badgeClass: "bg-blue-950/60 text-blue-300 border-blue-800/80",
    dotClass: "bg-blue-400",
    shouldPulse: true,
  },
  completed: {
    defaultLabel: "Selesai",
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
    dotClass: "bg-emerald-400",
    shouldPulse: false,
  },
  cancelled: {
    defaultLabel: "Dibatalkan",
    badgeClass: "bg-rose-950/60 text-rose-300 border-rose-800/80",
    dotClass: "bg-rose-400",
    shouldPulse: false,
  },

  // Resep
  pending: {
    defaultLabel: "Menunggu Verifikasi",
    badgeClass: "bg-amber-950/60 text-amber-300 border-amber-800/80",
    dotClass: "bg-amber-400",
    shouldPulse: false,
  },
  preparing: {
    defaultLabel: "Sedang Diracing",
    badgeClass: "bg-blue-950/60 text-blue-300 border-blue-800/80",
    dotClass: "bg-blue-400",
    shouldPulse: true,
  },
  ready: {
    defaultLabel: "Siap Diambil",
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
    dotClass: "bg-emerald-400",
    shouldPulse: true,
  },
  taken: {
    defaultLabel: "Obat Diserahkan",
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700/80",
    dotClass: "bg-slate-400",
    shouldPulse: false,
  },

  // Stok Obat
  in_stock: {
    defaultLabel: "Tersedia",
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
    dotClass: "bg-emerald-400",
    shouldPulse: false,
  },
  low_stock: {
    defaultLabel: "Stok Menipis",
    badgeClass: "bg-amber-950/60 text-amber-300 border-amber-800/80",
    dotClass: "bg-amber-400",
    shouldPulse: true,
  },
  out_of_stock: {
    defaultLabel: "Stok Habis",
    badgeClass: "bg-rose-950/60 text-rose-300 border-rose-800/80",
    dotClass: "bg-rose-400",
    shouldPulse: false,
  },

  // Umum
  active: {
    defaultLabel: "Aktif",
    badgeClass: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
    dotClass: "bg-emerald-400",
    shouldPulse: false,
  },
  inactive: {
    defaultLabel: "Nonaktif",
    badgeClass: "bg-slate-800 text-slate-400 border-slate-700/80",
    dotClass: "bg-slate-500",
    shouldPulse: false,
  },
};

const currentConfig = computed(() => statusConfigMap[props.status]);
const displayLabel = computed(
  () => props.label || currentConfig.value.defaultLabel,
);
const hasPulse = computed(() => props.pulse || currentConfig.value.shouldPulse);
</script>

<template>
  <span
    role="status"
    :class="
      cn(
        'inline-flex items-center font-medium border rounded-full select-none tracking-tight',
        currentConfig.badgeClass,
        props.size === 'sm'
          ? 'px-2 py-0.5 text-2xs gap-1.5'
          : 'px-2.5 py-1 text-xs gap-2',
        props.class,
      )
    "
  >
    <span class="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
      <span
        v-if="hasPulse"
        :class="
          cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            currentConfig.dotClass,
          )
        "
      />
      <span
        :class="
          cn(
            'relative inline-flex rounded-full h-1.5 w-1.5',
            currentConfig.dotClass,
          )
        "
      />
    </span>
    <span>{{ displayLabel }}</span>
  </span>
</template>
