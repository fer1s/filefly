export type ModalContextValue = {
  // True while one or more modal dialogs are open.
  anyOpen: boolean;
  // Register / unregister an open modal. The shared Dialog calls these while visible; ref-counted
  // so stacked dialogs (e.g. a confirmation over settings) behave correctly.
  open: () => void;
  close: () => void;
};
