export type PathInputProps = {
  path: string;
  onCommit: (path: string) => void;
  // Focus and select the field on mount (used when it replaces the breadcrumbs on click).
  autoFocus?: boolean;
  // Leave edit mode — called on blur, Enter, and Escape (Escape cancels without committing).
  onExit?: () => void;
};
