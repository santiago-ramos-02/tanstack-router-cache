export { RouterCacheOutlet } from "./components/router-cache-outlet";
export type { CachedRouteData, CachedRoutes } from "./contexts/router-cache";
export { RouterCacheProvider } from "./contexts/router-cache";
export { useRouteCacheActive } from "./hooks/use-route-cache-active";
export { useRouteCacheActivity } from "./hooks/use-route-cache-activity";
export { useRouteCacheEffect } from "./hooks/use-route-cache-effect";
export { useRouteCacheErrorBoundary } from "./hooks/use-route-cache-error-boundary";
export { useRouteCacheNavigation } from "./hooks/use-route-cache-navigation";
export { useRouterCache } from "./hooks/use-router-cache";
export * from "./types";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    routeCache?: boolean;
  }
}
