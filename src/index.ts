// biome-ignore lint/performance/noBarrelFile: this file is the package's public entry point.
export { RouterCacheOutlet } from "./components/router-cache-outlet";
export type { CachedRouteData, CachedRoutes } from "./contexts/router-cache";
export { RouterCacheProvider } from "./contexts/router-cache";
export { useRouteCacheActive } from "./hooks/use-route-cache-active";
export { useRouteCacheActivity } from "./hooks/use-route-cache-activity";
export { useRouteCacheEffect } from "./hooks/use-route-cache-effect";
export { useRouteCacheErrorBoundary } from "./hooks/use-route-cache-error-boundary";
export { useRouteCacheNavigation } from "./hooks/use-route-cache-navigation";
export { useRouterCache } from "./hooks/use-router-cache";
export type * from "./types";

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router static data is extended through interface merging.
  interface StaticDataRouteOption {
    routeCache?: boolean;
  }
}
