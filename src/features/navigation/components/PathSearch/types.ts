export type PathSearchProps = {
  value: string;
  onChange: (value: string) => void;
  // Begin closing the search field (Escape, or the empty field losing focus). Plays the exit
  // animation; the actual unmount happens via onExited.
  onClose: () => void;
  // True while the exit animation is playing.
  closing: boolean;
  // Called when the exit animation finishes, so the parent can unmount and restore the button.
  onExited: () => void;
};
