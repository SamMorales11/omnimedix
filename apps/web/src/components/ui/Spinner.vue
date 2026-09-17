<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "current" | "primary" | "muted" | "white";
  label?: string;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SpinnerProps>(), {
  size: "sm",
  variant: "current",
  label: "Memuat...",
});

const sizeMap: Record<NonNullable<SpinnerProps["size"]>, string> = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-6 w-6 border-[2.5px]",
  xl: "h-8 w-8 border-[3px]",
};

const variantMap: Record<NonNullable<SpinnerProps["variant"]>, string> = {
  current: "border-current/25 border-t-current",
  primary: "border-blue-500/20 border-t-blue-500",
  muted: "border-slate-700 border-t-slate-300",
  white: "border-white/20 border-t-white",
};

const classes = computed(() =>
  cn(
    "inline-block animate-spin rounded-full shrink-0",
    sizeMap[props.size],
    variantMap[props.variant],
    props.class,
  ),
);
</script>

<template>
  <span role="status" :aria-label="props.label" :class="classes">
    <span class="sr-only">{{ props.label }}</span>
  </span>
</template>
