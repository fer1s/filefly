export type RemoteErrorNoticeProps = {
  // The human-readable failure reason (already localized by the loader).
  error: string;
  // Re-attempts the listing (a fresh connect for remotes).
  retry: () => void;
};
