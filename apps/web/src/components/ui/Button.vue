<script setup lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";
import Spinner from "./Spinner.vue";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
  type?: ButtonHTMLAttributes["type"];
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "primary",
  size: "md",
  type: "button",
  disabled: false,
  loading: false,
  block: false,
});

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700 shadow-sm border border-transparent focus-visible:ring-blue-500",
  secondary:
    "bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-850 border border-slate-700/80 shadow-sm focus-visible:ring-slate-400",
  outline:
    "bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white border border-slate-700 active:bg-slate-800 focus-visible:ring-slate-400",
  ghost:
    "bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 active:bg-slate-800 border border-transparent focus-visible:ring-slate-400",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm border border-transparent focus-visible:ring-rose-500",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-9 px-4 py-2 text-sm rounded-lg gap-2",
  lg: "h-11 px-6 text-base rounded-lg gap-2.5",
  icon: "h-9 w-9 p-0 rounded-lg justify-center",
};

const buttonClasses = computed(() =>
  cn(
    "inline-flex items-center justify-center font-medium select-none transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
    variantStyles[props.variant],
    sizeStyles[props.size],
    props.block && "w-full",
    props.class,
  ),
);
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :aria-disabled="props.disabled || props.loading"
    :aria-busy="props.loading"
    :class="buttonClasses"
  >
    <Spinner
      v-if="props.loading"
      :size="props.size === 'lg' ? 'md' : 'xs'"
      variant="current"
      class="-ml-0.5"
    />
    <slot />
  </button>
</template>
