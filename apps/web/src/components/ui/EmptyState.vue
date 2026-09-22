<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";
import omnimedixLogo from "../../assets/omnimedix logo.png";

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
      class="h-12 w-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-sm shrink-0 overflow-hidden"
      aria-hidden="true"
    >
      <slot name="icon">
        <div class="w-8 h-8 rounded-lg bg-slate-950/90 border border-slate-700/80 flex items-center justify-center overflow-hidden shadow-inner p-1">
          <img
            :src="omnimedixLogo"
            alt="Omnimedix"
            class="w-full h-full object-contain scale-[1.32] opacity-75 grayscale-[20%]"
          />
        </div>
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
