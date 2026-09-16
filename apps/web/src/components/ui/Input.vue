<script setup lang="ts">
interface Props {
  modelValue: string;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  type: "text",
  placeholder: "",
  error: undefined,
  required: false,
  disabled: false,
  id: undefined,
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:modelValue", target.value);
}
</script>

<template>
  <div class="space-y-1.5 w-full">
    <label
      v-if="props.label"
      :for="props.id"
      class="block text-xs font-medium text-slate-300"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-rose-400">*</span>
    </label>
    <div class="relative">
      <input
        :id="props.id"
        :type="props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :required="props.required"
        :disabled="props.disabled"
        @input="onInput"
        :class="[
          'w-full px-3.5 py-2 text-sm bg-slate-900 border rounded-lg text-slate-100 placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:bg-slate-900/50 disabled:cursor-not-allowed',
          props.error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
            : 'border-slate-800 focus:border-teal-500/80',
        ]"
      />
    </div>
    <p v-if="props.error" class="text-xs text-rose-400 mt-1">
      {{ props.error }}
    </p>
  </div>
</template>
