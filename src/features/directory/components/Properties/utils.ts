// Format a Unix epoch (seconds) as a locale date-time string.
export const formatDate = (secs: number) =>
  new Date(secs * 1000).toLocaleString();
