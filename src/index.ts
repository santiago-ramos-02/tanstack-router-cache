"use client";

import type { RouteCacheStaticOption } from "./types";

export { RouterCacheOutlet } from "./components/router-cache-outlet";
export type { CachedRouteData, CachedRoutes } from "./contexts/router-cache";
export { RouterCacheProvider } from "./contexts/router-cache";
export { useRouteCacheActive } from "./hooks/use-route-cache-active";
export { useRouteCacheActivity } from "./hooks/use-route-cache-activity";
export { useRouteCacheEffect } from "./hooks/use-route-cache-effect";
export { useRouteCacheErrorBoundary } from "./hooks/use-route-cache-error-boundary";
export { useRouteCacheNavigation } from "./hooks/use-route-cache-navigation";
export { useRouterCache } from "./hooks/use-router-cache";
export { defineRouteCache } from "./route-cache-static-data";
export type * from "./types";

declare module "@tanstack/react-router" {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- TanStack extends this contract through declaration merging.
  interface StaticDataRouteOption {
    /**
     * Enables retained route-view caching for this route.
     *
     * Use `true` for default behavior, or pass an options object for
     * route-cache-specific settings such as `maxAge`.
     */
    routeCache?: RouteCacheStaticOption;
  }
}
