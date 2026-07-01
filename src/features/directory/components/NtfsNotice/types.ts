export type NtfsNoticeProps = {
  // Re-run the write-probe (after the user installs a driver and reconnects the drive).
  recheck: () => void;
};
