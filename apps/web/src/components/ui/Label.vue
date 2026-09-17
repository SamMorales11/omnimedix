<script setup lang="ts">
import type { HTMLAttributes, LabelHTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export interface LabelProps {
  for?: LabelHTMLAttributes["for"];
  required?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<LabelProps>(), {
  required: false,
  disabled: false,
});

const labelClasses = computed(() =>
  cn(
    "block text-xs font-medium text-slate-300 select-none",
    props.disabled && "opacity-50 cursor-not-allowed",
    props.class,
  ),
);
</script>

<template>
  <label :for="props.for" :class="labelClasses">
    <slot />
    <span v-if="props.required" class="text-rose-400 ml-0.5" aria-hidden="true">
      *
    </span>
  </label>
</template>
