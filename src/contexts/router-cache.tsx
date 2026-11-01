/* oxlint-disable react/react-compiler -- This external route cache intentionally reads and updates stable mutable refs rather than rendering from them. */

import type {
  RouterContextProvider,
  StaticDataRouteOption,
} from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { createContext, use, useCallback, useMemo, useState } from "react";

import { normalizeCachedRoutePathname } from "../pathname";
import {
  isCachedRouteStale,
  isRouteCacheEnabled,
} from "../route-cache-static-data";

type RouterCacheProviderProps = {
  /**
   * Clears all cached routes when the key changes.
   *
   * Use this for user, tenant, workspace, locale, or environment boundaries.
   *
   * @defaultValue `"__default__"`
   */
  cacheScopeKey?: string | number | null;
  /** Outlet and surrounding UI that can access the route cache. */
  children: ReactNode;
  /**
   * Initial cached route entries.
   *
   * Most apps do not need this. Entries without enabled `staticData.routeCache`
   * or entries older than their `maxAge` are ignored.
   *
   * @defaultValue `{}`
   */
  defaultCachedRoutes?: CachedRoutes;
  /**
   * Maximum cached route entries across this provider.
   *
   * Set to `0` to disable caching.
   *
   * @defaultValue `Infinity`
   */
  maxEntries?: number;
  /**
   * Maximum cached entries for the same TanStack route id.
   *
   * Useful for dynamic routes where each pathname can create a separate cached
   * view.
   *
   * @defaultValue `Infinity`
   */
  maxEntriesPerRouteId?: number;
};

type RouterSnapshot = ComponentProps<typeof RouterContextProvider>["router"];

export type CachedRouteData = {
  /** First time this cache entry was stored, as `Date.now()`. */
  createdAt?: number;
  /** Full cached href, including search and hash when available. */
  href?: string;
  /** Last time this cached route became visible, as `Date.now()`. */
  lastVisibleAt?: number;
  /** TanStack Router route id used for per-route entry limits. */
  routeId?: string;
  /** Static data from the deepest cache-enabled route match. */
  staticData: StaticDataRouteOption;
  /** Route id of the outlet root match rendered by the cached outlet. */
  rootRouteId?: string;
  /** Router snapshot used to keep the cached route tree isolated while hidden. */
  routerSnapshot?: RouterSnapshot;
  /** Whether the cached route has a complete snapshot and can be restored. */
  ready?: boolean;
};

/** Cached route entries keyed by normalized pathname. */
export type CachedRoutes = Record<string, CachedRouteData>;

export type RouterCacheContextState = {
  cachedRoutes: CachedRoutes;
  erroredRouteCounts: Record<string, number>;
  /**
   * Applies the desired entry for a pathname, or removes it when `undefined`.
   * Prunes stale entries and applies the entry limits in the same update.
   */
  setCachedRoutes: (
    pathname: string,
    data: CachedRouteData | undefined
  ) => void;
  deleteCachedRoutes: (pathname: string[]) => void;
  touchCachedRoutes: (pathname: string[]) => void;
  retainErroredRoute: (pathname: string) => void;
  releaseErroredRoute: (pathname: string) => void;
};

const DEFAULT_MAX_ENTRIES = Number.POSITIVE_INFINITY;
const EMPTY_CACHED_ROUTES: CachedRoutes = {};
const RouterCacheContext = createContext<RouterCacheContextState | null>(null);

type RouterCacheConfig = {
  maxEntries: number;
  maxEntriesPerRouteId: number;
};

function shallowEqualRouteStaticData(
  current: StaticDataRouteOption,
  next: StaticDataRouteOption
) {
  if (current === next) {
    return true;
  }

  const currentEntries = Object.entries({ ...current });
  const nextEntries = Object.entries({ ...next });

  if (currentEntries.length !== nextEntries.length) {
    return false;
  }

  const nextValuesByKey = new Map(nextEntries);

  for (const [key, value] of currentEntries) {
    if (!Object.is(value, nextValuesByKey.get(key))) {
      return false;
    }
  }

  return true;
}

function filterRouterCacheRoutes(routes: CachedRoutes) {
  const now = Date.now();

  return Object.fromEntries(
    Object.entries(routes).flatMap(([pathname, route]) =>
      isRouteCacheEnabled(route.staticData) && !isCachedRouteStale(route, now)
        ? [[normalizeCachedRoutePathname(pathname), route] as const]
        : []
    )
  );
}

function pruneStaleCachedRoutes(routes: CachedRoutes) {
  const now = Date.now();
  const nextRoutes: CachedRoutes = {};
  let changed = false;

  for (const [pathname, route] of Object.entries(routes)) {
    if (isCachedRouteStale(route, now)) {
      changed = true;
      continue;
    }

    nextRoutes[pathname] = route;
  }

  return changed ? nextRoutes : routes;
}

function withoutCachedRoute(routes: CachedRoutes, pathname: string) {
  if (!Object.hasOwn(routes, pathname)) {
    return routes;
  }

  const nextRoutes = { ...routes };
  Reflect.deleteProperty(nextRoutes, pathname);
  return nextRoutes;
}

function isSameCachedRouteData(
  current: CachedRouteData | undefined,
  next: CachedRouteData
) {
  if (!current) {
    return false;
  }

  return (
    current.routeId === next.routeId &&
    current.href === next.href &&
    current.rootRouteId === next.rootRouteId &&
    current.ready === next.ready &&
    current.routerSnapshot === next.routerSnapshot &&
    shallowEqualRouteStaticData(current.staticData, next.staticData)
  );
}

function normalizeLimit(limit: number | undefined) {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_MAX_ENTRIES;
  }

  if (!Number.isFinite(limit)) {
    return DEFAULT_MAX_ENTRIES;
  }

  return Math.max(Math.trunc(limit), 0);
}

function getCachedRouteTimestamp(route: CachedRouteData) {
  return route.lastVisibleAt ?? route.createdAt ?? 0;
}

function sortCachedRouteEntries(
  [leftPathname, leftRoute]: [string, CachedRouteData],
  [rightPathname, rightRoute]: [string, CachedRouteData]
) {
  const timestampDifference =
    getCachedRouteTimestamp(leftRoute) - getCachedRouteTimestamp(rightRoute);

  if (timestampDifference !== 0) {
    return timestampDifference;
  }

  return leftPathname.localeCompare(rightPathname);
}

function getUnmarkedCachedRouteEntries(
  routes: CachedRoutes,
  keysToDelete: ReadonlySet<string>
) {
  return Object.entries(routes).filter(
    ([pathname]) => !keysToDelete.has(pathname)
  );
}

function getEntriesByRouteId(entries: [string, CachedRouteData][]) {
  const entriesByRouteId = new Map<string, [string, CachedRouteData][]>();

  for (const entry of entries) {
    const { routeId } = entry[1];

    if (!routeId) {
      continue;
    }

    const existingEntries = entriesByRouteId.get(routeId);
    if (existingEntries) {
      existingEntries.push(entry);
      continue;
    }

    entriesByRouteId.set(routeId, [entry]);
  }

  return entriesByRouteId;
}

function markEntriesForDeletion(
  entries: [string, CachedRouteData][],
  keysToDelete: Set<string>,
  protectedKeys: ReadonlySet<string>,
  excessEntryCount: number
) {
  if (excessEntryCount <= 0) {
    return;
  }

  const evictableEntries = entries
    .filter(([pathname]) => !protectedKeys.has(pathname))
    .toSorted(sortCachedRouteEntries);

  let remainingExcess = excessEntryCount;

  for (const [pathname] of evictableEntries) {
    if (remainingExcess <= 0) {
      break;
    }

    if (!keysToDelete.has(pathname)) {
      keysToDelete.add(pathname);
      remainingExcess -= 1;
    }
  }
}

function applyPerRouteEntryLimit(
  routes: CachedRoutes,
  maxEntriesPerRouteId: number,
  keysToDelete: Set<string>,
  protectedKeys: ReadonlySet<string>
) {
  if (maxEntriesPerRouteId === DEFAULT_MAX_ENTRIES) {
    return;
  }

  const entriesByRouteId = getEntriesByRouteId(
    getUnmarkedCachedRouteEntries(routes, keysToDelete)
  );

  for (const entries of entriesByRouteId.values()) {
    markEntriesForDeletion(
      entries,
      keysToDelete,
      protectedKeys,
      entries.length - maxEntriesPerRouteId
    );
  }
}

function applyGlobalEntryLimit(
  routes: CachedRoutes,
  maxEntries: number,
  keysToDelete: Set<string>,
  protectedKeys: ReadonlySet<string>
) {
  if (maxEntries === DEFAULT_MAX_ENTRIES) {
    return;
  }

  const remainingEntries = getUnmarkedCachedRouteEntries(routes, keysToDelete);
  markEntriesForDeletion(
    remainingEntries,
    keysToDelete,
    protectedKeys,
    remainingEntries.length - maxEntries
  );
}

function applyCachedRouteLimits(
  routes: CachedRoutes,
  config: RouterCacheConfig,
  protectedKeys: ReadonlySet<string>
) {
  if (
    config.maxEntries === DEFAULT_MAX_ENTRIES &&
    config.maxEntriesPerRouteId === DEFAULT_MAX_ENTRIES
  ) {
    return routes;
  }

  const keysToDelete = new Set<string>();
  applyPerRouteEntryLimit(
    routes,
    config.maxEntriesPerRouteId,
    keysToDelete,
    protectedKeys
  );
  applyGlobalEntryLimit(routes, config.maxEntries, keysToDelete, protectedKeys);

  if (keysToDelete.size === 0) {
    return routes;
  }

  const nextRoutes = { ...routes };

  for (const pathname of keysToDelete) {
    Reflect.deleteProperty(nextRoutes, pathname);
  }

  return nextRoutes;
}

function createCachedRouteData(
  current: CachedRouteData | undefined,
  next: CachedRouteData
) {
  const now = Date.now();

  return {
    ...next,
    createdAt: current?.createdAt ?? next.createdAt ?? now,
    lastVisibleAt: next.lastVisibleAt ?? now,
  } satisfies CachedRouteData;
}

function getNextCachedRoutesState(params: {
  cacheConfig: RouterCacheConfig;
  key: string;
  state: CachedRoutes;
  value: CachedRouteData | undefined;
}) {
  const { state, value } = params;
  const normalizedKey = normalizeCachedRoutePathname(params.key);

  if (params.cacheConfig.maxEntries === 0) {
    return state === EMPTY_CACHED_ROUTES ? state : EMPTY_CACHED_ROUTES;
  }

  if (!(value && isRouteCacheEnabled(value.staticData))) {
    return withoutCachedRoute(state, normalizedKey);
  }

  const nextRouteData = createCachedRouteData(state[normalizedKey], value);

  if (isSameCachedRouteData(state[normalizedKey], nextRouteData)) {
    return state;
  }

  return applyCachedRouteLimits(
    { ...state, [normalizedKey]: nextRouteData },
    params.cacheConfig,
    new Set([normalizedKey])
  );
}

export function RouterCacheProvider({
  cacheScopeKey = "__default__",
  children,
  defaultCachedRoutes = EMPTY_CACHED_ROUTES,
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxEntriesPerRouteId = DEFAULT_MAX_ENTRIES,
}: Readonly<RouterCacheProviderProps>) {
  return (
    <RouterCacheProviderScope
      defaultCachedRoutes={defaultCachedRoutes}
      key={cacheScopeKey ?? "__default__"}
      maxEntries={maxEntries}
      maxEntriesPerRouteId={maxEntriesPerRouteId}
    >
      {children}
    </RouterCacheProviderScope>
  );
}

type RouterCacheProviderScopeProps = {
  children: ReactNode;
  defaultCachedRoutes?: CachedRoutes;
  maxEntries: number;
  maxEntriesPerRouteId: number;
};

function RouterCacheProviderScope({
  children,
  defaultCachedRoutes = EMPTY_CACHED_ROUTES,
  maxEntries,
  maxEntriesPerRouteId,
}: Readonly<RouterCacheProviderScopeProps>) {
  const cacheConfig = useMemo<RouterCacheConfig>(
    () => ({
      maxEntries: normalizeLimit(maxEntries),
      maxEntriesPerRouteId: normalizeLimit(maxEntriesPerRouteId),
    }),
    [maxEntries, maxEntriesPerRouteId]
  );
  const [cachedRoutes, setCachedRoutes] = useState<CachedRoutes>(() =>
    applyCachedRouteLimits(
      filterRouterCacheRoutes(defaultCachedRoutes),
      cacheConfig,
      new Set()
    )
  );
  const [erroredRouteCounts, setErroredRouteCounts] = useState<
    Record<string, number>
  >({});

  // Every mutation goes through here so stale entries are pruned in the same
  // state change instead of by a follow-up effect after commit.
  const commitCachedRoutes = useCallback(
    (update: (routes: CachedRoutes) => CachedRoutes) => {
      setCachedRoutes((state) => update(pruneStaleCachedRoutes(state)));
    },
    []
  );

  const updateCachedRoutes = useCallback(
    (key: string, value: CachedRouteData | undefined) => {
      commitCachedRoutes((state) =>
        getNextCachedRoutesState({
          cacheConfig,
          key,
          state,
          value,
        })
      );
    },
    [cacheConfig, commitCachedRoutes]
  );

  const deleteCachedRoutes = useCallback(
    (keys: string[]) => {
      commitCachedRoutes((state) => {
        let changed = false;
        const newState = { ...state };
        for (const key of keys) {
          const normalizedKey = normalizeCachedRoutePathname(key);
          if (Object.hasOwn(newState, normalizedKey)) {
            Reflect.deleteProperty(newState, normalizedKey);
            changed = true;
          }
        }

        return changed ? newState : state;
      });
    },
    [commitCachedRoutes]
  );

  const touchCachedRoutes = useCallback(
    (keys: string[]) => {
      commitCachedRoutes((state) => {
        let changed = false;
        const touchedAt = Date.now();
        const nextState = { ...state };

        for (const key of keys) {
          const normalizedKey = normalizeCachedRoutePathname(key);
          const route = nextState[normalizedKey];

          if (!route || route.lastVisibleAt === touchedAt) {
            continue;
          }

          nextState[normalizedKey] = {
            ...route,
            lastVisibleAt: touchedAt,
          };
          changed = true;
        }

        return changed ? nextState : state;
      });
    },
    [commitCachedRoutes]
  );

  const retainErroredRoute = useCallback(
    (pathname: string) => {
      const normalizedPathname = normalizeCachedRoutePathname(pathname);

      setErroredRouteCounts((state) => ({
        ...state,
        [normalizedPathname]: (state[normalizedPathname] ?? 0) + 1,
      }));

      commitCachedRoutes((state) =>
        withoutCachedRoute(state, normalizedPathname)
      );
    },
    [commitCachedRoutes]
  );

  const releaseErroredRoute = useCallback((pathname: string) => {
    const normalizedPathname = normalizeCachedRoutePathname(pathname);

    setErroredRouteCounts((state) => {
      const currentCount = state[normalizedPathname] ?? 0;

      if (currentCount <= 1) {
        if (!Object.hasOwn(state, normalizedPathname)) {
          return state;
        }

        const nextState = { ...state };
        Reflect.deleteProperty(nextState, normalizedPathname);
        return nextState;
      }

      return {
        ...state,
        [normalizedPathname]: currentCount - 1,
      };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      cachedRoutes,
      erroredRouteCounts,
      setCachedRoutes: updateCachedRoutes,
      deleteCachedRoutes,
      touchCachedRoutes,
      retainErroredRoute,
      releaseErroredRoute,
    }),
    [
      cachedRoutes,
      deleteCachedRoutes,
      erroredRouteCounts,
      releaseErroredRoute,
      retainErroredRoute,
      touchCachedRoutes,
      updateCachedRoutes,
    ]
  );

  return (
    <RouterCacheContext.Provider value={contextValue}>
      {children}
    </RouterCacheContext.Provider>
  );
}

export function useRouterCacheContext() {
  const context = use(RouterCacheContext);
  if (!context) {
    throw new Error("RouterCacheContext is not available");
  }
  return context;
}

export function useOptionalRouterCacheContext() {
  return use(RouterCacheContext);
}
