export type DialogHeaderProps = {
  title: string;
  // id wired to the dialog's aria-labelledby.
  titleId: string;
  onClose: () => void;
};
