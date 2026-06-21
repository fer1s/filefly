export const getPathLabel = (path: string): string => {
  const normalizedPath = path.replace(/[\\/]+$/, "");
  const segments = normalizedPath.split(/[\\/]/);

  return segments[segments.length - 1] || path;
};
