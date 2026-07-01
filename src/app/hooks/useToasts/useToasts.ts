import { useCallback, useEffect, useRef, useState } from "react";

import {
  TOAST_VISIBLE_MS,
  TOAST_EXIT_MS,
  TOAST_ARM_DELAY_MS,
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

  // Dismiss every visible toast at once.
  const dismissAll = useCallback(() => {
    setToasts((prev) => prev.map((toast) => ({ ...toast, leaving: true })));
    setTimeout(() => setToasts([]), TOAST_EXIT_MS);
  }, []);

  // Register the global notifier; auto-dismiss each toast after a few seconds.
  useEffect(() => {
    const addToast = (
      message: string,
      type: ToastType,
      onAction?: () => void,
    ) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, message, type, onAction }]);
      setTimeout(() => dismissToast(id), TOAST_VISIBLE_MS);
    };

    setNotifier(addToast);
    return () => setNotifier(null);
  }, [dismissToast]);

  // Any user interaction hides the toasts. Listeners only run while toasts exist.
  // Wait a moment before arming so the interaction that triggered the toast (and its
  // trailing events) doesn't dismiss it instantly.
  useEffect(() => {
    if (toasts.length === 0) return;

    const handle = () => dismissAll();
    const arm = setTimeout(() => {
      window.addEventListener("pointerdown", handle);
      window.addEventListener("keydown", handle);
      window.addEventListener("wheel", handle);
    }, TOAST_ARM_DELAY_MS);

    return () => {
      clearTimeout(arm);
      window.removeEventListener("pointerdown", handle);
      window.removeEventListener("keydown", handle);
      window.removeEventListener("wheel", handle);
    };
  }, [toasts.length, dismissAll]);

  return { toasts, dismissToast };
};
