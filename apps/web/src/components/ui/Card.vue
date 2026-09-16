<script setup lang="ts">
interface Props {
  title?: string;
  subtitle?: string;
  hoverable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  hoverable: false,
});
</script>

<template>
  <div
    :class="[
      'bg-slate-900/90 border border-slate-800/80 rounded-xl p-6 backdrop-blur-sm shadow-sm',
      props.hoverable
        ? 'transition-all duration-200 hover:border-slate-700 hover:shadow-md'
        : '',
    ]"
  >
    <div v-if="props.title || $slots.header" class="mb-4">
      <slot name="header">
        <h3 class="text-base font-semibold text-slate-100">
          {{ props.title }}
        </h3>
        <p v-if="props.subtitle" class="text-xs text-slate-400 mt-1">
          {{ props.subtitle }}
        </p>
      </slot>
    </div>
    <div>
      <slot />
    </div>
    <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-slate-800/80">
      <slot name="footer" />
    </div>
  </div>
</template>
