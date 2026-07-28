/** Visibility mode for a cached route container. */
export type ActivityMode = "visible" | "hidden";

/**
 * Controls what happens to React effects while a cached route is hidden.
 *
 * `"pause"` uses React Activity and deactivates effects while hidden.
 * `"keep-alive"` only hides the retained DOM, so effects remain mounted.
 */
export type RouteCacheEffectMode = "pause" | "keep-alive";

/**
 * Static route-cache opt-in value.
 *
 * Use `true` to keep the route view cached with default behavior, or an object
 * when the retained view needs route-cache-specific options.
 */
export type RouteCacheStaticOption =
  | boolean
  | {
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
       * Controls whether effects pause or remain mounted while this route is
       * hidden.
       *
       * Use `"keep-alive"` for component-level data loaders or subscriptions
       * that must survive cached navigation. Hidden effects continue running,
       * so use `"pause"` for expensive background work.
       */
      effectMode?: RouteCacheEffectMode;
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
