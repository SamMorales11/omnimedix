<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  class?: HTMLAttributes["class"];
}

const props = defineProps<EmptyStateProps>();

const containerClasses = computed(() =>
  cn(
    "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl border border-dashed border-slate-800 bg-slate-900/40",
    props.class,
  ),
);
</script>

<template>
  <div :class="containerClasses">
    <!-- Icon or Clinical Illustration Slot -->
    <div
      class="h-12 w-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-sm shrink-0"
      aria-hidden="true"
    >
      <slot name="icon">
        <svg
          class="h-6 w-6 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </slot>
    </div>

    <!-- Title and Description -->
    <h3 class="text-sm font-semibold text-slate-100 mb-1">
      {{ props.title }}
    </h3>
    <p
      v-if="props.description"
      class="text-xs text-slate-400 max-w-sm leading-relaxed mb-5"
    >
      {{ props.description }}
    </p>

    <!-- Call to Action Slot -->
    <div v-if="$slots.action" class="flex items-center gap-3">
      <slot name="action" />
    </div>
  </div>
</template>
