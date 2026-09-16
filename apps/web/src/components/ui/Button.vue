<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "primary",
  size: "md",
  type: "button",
  disabled: false,
  loading: false,
  block: false,
});

const variantClasses = computed(() => {
  switch (props.variant) {
    case "secondary":
      return "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm";
    case "outline":
      return "border border-slate-700 hover:border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800/60";
    case "ghost":
      return "bg-transparent hover:bg-slate-800/80 text-slate-300 hover:text-slate-100";
    case "danger":
      return "bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-950/40";
    case "primary":
    default:
      return "bg-teal-600 hover:bg-teal-500 text-white font-medium shadow-sm shadow-teal-950/40 focus:ring-teal-500";
  }
});

const sizeClasses = computed(() => {
  switch (props.size) {
    case "sm":
      return "px-3 py-1.5 text-xs rounded-md gap-1.5";
    case "lg":
      return "px-5 py-2.5 text-base rounded-lg gap-2.5";
    case "md":
    default:
      return "px-4 py-2 text-sm rounded-lg gap-2";
  }
});
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :class="[
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses,
      sizeClasses,
      props.block ? 'w-full' : '',
    ]"
  >
    <svg
      v-if="props.loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <slot />
  </button>
</template>
