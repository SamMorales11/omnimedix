import { ref } from "vue";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

const toasts = ref<ToastItem[]>([]);

export function useToast() {
  function show(toast: Omit<ToastItem, "id">): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duration = toast.duration ?? 4000;

    toasts.value.push({
      ...toast,
      id,
    });

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    return id;
  }

  function success(message: string, title?: string): string {
    return show({ type: "success", message, title });
  }

  function error(message: string, title?: string): string {
    return show({ type: "error", message, title });
  }

  function info(message: string, title?: string): string {
    return show({ type: "info", message, title });
  }

  function warning(message: string, title?: string): string {
    return show({ type: "warning", message, title });
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function clear() {
    toasts.value = [];
  }

  return {
    toasts,
    show,
    success,
    error,
    info,
    warning,
    dismiss,
    clear,
  };
}
