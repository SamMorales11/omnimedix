<script setup lang="ts">
import { computed } from "vue";

interface Props {
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "sm",
});

const variantClasses = computed(() => {
  switch (props.variant) {
    case "success":
      return "bg-emerald-950/60 text-emerald-300 border-emerald-800/80";
    case "warning":
      return "bg-amber-950/60 text-amber-300 border-amber-800/80";
    case "danger":
      return "bg-rose-950/60 text-rose-300 border-rose-800/80";
    case "info":
      return "bg-sky-950/60 text-sky-300 border-sky-800/80";
    case "default":
    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
});
</script>

<template>
  <span
    :class="[
      'inline-flex items-center font-medium border rounded-full',
      variantClasses,
      props.size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
    ]"
  >
    <slot />
  </span>
</template>
