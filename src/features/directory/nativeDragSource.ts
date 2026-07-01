// Tracks the paths of a native drag that WE started (from our own entries), so a drop back inside
// the window can tell our own drag apart from files dragged in from another app. Our own drag
// honours the move/copy setting; an external drop always copies (never yanks the file out of its
// original app/location).
let ownDragPaths: string[] = [];

export const setOwnDragPaths = (paths: string[]) => {
  ownDragPaths = paths;
};

export const clearOwnDragPaths = () => {
  ownDragPaths = [];
};

// True when every dropped path belongs to the drag we started.
export const isOwnDrag = (paths: string[]) =>
  paths.length > 0 && paths.every((p) => ownDragPaths.includes(p));
