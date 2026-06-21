// Small notification bridge so any module (including non-React code like api.ts) can surface a
// message in the UI. App registers the real notifier on mount; until then we fall back to console.

export type ToastType = "error" | "info";

type Notifier = (message: string, type: ToastType) => void;

let notifier: Notifier | null = null;

export const setNotifier = (fn: Notifier | null) => {
  notifier = fn;
};

export const notify = (message: string, type: ToastType = "info") => {
  if (notifier) notifier(message, type);
  else if (type === "error") console.error(message);
  else console.log(message);
};
