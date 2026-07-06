// The Storage entry is informational (it reports the app's data footprint) and has no compact
// right-hand control — the whole panel is rendered full-width by StorageBelow. Returning null keeps
// the row's control slot empty while still going through the generic SettingItem renderer.
const StorageControl = () => null;

export default StorageControl;
