export const isUnderMount = (path: string, mount: string) =>
  path === mount || path.startsWith(`${mount}/`);
