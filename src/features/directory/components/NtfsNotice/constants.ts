// macFUSE provides the FUSE layer NTFS write support needs on macOS; ntfs-3g (gromgit's build,
// which targets macFUSE) rides on top of it. The site has downloads + setup instructions.
// (FUSE-T was tried but its ntfs-3g path isn't available via Homebrew — gromgit's ntfs-3g-mac
// requires macFUSE.)
export const MACFUSE_URL = "https://macfuse.github.io/";

// Best-effort Homebrew one-liner (installs macFUSE + ntfs-3g). Offered as a copyable convenience;
// the link above is the canonical source if formula names drift.
export const NTFS_INSTALL_COMMAND =
  "brew install --cask macfuse && brew install gromgit/fuse/ntfs-3g-mac";
