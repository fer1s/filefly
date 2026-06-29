// Small notification bridge so any module (including non-React code like api.ts) can surface a
// message in the UI. App registers the real notifier on mount; until then we fall back to console.

export const TOAST_TYPE = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
} as const;

export type ToastType = (typeof TOAST_TYPE)[keyof typeof TOAST_TYPE];

type Notifier = (message: string, type: ToastType) => void;

let notifier: Notifier | null = null;
// Gated by the "show toasts" setting. When off, notify() falls back to the console (so errors
// are still logged) but nothing is surfaced in the UI.
let enabled = true;

export const setNotifier = (fn: Notifier | null) => {
  notifier = fn;
};

export const setToastsEnabled = (value: boolean) => {
  enabled = value;
};

export const notify = (message: string, type: ToastType = TOAST_TYPE.INFO) => {
  if (notifier && enabled) notifier(message, type);
  else if (type === TOAST_TYPE.ERROR) console.error(message);
  else console.log(message);
};
