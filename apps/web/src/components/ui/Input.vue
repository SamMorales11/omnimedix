<script setup lang="ts">
import type { HTMLAttributes, InputHTMLAttributes } from "vue";
import { computed, useId } from "vue";
import { cn } from "../../utils/cn";
import Label from "./Label.vue";

export interface InputProps {
  modelValue?: string | number;
  label?: string;
  type?: InputHTMLAttributes["type"];
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  id?: string;
  name?: string;
  autocomplete?: string;
  class?: HTMLAttributes["class"];
  inputClass?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: "",
  type: "text",
  placeholder: "",
  required: false,
  disabled: false,
  readonly: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const autoId = useId();
const inputId = computed(() => props.id || `input-${autoId}`);
const errorId = computed(() => `${inputId.value}-error`);
const helperId = computed(() => `${inputId.value}-helper`);

const ariaDescribedBy = computed(() => {
  const ids: string[] = [];
  if (props.error) ids.push(errorId.value);
  if (props.helperText) ids.push(helperId.value);
  return ids.length > 0 ? ids.join(" ") : undefined;
});

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}

const inputStyles = computed(() =>
  cn(
    "w-full px-3.5 py-2 text-sm bg-slate-900 border rounded-lg text-slate-100 placeholder-slate-500 transition-colors duration-150",
    "focus:outline-none focus:ring-2",
    "disabled:bg-slate-900/50 disabled:border-slate-800/60 disabled:text-slate-500 disabled:cursor-not-allowed",
    props.error
      ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/25"
      : "border-slate-800 hover:border-slate-700 focus:border-blue-500 focus:ring-blue-500/25",
    props.inputClass,
  ),
);
</script>

<template>
  <div :class="cn('space-y-1.5 w-full text-left', props.class)">
    <Label
      v-if="props.label"
      :for="inputId"
      :required="props.required"
      :disabled="props.disabled"
    >
      {{ props.label }}
    </Label>

    <div class="relative">
      <input
        :id="inputId"
        :name="props.name"
        :type="props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :required="props.required"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :autocomplete="props.autocomplete"
        :aria-invalid="!!props.error"
        :aria-required="props.required"
        :aria-describedby="ariaDescribedBy"
        :class="inputStyles"
        @input="onInput"
        @blur="emit('blur', $event)"
        @focus="emit('focus', $event)"
      />
    </div>

    <!-- Error Message -->
    <p
      v-if="props.error"
      :id="errorId"
      role="alert"
      class="text-xs text-rose-400 flex items-center gap-1 mt-1 font-medium"
    >
      <svg
        class="h-3.5 w-3.5 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ props.error }}</span>
    </p>

    <!-- Helper Text -->
    <p
      v-else-if="props.helperText"
      :id="helperId"
      class="text-xs text-slate-400 mt-1"
    >
      {{ props.helperText }}
    </p>
  </div>
</template>
