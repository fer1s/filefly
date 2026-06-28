import { useCallback, useEffect, useRef, useState } from "react";

import {
  TOAST_VISIBLE_MS,
  TOAST_EXIT_MS,
  type ToastData,
} from "@/shared/components/patterns/ToastStack";
import { setNotifier, type ToastType } from "@/shared/toast";

// Owns the toast stack and registers the global notifier so any module (even non-React code)
// can push a toast. Returns the list to render plus a dismiss handler.
export const useToasts = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastId = useRef(0);

  // Dismiss a toast: first flag it as leaving so it animates out, then drop it once the exit
  // animation has finished.
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, leaving: true } : toast,
      ),
    );
    setTimeout(
      () => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
      TOAST_EXIT_MS,
    );
  }, []);

  // Register the global notifier; auto-dismiss each toast after a few seconds.
  useEffect(() => {
    const addToast = (message: string, type: ToastType) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismissToast(id), TOAST_VISIBLE_MS);
    };

    setNotifier(addToast);
    return () => setNotifier(null);
  }, [dismissToast]);

  return { toasts, dismissToast };
};
