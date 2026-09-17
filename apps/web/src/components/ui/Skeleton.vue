<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string;
  height?: string;
  count?: number;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SkeletonProps>(), {
  variant: "text",
  count: 1,
});

const variantStyles: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  text: "h-4 w-full rounded",
  circular: "rounded-full shrink-0",
  rectangular: "rounded-none w-full",
  rounded: "rounded-xl w-full",
};

const customStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.width) style.width = props.width;
  if (props.height) style.height = props.height;
  return style;
});

const skeletonClasses = computed(() =>
  cn(
    "animate-pulse bg-slate-800/80",
    variantStyles[props.variant],
    props.class,
  ),
);
</script>

<template>
  <div v-if="props.count > 1" class="space-y-2 w-full" aria-hidden="true">
    <div
      v-for="index in props.count"
      :key="index"
      :class="skeletonClasses"
      :style="customStyle"
    />
  </div>
  <div
    v-else
    :class="skeletonClasses"
    :style="customStyle"
    aria-hidden="true"
  />
</template>
