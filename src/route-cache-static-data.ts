import type { StaticDataRouteOption } from "@tanstack/react-router";

import type { RouteCacheEffectMode, RouteCacheStaticOption } from "./types";

const DEFAULT_ROUTE_CACHE_MAX_AGE = Number.POSITIVE_INFINITY;
const DEFAULT_ROUTE_CACHE_EFFECT_MODE: RouteCacheEffectMode = "pause";

type CachedRouteTiming = {
  createdAt?: number;
  staticData: StaticDataRouteOption;
};

function getRouteCacheOptions(
  staticData: StaticDataRouteOption | undefined
): Exclude<RouteCacheStaticOption, boolean> | undefined {
  const routeCache = staticData?.routeCache;

  if (routeCache === true) {
    return {};
  }

  if (routeCache && typeof routeCache === "object") {
    return routeCache;
  }
}

/**
 * Builds route options for a cacheable TanStack Router route.
 *
 * TanStack Router loader-cache options are returned at the route-option level,
 * while route-cache-specific options are stored under `staticData.routeCache`.
 */
export function defineRouteCache(
  options: {
    /**
     * Controls whether effects pause or remain mounted while this route is
     * hidden.
     *
     * `"pause"` uses React Activity. `"keep-alive"` hides the retained DOM
     * without deactivating its effects.
     */
    effectMode?: RouteCacheEffectMode;
    /**
     * Maximum age, in milliseconds, for a retained route view.
     *
     * Expired cached views are not restored. This only controls the retained
     * mounted view; use TanStack Router's `staleTime`, `preloadStaleTime`,
     * and `gcTime` route options for loader-data caching.
     *
     * @defaultValue `Infinity`
     */
    maxAge?: number;
    /**
     * TanStack Router loader garbage-collection time, in milliseconds.
     *
     * This is returned as a top-level route option.
     */
    gcTime?: number;
    /**
     * TanStack Router preload freshness time, in milliseconds.
     *
     * This is returned as a top-level route option.
     */
    preloadStaleTime?: number;
    /**
     * TanStack Router loader freshness time, in milliseconds.
     *
     * This is returned as a top-level route option and does not control the
     * retained route view lifetime. Use `maxAge` for that.
     */
    staleTime?: number;
  } = {}
) {
  const { effectMode, gcTime, maxAge, preloadStaleTime, staleTime } = options;

  return {
    ...(gcTime === undefined ? {} : { gcTime }),
    ...(preloadStaleTime === undefined ? {} : { preloadStaleTime }),
    ...(staleTime === undefined ? {} : { staleTime }),
    staticData: {
      routeCache:
        maxAge === undefined && effectMode === undefined
          ? true
          : {
              ...(effectMode === undefined ? {} : { effectMode }),
              ...(maxAge === undefined ? {} : { maxAge }),
            },
    },
  };
}

export function isRouteCacheEnabled(
  staticData: StaticDataRouteOption | undefined
) {
  return Boolean(getRouteCacheOptions(staticData));
}

export function getRouteCacheEffectMode(
  staticData: StaticDataRouteOption | undefined
): RouteCacheEffectMode {
  return getRouteCacheOptions(staticData)?.effectMode === "keep-alive"
    ? "keep-alive"
    : DEFAULT_ROUTE_CACHE_EFFECT_MODE;
}

function normalizeRouteCacheMaxAge(maxAge: number | undefined) {
  if (typeof maxAge !== "number" || Number.isNaN(maxAge)) {
    return DEFAULT_ROUTE_CACHE_MAX_AGE;
  }

  if (!Number.isFinite(maxAge)) {
    return DEFAULT_ROUTE_CACHE_MAX_AGE;
  }

  return Math.max(maxAge, 0);
}

function getRouteCacheMaxAge(staticData: StaticDataRouteOption | undefined) {
  return normalizeRouteCacheMaxAge(getRouteCacheOptions(staticData)?.maxAge);
}

export function isCachedRouteStale(
  route: CachedRouteTiming | undefined,
  now = Date.now()
) {
  if (!route) {
    return false;
  }

  const maxAge = getRouteCacheMaxAge(route.staticData);

  if (maxAge === DEFAULT_ROUTE_CACHE_MAX_AGE) {
    return false;
  }

  return now - (route.createdAt ?? now) > maxAge;
}
