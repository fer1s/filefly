// Centralized app routes. Do not hardcode route strings elsewhere; import from here.
export const ROUTES = {
  volumes: "/",
  directory: "/directory",
} as const;

export type RouteKey = keyof typeof ROUTES;
