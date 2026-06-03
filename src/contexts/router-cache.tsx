import type {
  RouterContextProvider,
  StaticDataRouteOption,
} from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { createContext, use, useRef, useState } from "react";
import { normalizeCachedRoutePathname } from "../pathname";

type RouterCacheProviderProps = {
  cacheScopeKey?: string | number | null;
  children: ReactNode;
  defaultCachedRoutes?: CachedRoutes;
  maxEntries?: number;
  maxEntriesPerRouteId?: number;
};

type RouterSnapshot = ComponentProps<typeof RouterContextProvider>["router"];

export type CachedRouteData = {
  createdAt?: number;
  href?: string;
  lastVisibleAt?: number;
  routeId?: string;
  staticData: StaticDataRouteOption;
  matchId?: string;
  routerSnapshot?: RouterSnapshot;
  ready?: boolean;
};

export type CachedRoutes = {
  [key: string]: CachedRouteData;
};

export type RouterCacheContextState = {
  cachedRoutes: CachedRoutes;
  erroredRouteCounts: Record<string, number>;
  setCachedRoutes: (pathname: string, data: CachedRouteData) => void;
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

function isCacheEnabledRouteData(route: CachedRouteData | undefined) {
  return route?.staticData.routeCache === true;
}

function filterRouterCacheRoutes(routes: CachedRoutes) {
  return Object.fromEntries(
    Object.entries(routes).flatMap(([pathname, route]) =>
      isCacheEnabledRouteData(route)
        ? [[normalizeCachedRoutePathname(pathname), route] as const]
        : []
    )
  );
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
    current.matchId === next.matchId &&
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
    const routeId = entry[1].routeId;

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
    .sort(sortCachedRouteEntries);

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
    delete nextRoutes[pathname];
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
  value: CachedRouteData;
}) {
  const normalizedKey = normalizeCachedRoutePathname(params.key);

  if (params.cacheConfig.maxEntries === 0) {
    return params.state === EMPTY_CACHED_ROUTES
      ? params.state
      : EMPTY_CACHED_ROUTES;
  }

  if (!isCacheEnabledRouteData(params.value)) {
    if (!Object.hasOwn(params.state, normalizedKey)) {
      return params.state;
    }

    const nextState = { ...params.state };
    delete nextState[normalizedKey];
    return nextState;
  }

  const nextRouteData = createCachedRouteData(
    params.state[normalizedKey],
    params.value
  );

  if (isSameCachedRouteData(params.state[normalizedKey], nextRouteData)) {
    return params.state;
  }

  return applyCachedRouteLimits(
    { ...params.state, [normalizedKey]: nextRouteData },
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
  const cacheConfigRef = useRef<RouterCacheConfig>({
    maxEntries: normalizeLimit(maxEntries),
    maxEntriesPerRouteId: normalizeLimit(maxEntriesPerRouteId),
  });
  const initialCachedRoutesRef = useRef<CachedRoutes | null>(null);
  if (initialCachedRoutesRef.current === null) {
    initialCachedRoutesRef.current = applyCachedRouteLimits(
      filterRouterCacheRoutes(defaultCachedRoutes),
      cacheConfigRef.current,
      new Set()
    );
  }
  const [cachedRoutes, setCachedRoutes] = useState<CachedRoutes>(
    () => initialCachedRoutesRef.current ?? EMPTY_CACHED_ROUTES
  );
  const [erroredRouteCounts, setErroredRouteCounts] = useState<
    Record<string, number>
  >({});

  const updateCachedRoutes = (key: string, value: CachedRouteData) => {
    setCachedRoutes((state) =>
      getNextCachedRoutesState({
        cacheConfig: cacheConfigRef.current,
        key,
        state,
        value,
      })
    );
  };

  const deleteCachedRoutes = (keys: string[]) => {
    setCachedRoutes((state) => {
      let changed = false;
      const newState = { ...state };
      for (const key of keys) {
        const normalizedKey = normalizeCachedRoutePathname(key);
        if (Object.hasOwn(newState, normalizedKey)) {
          delete newState[normalizedKey];
          changed = true;
        }
      }

      return changed ? newState : state;
    });
  };

  const touchCachedRoutes = (keys: string[]) => {
    setCachedRoutes((state) => {
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
  };

  const retainErroredRoute = (pathname: string) => {
    const normalizedPathname = normalizeCachedRoutePathname(pathname);

    setErroredRouteCounts((state) => ({
      ...state,
      [normalizedPathname]: (state[normalizedPathname] ?? 0) + 1,
    }));

    setCachedRoutes((state) => {
      if (!Object.hasOwn(state, normalizedPathname)) {
        return state;
      }

      const nextState = { ...state };
      delete nextState[normalizedPathname];
      return nextState;
    });
  };

  const releaseErroredRoute = (pathname: string) => {
    const normalizedPathname = normalizeCachedRoutePathname(pathname);

    setErroredRouteCounts((state) => {
      const currentCount = state[normalizedPathname] ?? 0;

      if (currentCount <= 1) {
        if (!Object.hasOwn(state, normalizedPathname)) {
          return state;
        }

        const nextState = { ...state };
        delete nextState[normalizedPathname];
        return nextState;
      }

      return {
        ...state,
        [normalizedPathname]: currentCount - 1,
      };
    });
  };

  const contextValue = {
    cachedRoutes,
    erroredRouteCounts,
    setCachedRoutes: updateCachedRoutes,
    deleteCachedRoutes,
    touchCachedRoutes,
    retainErroredRoute,
    releaseErroredRoute,
  };

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
