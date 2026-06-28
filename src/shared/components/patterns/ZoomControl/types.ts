export interface ZoomControlProps {
  // Current zoom multiplier (1 = 100%).
  value: number;
  min: number;
  max: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  // Optional hotkey glyphs shown in the button tooltips.
  zoomInHotkey?: string;
  zoomOutHotkey?: string;
  // Extra class on the root for positioning by the consumer.
  className?: string;
}
