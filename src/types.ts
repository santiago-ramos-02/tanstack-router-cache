/** Visibility mode for a cached route container. */
export type ActivityMode = "visible" | "hidden";

/** Route-cache options stored in TanStack Router `staticData.routeCache`. */
export type RouteCacheOptions = {
  /**
   * Maximum age, in milliseconds, for a retained route view.
   *
   * Expired cached views are not restored. This only controls the retained
   * mounted view; use TanStack Router's `staleTime`, `preloadStaleTime`, and
   * `gcTime` route options for loader-data caching.
   *
   * @defaultValue `Infinity`
   */
  maxAge?: number;
};

/**
 * Static route-cache opt-in value.
 *
 * Use `true` to keep the route view cached with default behavior, or an object
 * when the retained view needs route-cache-specific options.
 */
export type RouteCacheStaticOption = boolean | RouteCacheOptions;

/** Options accepted by `defineRouteCache`. */
export type RouteCacheRouteOptions = RouteCacheOptions & {
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
};

/** Emitted when navigation to a ready cached route begins. */
export type RouteCacheNavigationStart = {
  /** Normalized pathname for the cached route being restored. */
  pathname: string;
  /** `performance.now()` timestamp for the navigation start. */
  startedAt: number;
};

/** Emitted after a cached route has become visible and painted. */
export type RouteCacheNavigationComplete = RouteCacheNavigationStart & {
  /** Total elapsed time from start to painted, in milliseconds. */
  duration: number;
  /** `performance.now()` timestamp after the visible route painted. */
  paintedAt: number;
  /** `performance.now()` timestamp when the cached route became visible. */
  visibleAt: number;
};
