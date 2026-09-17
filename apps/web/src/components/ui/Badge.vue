<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export interface BadgeProps {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  dot?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: "default",
  size: "sm",
  dot: false,
});

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-800 text-slate-300 border-slate-700/80",
  primary: "bg-blue-950/60 text-blue-300 border-blue-800/80",
  success: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
  warning: "bg-amber-950/60 text-amber-300 border-amber-800/80",
  danger: "bg-rose-950/60 text-rose-300 border-rose-800/80",
  info: "bg-sky-950/60 text-sky-300 border-sky-800/80",
};

const dotStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-400",
  primary: "bg-blue-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-sky-400",
};

const badgeClasses = computed(() =>
  cn(
    "inline-flex items-center font-medium border rounded-full select-none tracking-tight",
    variantStyles[props.variant],
    props.size === "sm"
      ? "px-2 py-0.5 text-2xs gap-1.5"
      : "px-2.5 py-1 text-xs gap-2",
    props.class,
  ),
);
</script>

<template>
  <span :class="badgeClasses">
    <span
      v-if="props.dot"
      :class="cn('h-1.5 w-1.5 rounded-full shrink-0', dotStyles[props.variant])"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>
