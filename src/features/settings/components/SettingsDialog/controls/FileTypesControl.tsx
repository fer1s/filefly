// The file-type map has no compact right-hand control — the whole editor is rendered full-width by
// FileTypesBelow. Returning null keeps the row's control slot empty while still going through the
// generic SettingItem renderer.
const FileTypesControl = () => null;

export default FileTypesControl;
