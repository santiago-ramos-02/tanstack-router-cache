import type {
  ParsedLocation,
  StaticDataRouteOption,
} from "@tanstack/react-router";
import {
  Outlet,
  useChildMatches,
  useMatches,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouterCacheContext } from "../contexts/router-cache";
import { useEventListener } from "../hooks/use-event-listener";
import { useRouterCacheDebug } from "../hooks/use-router-cache-debug";
import { normalizeCachedRoutePathname } from "../pathname";
import type { ActivityMode } from "../types";
import CachedOutlet from "./cached-outlet";
import OffScreen from "./off-screen";
import { shouldRestoreCachedHref } from "./restore-cached-href";

type RouterSnapshot = ComponentProps<typeof CachedOutlet>["routerSnapshot"];
type RouterLocation = ParsedLocation;
type RouterMatch = ReturnType<typeof useMatches>[number] & {
  _nonReactive?: Record<string, unknown>;
  id: string;
  pathname?: string;
  routeId: string;
  staticData?: StaticDataRouteOption;
  status?: string;
};
type RouterStore<T> = {
  get: () => T;
  subscribe: (listener?: (value: T) => void) => {
    unsubscribe: () => void;
  };
};
type SnapshotStore<T> = RouterStore<T> & {
  set: (value: T) => void;
};
type MatchStore = SnapshotStore<RouterMatch> & {
  routeId: string;
};
type RouterSnapshotInput = {
  matches: Array<RouterMatch | undefined>;
  router: ReturnType<typeof useRouter>;
  routerLocation: RouterLocation;
  routerResolvedLocation?: RouterLocation;
};
type RouterSnapshotData = {
  matches: RouterMatch[];
  state: ReturnType<
    ReturnType<typeof useRouter>["stores"]["__store"]["get"]
  > & {
    location: RouterLocation;
    matches: RouterMatch[];
    resolvedLocation?: RouterLocation;
  };
};
type RouterSnapshotUpdater = (input: RouterSnapshotInput) => void;
type SetCachedRoutes = ReturnType<
  typeof useRouterCacheContext
>["setCachedRoutes"];
type DeleteCachedRoutes = ReturnType<
  typeof useRouterCacheContext
>["deleteCachedRoutes"];
type ReadyCachedRoute = ReturnType<
  typeof useRouterCacheContext
>["cachedRoutes"][string];
type PendingCachedNavigation = {
  pathname: string;
  startedAt: number;
};

const LIVE_ROUTER_METHODS = [
  "buildLocation",
  "commitLocation",
  "invalidate",
  "loadRouteChunk",
  "navigate",
  "preloadRoute",
] as const;

const routerSnapshotUpdaters = new WeakMap<
  NonNullable<RouterSnapshot>,
  RouterSnapshotUpdater
>();

function createSnapshotStore<T>(value: T): SnapshotStore<T> {
  let currentValue = value;
  const listeners = new Set<(value: T) => void>();

  return {
    get: () => currentValue,
    set: (nextValue: T) => {
      if (Object.is(currentValue, nextValue)) {
        return;
      }

      currentValue = nextValue;

      for (const listener of listeners) {
        listener(currentValue);
      }
    },
    subscribe: (listener?: (value: T) => void) => {
      if (listener) {
        listeners.add(listener);
      }

      return {
        unsubscribe: listener
          ? () => {
              listeners.delete(listener);
            }
          : () => undefined,
      };
    },
  };
}

function createRouterSnapshotData({
  matches,
  router,
  routerLocation,
  routerResolvedLocation,
}: RouterSnapshotInput): RouterSnapshotData {
  const snapshotMatches = matches.reduce<RouterMatch[]>((snapshot, match) => {
    const nextMatch = snapshotMatch(match, routerLocation);

    if (isRouterMatch(nextMatch)) {
      snapshot.push(nextMatch);
    }

    return snapshot;
  }, []);

  return {
    matches: snapshotMatches,
    state: {
      ...router.stores.__store.get(),
      matches: snapshotMatches,
      location: routerLocation,
      resolvedLocation: routerResolvedLocation,
    },
  };
}

function createMatchStore(match: RouterMatch): MatchStore {
  return Object.assign(createSnapshotStore(match), {
    routeId: match.routeId,
  });
}

function syncRouterSnapshot(
  routerSnapshot: NonNullable<RouterSnapshot>,
  input: RouterSnapshotInput
) {
  const update = routerSnapshotUpdaters.get(routerSnapshot);

  if (!update) {
    return false;
  }

  update(input);
  return true;
}

function getLiveRouterMethodDescriptors(router: ReturnType<typeof useRouter>) {
  return Object.fromEntries(
    LIVE_ROUTER_METHODS.flatMap((methodName) => {
      const method = router[methodName];

      if (typeof method !== "function") {
        return [];
      }

      return [
        [
          methodName,
          {
            value: method.bind(router),
          },
        ],
      ];
    })
  );
}

function toRouterLocation(location: RouterLocation): RouterLocation {
  return { ...location };
}

function isReadyCachedRoute(route: ReadyCachedRoute | undefined) {
  return Boolean(
    route &&
      isRouteCacheEnabled(route.staticData) &&
      route.ready &&
      route.matchId &&
      route.routerSnapshot
  );
}

function isRouteCacheEnabled(staticData: StaticDataRouteOption | undefined) {
  return staticData?.routeCache === true;
}

function hasErroredRouteMatch(matches: Array<RouterMatch | undefined>) {
  return matches.some((match) => match?.status === "error");
}

function hasRetainedRouteError(
  erroredRouteCounts: ReturnType<
    typeof useRouterCacheContext
  >["erroredRouteCounts"],
  pathname: string
) {
  return (erroredRouteCounts[pathname] ?? 0) > 0;
}

function hasCurrentRouterMatchError({
  matches,
  resolvedPathname,
  routerPathname,
}: {
  matches: Array<RouterMatch | undefined>;
  resolvedPathname: string;
  routerPathname: string;
}) {
  return routerPathname === resolvedPathname && hasErroredRouteMatch(matches);
}

function hasCurrentRouteError({
  erroredRouteCounts,
  matches,
  resolvedPathname,
  routerPathname,
}: {
  erroredRouteCounts: ReturnType<
    typeof useRouterCacheContext
  >["erroredRouteCounts"];
  matches: Array<RouterMatch | undefined>;
  resolvedPathname: string;
  routerPathname: string;
}) {
  return (
    hasRetainedRouteError(erroredRouteCounts, routerPathname) ||
    hasCurrentRouterMatchError({ matches, resolvedPathname, routerPathname })
  );
}

function isRouterMatch(match: RouterMatch | undefined): match is RouterMatch {
  return Boolean(match?.id && match.routeId);
}

function snapshotMatch(
  match: RouterMatch | undefined,
  routerLocation: RouterLocation
): RouterMatch | undefined {
  if (!isRouterMatch(match)) {
    return;
  }

  const isLocationMatch = match.pathname
    ? normalizeCachedRoutePathname(match.pathname) ===
      normalizeCachedRoutePathname(routerLocation.pathname)
    : false;

  return {
    ...match,
    ...(isLocationMatch
      ? {
          _strictSearch: routerLocation.search,
          search: routerLocation.search,
        }
      : {}),
    _nonReactive: {
      ...match._nonReactive,
    },
  };
}

function isCurrentUnmanagedCachedRoute(
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string],
  routerHref?: string
) {
  return Boolean(
    route &&
      isRouteCacheEnabled(route.staticData) &&
      route.ready &&
      route.routerSnapshot &&
      route.href === routerHref
  );
}

function syncReadyCachedRoute({
  matchId,
  matches,
  routeId,
  route,
  routerLocation,
  router,
  routerResolvedLocation,
  routerHref,
  routerPathname,
  setCachedRoutes,
  staticData,
}: {
  matchId?: string;
  matches: Array<RouterMatch | undefined>;
  routeId?: string;
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string];
  routerLocation: RouterLocation;
  router: ReturnType<typeof useRouter>;
  routerResolvedLocation?: RouterLocation;
  routerHref?: string;
  routerPathname: string;
  setCachedRoutes: SetCachedRoutes;
  staticData: StaticDataRouteOption;
}) {
  const routerSnapshotInput = {
    matches,
    router,
    routerLocation,
    routerResolvedLocation,
  };
  let routerSnapshot = matchId ? route?.routerSnapshot : undefined;

  if (
    routerSnapshot &&
    !syncRouterSnapshot(routerSnapshot, routerSnapshotInput)
  ) {
    if (isCurrentUnmanagedCachedRoute(route, routerHref)) {
      return;
    }

    routerSnapshot = undefined;
  }

  if (matchId && !routerSnapshot) {
    routerSnapshot = createRouterSnapshot(routerSnapshotInput);
  }

  setCachedRoutes(routerPathname, {
    href: routerHref,
    matchId,
    routeId,
    ready: true,
    routerSnapshot,
    staticData,
  });
}

function syncCachedRouteState({
  isCurrentMatchReady,
  isCurrentMatchResolved,
  deleteCachedRoutes,
  isCurrentRouteErrored,
  matchId,
  matches,
  route,
  routeId,
  router,
  routerHref,
  routerLocation,
  routerPathname,
  routerResolvedLocation,
  setCachedRoutes,
  staticData,
}: {
  isCurrentMatchReady: boolean;
  isCurrentMatchResolved: boolean;
  isCurrentRouteErrored: boolean;
  matchId?: string;
  matches: Array<RouterMatch | undefined>;
  routeId?: string;
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string];
  routerLocation: RouterLocation;
  router: ReturnType<typeof useRouter>;
  routerResolvedLocation?: RouterLocation;
  routerHref?: string;
  routerPathname: string;
  deleteCachedRoutes: DeleteCachedRoutes;
  setCachedRoutes: SetCachedRoutes;
  staticData?: StaticDataRouteOption;
}) {
  if (isCurrentRouteErrored) {
    if (route) {
      deleteCachedRoutes([routerPathname]);
    }

    return;
  }

  if (!isCurrentMatchResolved) {
    return;
  }

  if (staticData && isRouteCacheEnabled(staticData)) {
    if (!isCurrentMatchReady) {
      return;
    }

    syncReadyCachedRoute({
      matchId,
      matches,
      routeId,
      route,
      routerLocation,
      router,
      routerResolvedLocation,
      routerHref,
      routerPathname,
      setCachedRoutes,
      staticData,
    });
    return;
  }

  if (route) {
    deleteCachedRoutes([routerPathname]);
  }
}

function createRouterSnapshot(input: RouterSnapshotInput): RouterSnapshot {
  const { router, routerLocation, routerResolvedLocation } = input;
  const snapshotData = createRouterSnapshotData(input);
  const snapshotMatches = snapshotData.matches;
  const matchStores = new Map<string, MatchStore>(
    snapshotMatches.map((match) => [match.id, createMatchStore(match)])
  );

  const routeMatchStoreCache = new Map<
    string,
    SnapshotStore<RouterMatch | undefined>
  >();

  const stores = {
    ...router.stores,
    status: createSnapshotStore(router.stores.status.get()),
    loadedAt: createSnapshotStore(router.stores.loadedAt.get()),
    isLoading: createSnapshotStore(router.stores.isLoading.get()),
    isTransitioning: createSnapshotStore(router.stores.isTransitioning.get()),
    location: createSnapshotStore(routerLocation),
    resolvedLocation: createSnapshotStore(routerResolvedLocation),
    statusCode: createSnapshotStore(router.stores.statusCode.get()),
    redirect: createSnapshotStore(router.stores.redirect.get()),
    matchesId: createSnapshotStore(snapshotMatches.map((match) => match.id)),
    pendingIds: createSnapshotStore<string[]>([]),
    cachedIds: createSnapshotStore<string[]>([]),
    matches: createSnapshotStore(snapshotMatches),
    pendingMatches: createSnapshotStore<RouterMatch[]>([]),
    cachedMatches: createSnapshotStore<RouterMatch[]>([]),
    firstId: createSnapshotStore(snapshotMatches[0]?.id),
    hasPending: createSnapshotStore(
      snapshotMatches.some((match) => match.status === "pending")
    ),
    matchRouteDeps: createSnapshotStore({
      locationHref: routerLocation.href,
      resolvedLocationHref: routerResolvedLocation?.href,
      status: snapshotData.state.status,
    }),
    __store: createSnapshotStore(snapshotData.state),
    matchStores,
    pendingMatchStores: new Map(),
    cachedMatchStores: new Map(),
    getRouteMatchStore: (routeId: string) => {
      let cached = routeMatchStoreCache.get(routeId);
      if (!cached) {
        cached = createSnapshotStore(
          snapshotMatches.find((match) => match.routeId === routeId)
        );
        routeMatchStoreCache.set(routeId, cached);
      }
      return cached;
    },
    setMatches: () => undefined,
    setPending: () => undefined,
    setCached: () => undefined,
  };

  const updateSnapshot: RouterSnapshotUpdater = (nextInput) => {
    const nextData = createRouterSnapshotData(nextInput);
    const nextMatches = nextData.matches;
    const nextMatchIds = new Set(nextMatches.map((match) => match.id));
    const nextMatchesByRouteId = new Map(
      nextMatches.map((match) => [match.routeId, match])
    );

    for (const match of nextMatches) {
      const store = matchStores.get(match.id);

      if (store) {
        store.set(match);
        continue;
      }

      matchStores.set(match.id, createMatchStore(match));
    }

    for (const [matchId] of matchStores) {
      if (!nextMatchIds.has(matchId)) {
        matchStores.delete(matchId);
      }
    }

    stores.status.set(nextInput.router.stores.status.get());
    stores.loadedAt.set(nextInput.router.stores.loadedAt.get());
    stores.isLoading.set(nextInput.router.stores.isLoading.get());
    stores.isTransitioning.set(nextInput.router.stores.isTransitioning.get());
    stores.location.set(nextInput.routerLocation);
    stores.resolvedLocation.set(nextInput.routerResolvedLocation);
    stores.statusCode.set(nextInput.router.stores.statusCode.get());
    stores.redirect.set(nextInput.router.stores.redirect.get());
    stores.matchesId.set(nextMatches.map((match) => match.id));
    stores.pendingIds.set([]);
    stores.cachedIds.set([]);
    stores.matches.set(nextMatches);
    stores.pendingMatches.set([]);
    stores.cachedMatches.set([]);
    stores.firstId.set(nextMatches[0]?.id);
    stores.hasPending.set(
      nextMatches.some((match) => match.status === "pending")
    );
    stores.matchRouteDeps.set({
      locationHref: nextInput.routerLocation.href,
      resolvedLocationHref: nextInput.routerResolvedLocation?.href,
      status: nextData.state.status,
    });
    stores.__store.set(nextData.state);

    for (const [routeId, store] of routeMatchStoreCache) {
      store.set(nextMatchesByRouteId.get(routeId));
    }
  };

  const routerSnapshot: RouterSnapshot = Object.create(router);
  Object.defineProperties(routerSnapshot, {
    stores: {
      value: stores,
    },
    latestLocation: {
      get: () => stores.location.get(),
    },
    getMatch: {
      value: (matchId: string) => matchStores.get(matchId)?.get(),
    },
    updateMatch: {
      value: () => undefined,
    },
    ...getLiveRouterMethodDescriptors(router),
  });

  routerSnapshotUpdaters.set(routerSnapshot, updateSnapshot);

  return routerSnapshot;
}

function getRouterCacheStaticData(
  childMatches: Array<RouterMatch | undefined>,
  isCurrentMatchResolved: boolean
) {
  if (!isCurrentMatchResolved) {
    return;
  }

  for (let i = childMatches.length - 1; i >= 0; i--) {
    const match = childMatches[i];
    if (match?.staticData && isRouteCacheEnabled(match.staticData)) {
      return match.staticData;
    }
  }
}

function restoreCachedHref(router: ReturnType<typeof useRouter>, href: string) {
  router
    .navigate({
      href,
      replace: true,
      resetScroll: false,
    })
    .catch(() => undefined);
}

function isAncestorPathname(ancestorPathname: string, pathname: string) {
  if (ancestorPathname === pathname) {
    return false;
  }

  if (ancestorPathname === "/") {
    return pathname.startsWith("/");
  }

  return pathname.startsWith(`${ancestorPathname}/`);
}

function getShouldRenderLiveOutlet({
  cachedRoutes,
  bypassCachedPathname,
  visiblePathname,
}: {
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"];
  bypassCachedPathname?: string;
  visiblePathname: string;
}) {
  if (visiblePathname === bypassCachedPathname) {
    return true;
  }

  const visibleRoute = cachedRoutes[visiblePathname];
  return !isReadyCachedRoute(visibleRoute);
}

function renderCachedRoute({
  bypassCachedPathname,
  pathname,
  route,
  visiblePathname,
}: {
  bypassCachedPathname?: string;
  pathname: string;
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string];
  visiblePathname: string;
}) {
  if (pathname === bypassCachedPathname) {
    return null;
  }

  const content =
    route.matchId && route.routerSnapshot ? (
      <CachedOutlet
        matchId={route.matchId}
        routerSnapshot={route.routerSnapshot}
      />
    ) : null;

  if (!content) {
    return null;
  }

  return (
    <OffScreen
      key={pathname}
      mode={visiblePathname === pathname ? "visible" : "hidden"}
      pathname={pathname}
    >
      {content}
    </OffScreen>
  );
}

function buildRouteCacheModes(
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"],
  visiblePathname: string
) {
  const nextModes = new Map<string, ActivityMode>();

  for (const pathname of Object.keys(cachedRoutes)) {
    nextModes.set(
      pathname,
      visiblePathname === pathname ? "visible" : "hidden"
    );
  }

  return nextModes;
}

function syncCachedRouteActivityEvents(params: {
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"];
  eventListener: ReturnType<typeof useEventListener>["eventListener"];
  previousRouteCacheModes: Map<string, ActivityMode>;
  visiblePathname: string;
}) {
  const nextModes = buildRouteCacheModes(
    params.cachedRoutes,
    params.visiblePathname
  );

  for (const [pathname, mode] of nextModes) {
    const previousMode = params.previousRouteCacheModes.get(pathname);

    if (previousMode === undefined && mode === "hidden") {
      continue;
    }

    if (previousMode === mode) {
      continue;
    }

    params.eventListener.emit("activeChange", {
      pathname,
      mode,
    });
  }

  for (const [pathname] of params.previousRouteCacheModes) {
    if (nextModes.has(pathname)) {
      continue;
    }

    params.eventListener.emit("activeChange", {
      pathname,
      mode: "hidden",
    });
  }

  return nextModes;
}

function RouteCacheManager() {
  const {
    cachedRoutes,
    deleteCachedRoutes,
    erroredRouteCounts,
    setCachedRoutes,
    touchCachedRoutes,
  } = useRouterCacheContext();
  const { eventListener } = useEventListener();
  const pendingCachedNavigationRef = useRef<PendingCachedNavigation | null>(
    null
  );
  const previousPathnameRef = useRef<string | undefined>(undefined);
  const previousHrefRef = useRef<string | undefined>(undefined);
  const previousRouteCacheModesRef = useRef<Map<string, ActivityMode> | null>(
    null
  );
  previousRouteCacheModesRef.current ??= new Map();
  const previousVisiblePathnameRef = useRef<string | undefined>(undefined);

  const routerLocation = useRouterState({
    select: (state) => toRouterLocation(state.location),
  });
  const routerHref = routerLocation.href;
  const routerPathname = normalizeCachedRoutePathname(routerLocation.pathname);
  const routerResolvedLocation = useRouterState({
    select: (state) =>
      state.resolvedLocation
        ? toRouterLocation(state.resolvedLocation)
        : undefined,
  });
  const resolvedPathname = normalizeCachedRoutePathname(
    routerResolvedLocation?.pathname ?? routerPathname
  );
  const destinationRoute = cachedRoutes[routerPathname];
  const visiblePathname =
    routerPathname !== resolvedPathname &&
    (isReadyCachedRoute(destinationRoute) ||
      isAncestorPathname(routerPathname, resolvedPathname))
      ? routerPathname
      : resolvedPathname;

  const matches = useMatches();
  const childMatches = useChildMatches();
  const router = useRouter();
  const currentMatch = matches.length ? matches.at(-1) : undefined;
  const outletRootMatch = childMatches.length ? childMatches[0] : currentMatch;
  const currentMatchPathname = currentMatch?.pathname
    ? normalizeCachedRoutePathname(currentMatch.pathname)
    : undefined;
  const isCurrentMatchResolved = currentMatchPathname === routerPathname;
  const isCurrentMatchReady =
    isCurrentMatchResolved && currentMatch?.status === "success";
  const staticData = getRouterCacheStaticData(
    childMatches,
    isCurrentMatchResolved
  );

  const matchId =
    isCurrentMatchResolved && outletRootMatch ? outletRootMatch.id : undefined;
  const routeId =
    isCurrentMatchResolved && outletRootMatch
      ? outletRootMatch.routeId
      : undefined;

  const currentCachedRoute = cachedRoutes[routerPathname];
  const isCurrentRouteErrored = hasCurrentRouteError({
    erroredRouteCounts,
    matches,
    resolvedPathname,
    routerPathname,
  });
  const bypassCachedPathname = isCurrentRouteErrored
    ? routerPathname
    : undefined;
  const previousPathname = previousPathnameRef.current;
  const _previousHref = previousHrefRef.current;
  const shouldRestoreDestinationHref = shouldRestoreCachedHref({
    cachedHref: destinationRoute?.href,
    currentHref: routerHref,
    currentPathname: routerPathname,
    isRouteCacheEnabled: isRouteCacheEnabled(destinationRoute?.staticData),
    previousPathname,
  });

  useLayoutEffect(() => {
    if (shouldRestoreDestinationHref) {
      return;
    }

    syncCachedRouteState({
      isCurrentMatchReady,
      isCurrentMatchResolved,
      isCurrentRouteErrored,
      matchId,
      matches,
      routeId,
      route: currentCachedRoute,
      routerLocation,
      router,
      routerResolvedLocation,
      routerHref,
      routerPathname,
      deleteCachedRoutes,
      setCachedRoutes,
      staticData,
    });
  }, [
    currentCachedRoute,
    deleteCachedRoutes,
    isCurrentRouteErrored,
    isCurrentMatchReady,
    isCurrentMatchResolved,
    matchId,
    matches,
    routeId,
    router,
    routerLocation,
    routerResolvedLocation,
    routerHref,
    routerPathname,
    staticData,
    setCachedRoutes,
    shouldRestoreDestinationHref,
  ]);

  useLayoutEffect(() => {
    const lastVisitedPathname = previousPathnameRef.current;
    const pendingNavigation = pendingCachedNavigationRef.current;

    if (
      pendingNavigation &&
      pendingNavigation.pathname !== routerPathname &&
      visiblePathname !== pendingNavigation.pathname
    ) {
      eventListener.emit("cachedNavigationCancel", pendingNavigation);
      pendingCachedNavigationRef.current = null;
    }

    if (!lastVisitedPathname || lastVisitedPathname === routerPathname) {
      return;
    }

    if (!isReadyCachedRoute(destinationRoute)) {
      return;
    }

    if (pendingCachedNavigationRef.current?.pathname === routerPathname) {
      return;
    }

    const nextNavigation = {
      pathname: routerPathname,
      startedAt: performance.now(),
    };

    pendingCachedNavigationRef.current = nextNavigation;
    eventListener.emit("cachedNavigationStart", nextNavigation);
  }, [destinationRoute, eventListener, routerPathname, visiblePathname]);

  useLayoutEffect(() => {
    previousRouteCacheModesRef.current ??= new Map();

    previousRouteCacheModesRef.current = syncCachedRouteActivityEvents({
      cachedRoutes,
      eventListener,
      previousRouteCacheModes: previousRouteCacheModesRef.current,
      visiblePathname,
    });
  }, [cachedRoutes, eventListener, visiblePathname]);

  useLayoutEffect(() => {
    if (
      previousVisiblePathnameRef.current === visiblePathname ||
      !cachedRoutes[visiblePathname]
    ) {
      previousVisiblePathnameRef.current = visiblePathname;
      return;
    }

    previousVisiblePathnameRef.current = visiblePathname;
    touchCachedRoutes([visiblePathname]);
  }, [cachedRoutes, touchCachedRoutes, visiblePathname]);

  useEffect(() => {
    const pendingNavigation = pendingCachedNavigationRef.current;

    if (visiblePathname !== pendingNavigation?.pathname) {
      return;
    }

    let firstFrameId = 0;
    let secondFrameId = 0;

    firstFrameId = globalThis.requestAnimationFrame(() => {
      const visibleAt = performance.now();

      secondFrameId = globalThis.requestAnimationFrame(() => {
        const paintedAt = performance.now();

        if (
          pendingCachedNavigationRef.current?.pathname !==
          pendingNavigation.pathname
        ) {
          return;
        }

        pendingCachedNavigationRef.current = null;
        eventListener.emit("cachedNavigationComplete", {
          ...pendingNavigation,
          duration: paintedAt - pendingNavigation.startedAt,
          paintedAt,
          visibleAt,
        });
      });
    });

    return () => {
      globalThis.cancelAnimationFrame(firstFrameId);
      globalThis.cancelAnimationFrame(secondFrameId);
    };
  }, [eventListener, visiblePathname]);

  useLayoutEffect(() => {
    if (!(shouldRestoreDestinationHref && destinationRoute?.href)) {
      return;
    }

    restoreCachedHref(router, destinationRoute.href);
  }, [destinationRoute?.href, router, shouldRestoreDestinationHref]);

  useEffect(() => {
    previousPathnameRef.current = routerPathname;
    previousHrefRef.current = routerHref;
  }, [routerHref, routerPathname]);

  const shouldRenderLiveOutlet = getShouldRenderLiveOutlet({
    cachedRoutes,
    bypassCachedPathname,
    visiblePathname,
  });

  useRouterCacheDebug(cachedRoutes, visiblePathname);

  return (
    <>
      {Object.entries(cachedRoutes).map(([pathname, route]) =>
        renderCachedRoute({
          bypassCachedPathname,
          pathname,
          route,
          visiblePathname,
        })
      )}
      {shouldRenderLiveOutlet ? (
        <Outlet key={`live-${routerPathname}`} />
      ) : null}
    </>
  );
}

export default RouteCacheManager;
