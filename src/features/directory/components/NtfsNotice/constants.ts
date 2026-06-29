// FUSE-T is the recommended free, no-kernel-extension way to get NTFS write support on macOS;
// ntfs-3g rides on top of it. The site has downloads + setup instructions.
export const FUSE_T_URL = "https://www.fuse-t.org/";

// Best-effort Homebrew one-liner (taps + installs FUSE-T and ntfs-3g). Offered as a copyable
// convenience; the link above is the canonical source if formula names drift.
export const NTFS_INSTALL_COMMAND =
  "brew tap macos-fuse-t/cask && brew install fuse-t && brew install gromgit/fuse/ntfs-3g-mac";
