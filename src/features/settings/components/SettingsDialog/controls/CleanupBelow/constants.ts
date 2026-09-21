// Stands in for a target path in `busyPath` while a folder is being registered, since an add has no
// row of its own yet. Not a real path — it can never collide with one because paths are absolute.
export const ADD_SENTINEL = "add";
