<script setup lang="ts">
import { computed } from "vue";
import omnimedixLogo from "../../assets/omnimedix logo.png";

export interface AppLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  showBadge?: boolean;
  badgeText?: string;
  pixelAccents?: boolean;
  clickable?: boolean;
  to?: string;
  theme?: "dark" | "light" | "print-adaptive";
}

const props = withDefaults(defineProps<AppLogoProps>(), {
  size: "md",
  showText: true,
  showSubtitle: false,
  subtitle: "Healthcare Information System",
  showBadge: false,
  badgeText: "PORTAL",
  pixelAccents: true,
  clickable: true,
  to: "/",
  theme: "dark",
});

const sizeMap = {
  xs: {
    container: "h-6 w-6 rounded-[4px]",
    text: "text-xs",
    subtitle: "text-[9px]",
    badge: "text-[8px] px-1 py-0.5",
    gap: "gap-1.5",
  },
  sm: {
    container: "h-8 w-8 rounded-[5px]",
    text: "text-sm",
    subtitle: "text-[10px]",
    badge: "text-[8px] px-1.5 py-0.5",
    gap: "gap-2.5",
  },
  md: {
    container: "h-10 w-10 sm:h-10.5 sm:w-10.5 rounded-[6px]",
    text: "text-base sm:text-lg",
    subtitle: "text-[10px]",
    badge: "text-[9px] px-1.5 py-0.5",
    gap: "gap-3",
  },
  lg: {
    container: "h-12 w-12 sm:h-13 sm:w-13 rounded-[8px]",
    text: "text-xl sm:text-2xl",
    subtitle: "text-xs",
    badge: "text-[10px] px-2 py-0.5",
    gap: "gap-3.5",
  },
  xl: {
    container: "h-14 w-14 sm:h-16 sm:w-16 rounded-[10px]",
    text: "text-2xl sm:text-3xl",
    subtitle: "text-sm",
    badge: "text-xs px-2.5 py-1",
    gap: "gap-4",
  },
};

const currentSize = computed(() => sizeMap[props.size] || sizeMap.md);
</script>

<template>
  <component
    :is="props.clickable ? 'router-link' : 'div'"
    :to="props.clickable ? props.to : undefined"
    :class="[
      'inline-flex items-center select-none group transition-all',
      currentSize.gap,
      props.clickable
        ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-lg p-0.5 -m-0.5 cursor-pointer'
        : 'cursor-default',
    ]"
  >
    <!-- Logo Emblem Box -->
    <div
      :class="[
        'relative flex items-center justify-center bg-slate-900/90 border border-slate-800 shadow-[0_0_12px_rgba(37,99,235,0.15)] group-hover:border-blue-500/50 group-hover:shadow-[0_0_18px_rgba(59,130,246,0.25)] transition-all duration-200 overflow-hidden shrink-0',
        currentSize.container,
        props.theme === 'print-adaptive'
          ? 'print:bg-white print:border-black print:shadow-none'
          : '',
      ]"
    >
      <!-- Subtle Pixel Corner Accents -->
      <span
        v-if="props.pixelAccents"
        :class="[
          'absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-blue-400/80 z-10 pointer-events-none',
          props.theme === 'print-adaptive' ? 'print:border-black' : '',
        ]"
      ></span>
      <span
        v-if="props.pixelAccents"
        :class="[
          'absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-blue-400/80 z-10 pointer-events-none',
          props.theme === 'print-adaptive' ? 'print:border-black' : '',
        ]"
      ></span>

      <!-- Official Omnimedix Logo Image -->
      <img
        :src="omnimedixLogo"
        alt="Omnimedix Logo"
        class="h-full w-full object-contain scale-[1.32] transition-transform duration-300 group-hover:scale-[1.42] select-none pointer-events-none"
        loading="eager"
        decoding="async"
      />
    </div>

    <!-- Text & Subtitle -->
    <div v-if="props.showText" class="flex flex-col min-w-0">
      <div class="flex items-center gap-2">
        <span
          :class="[
            'font-bold tracking-tight text-slate-100 group-hover:text-white transition-colors truncate',
            currentSize.text,
            props.theme === 'print-adaptive' ? 'print:text-black' : '',
          ]"
        >
          Omni<span
            :class="[
              'text-blue-500',
              props.theme === 'print-adaptive' ? 'print:text-black' : '',
            ]"
            >medix</span
          >
        </span>

        <!-- Optional Pixelated Live Badge -->
        <span
          v-if="props.showBadge"
          :class="[
            'inline-flex items-center gap-1 rounded-[3px] font-mono font-medium tracking-wider bg-blue-950/80 text-blue-400 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.15)] select-none',
            currentSize.badge,
            props.theme === 'print-adaptive'
              ? 'print:bg-white print:border-black print:text-black print:shadow-none'
              : '',
          ]"
        >
          <span
            :class="[
              'w-1.5 h-1.5 bg-blue-400 rounded-none animate-pulse',
              props.theme === 'print-adaptive' ? 'print:hidden' : '',
            ]"
          ></span>
          {{ props.badgeText }}
        </span>
      </div>

      <!-- Optional Subtitle -->
      <span
        v-if="props.showSubtitle"
        :class="[
          'font-mono text-slate-400 tracking-wider uppercase -mt-0.5 truncate',
          currentSize.subtitle,
          props.theme === 'print-adaptive' ? 'print:text-black' : '',
        ]"
      >
        {{ props.subtitle }}
      </span>
    </div>
  </component>
</template>
