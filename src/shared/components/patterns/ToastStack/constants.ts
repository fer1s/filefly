// How long a toast stays fully visible before it starts leaving.
export const TOAST_VISIBLE_MS = 4000;

// Exit animation duration; must match the `toast-exit` keyframes in Toast.css so the element
// is removed only after it has finished animating out.
export const TOAST_EXIT_MS = 200;

// Grace period before "dismiss on any interaction" listeners arm, so the interaction that
// triggered the toast (and its trailing events) doesn't close it instantly.
export const TOAST_ARM_DELAY_MS = 600;

// A press on a toast is the toast's own click (reveal / dismiss), not the "any interaction
// dismisses" gesture: the global handler must skip it, or the exit animation starts under the
// cursor and the toast can slide out from under the pending mouseup, losing the click.
export const TOAST_SELECTOR = ".toast";
