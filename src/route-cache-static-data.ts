import type { StaticDataRouteOption } from "@tanstack/react-router";
import type { RouteCacheOptions, RouteCacheRouteOptions } from "./types";

const DEFAULT_ROUTE_CACHE_MAX_AGE = Number.POSITIVE_INFINITY;

type CachedRouteTiming = {
  createdAt?: number;
  staticData: StaticDataRouteOption;
};

function getRouteCacheOptions(
  staticData: StaticDataRouteOption | undefined
): RouteCacheOptions | undefined {
  const routeCache = staticData?.routeCache;

  if (routeCache === true) {
    return {};
  }

  if (routeCache && typeof routeCache === "object") {
    return routeCache;
  }
}

export function defineRouteCache(options: RouteCacheRouteOptions = {}) {
  const { gcTime, maxAge, preloadStaleTime, staleTime } = options;

  return {
    ...(gcTime === undefined ? {} : { gcTime }),
    ...(preloadStaleTime === undefined ? {} : { preloadStaleTime }),
    ...(staleTime === undefined ? {} : { staleTime }),
    staticData: {
      routeCache: maxAge === undefined ? true : { maxAge },
    },
  };
}

export function isRouteCacheEnabled(
  staticData: StaticDataRouteOption | undefined
) {
  return Boolean(getRouteCacheOptions(staticData));
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

function getRouteCacheMaxAge(
  staticData: StaticDataRouteOption | undefined
) {
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
