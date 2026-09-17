<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../utils/cn";

export interface CardProps {
  as?: "div" | "section" | "article";
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<CardProps>(), {
  as: "div",
  hoverable: false,
});

const cardClasses = computed(() =>
  cn(
    "bg-slate-900/90 border border-slate-800/80 rounded-xl p-6 shadow-sm",
    props.hoverable &&
      "transition-colors duration-150 hover:border-slate-700/90 hover:bg-slate-900 cursor-pointer",
    props.class,
  ),
);
</script>

<template>
  <component :is="props.as" :class="cardClasses">
    <div v-if="props.title || $slots.header" class="mb-4">
      <slot name="header">
        <h3 class="text-base font-semibold tracking-tight text-slate-100">
          {{ props.title }}
        </h3>
        <p
          v-if="props.subtitle"
          class="text-xs text-slate-400 mt-1 leading-normal"
        >
          {{ props.subtitle }}
        </p>
      </slot>
    </div>

    <div>
      <slot />
    </div>

    <div v-if="$slots.footer" class="mt-5 pt-4 border-t border-slate-800/80">
      <slot name="footer" />
    </div>
  </component>
</template>
