// The Cleanup entry has no compact right-hand control: the registered folders, their sizes and their
// actions are all rendered full-width by CleanupBelow (including its own add/refresh buttons).
// Returning null keeps the row's control slot empty while still going through the generic SettingItem
// renderer.
const CleanupControl = () => null;

export default CleanupControl;
