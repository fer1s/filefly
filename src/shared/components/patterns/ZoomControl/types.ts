export interface ZoomControlProps {
  // Current zoom multiplier (1 = 100%).
  value: number;
  min: number;
  max: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  // Set the zoom to an absolute multiplier. When provided, the slider becomes interactive and
  // drives the zoom directly; otherwise the slider is a read-only percentage indicator.
  onZoomTo?: (value: number) => void;
  // Slider granularity in percent (defaults to 1 for a smooth drag).
  step?: number;
  // Optional hotkey glyphs shown in the button tooltips.
  zoomInHotkey?: string;
  zoomOutHotkey?: string;
  // Extra class on the root for positioning by the consumer.
  className?: string;
}
