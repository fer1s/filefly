export type Crumb = { label: string; path: string };

export type PathCrumbsProps = {
  path: string;
  // Navigate to a crumb's ancestor path.
  onNavigate: (path: string) => void;
  // Clicking the empty area (not a crumb) switches to the editable path input.
  onEditRequest: () => void;
};
