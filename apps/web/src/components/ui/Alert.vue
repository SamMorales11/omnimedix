<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { computed, ref } from "vue";
import { cn } from "../../utils/cn";

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  dismissible?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<AlertProps>(), {
  variant: "info",
  dismissible: false,
});

const emit = defineEmits<{
  dismiss: [];
}>();

const isVisible = ref(true);

function handleDismiss() {
  isVisible.value = false;
  emit("dismiss");
}

const variantStyles: Record<
  NonNullable<AlertProps["variant"]>,
  {
    container: string;
    iconColor: string;
    role: "alert" | "status";
  }
> = {
  info: {
    container: "bg-sky-950/40 text-sky-200 border-sky-800/70",
    iconColor: "text-sky-400",
    role: "status",
  },
  success: {
    container: "bg-emerald-950/40 text-emerald-200 border-emerald-800/70",
    iconColor: "text-emerald-400",
    role: "status",
  },
  warning: {
    container: "bg-amber-950/40 text-amber-200 border-amber-800/70",
    iconColor: "text-amber-400",
    role: "alert",
  },
  danger: {
    container: "bg-rose-950/40 text-rose-200 border-rose-800/70",
    iconColor: "text-rose-400",
    role: "alert",
  },
};

const currentStyle = computed(() => variantStyles[props.variant]);

const alertClasses = computed(() =>
  cn(
    "relative flex items-start gap-3 p-4 rounded-xl border text-xs leading-relaxed transition-opacity duration-150",
    currentStyle.value.container,
    props.class,
  ),
);
</script>

<template>
  <div v-if="isVisible" :role="currentStyle.role" :class="alertClasses">
    <!-- Icon Indicator -->
    <div class="shrink-0 mt-0.5" aria-hidden="true">
      <slot name="icon">
        <!-- Success Icon -->
        <svg
          v-if="props.variant === 'success'"
          class="h-4 w-4 text-emerald-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Warning Icon -->
        <svg
          v-else-if="props.variant === 'warning'"
          class="h-4 w-4 text-amber-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Danger Icon -->
        <svg
          v-else-if="props.variant === 'danger'"
          class="h-4 w-4 text-rose-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>

        <!-- Info Icon -->
        <svg
          v-else
          class="h-4 w-4 text-sky-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clip-rule="evenodd"
          />
        </svg>
      </slot>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <h4
        v-if="props.title"
        class="font-semibold text-xs text-slate-100 mb-0.5"
      >
        {{ props.title }}
      </h4>
      <div class="text-slate-300">
        <slot />
      </div>
    </div>

    <!-- Dismiss Button -->
    <button
      v-if="props.dismissible"
      type="button"
      @click="handleDismiss"
      class="shrink-0 -mr-1 -mt-1 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      aria-label="Tutup pemberitahuan"
    >
      <svg
        class="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        />
      </svg>
    </button>
  </div>
</template>
