// The size-ignore setting has no compact right-hand control — the whole pattern editor is rendered
// full-width by SizeIgnoresBelow. Returning null keeps the row's control slot empty while still
// going through the generic SettingItem renderer.
const SizeIgnoresControl = () => null;

export default SizeIgnoresControl;
