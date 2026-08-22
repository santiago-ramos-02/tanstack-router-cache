/* oxlint-disable react/react-compiler -- This external route cache intentionally reads stable mutable refs during render to preserve cached element identity. */

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
import {
  getRouteCacheEffectMode,
  isCachedRouteStale,
  isRouteCacheEnabled,
} from "../route-cache-static-data";
import type { ActivityMode } from "../types";
import CachedOutlet from "./cached-outlet";
import OffScreen from "./off-screen";
import { shouldRestoreCachedHref } from "./restore-cached-href";

type RouterSnapshot = ComponentProps<typeof CachedOutlet>["routerSnapshot"];
type RouterLocation = ParsedLocation;
type RouterMatch = {
  [key: string]: unknown;
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
type MatchStore = SnapshotStore<RouterMatch | undefined>;
type RouterSnapshotInput = {
  matches: (RouterMatch | undefined)[];
  router: ReturnType<typeof useRouter>;
  routerLocation: RouterLocation;
  routerResolvedLocation?: RouterLocation;
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

function isRouterMatchValue(value: unknown): value is RouterMatch {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "id") === "string" &&
    typeof Reflect.get(value, "routeId") === "string"
  );
}

export function normalizeRouterMatches(value: unknown): RouterMatch[] {
  if (!Array.isArray(value)) {
    return [];
  }

  for (let index = 0; index < value.length; index += 1) {
    if (!isRouterMatchValue(value[index])) {
      return value.filter(isRouterMatchValue);
    }
  }

  return value as RouterMatch[];
}

function isRouterSnapshot(
  value: unknown
): value is NonNullable<RouterSnapshot> {
  return typeof value === "object" && value !== null;
}

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

function createSnapshotStore<T>(value: T) {
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
          : () => {},
      };
    },
  };
}

function createRouterSnapshotData({
  matches,
  router,
  routerLocation,
  routerResolvedLocation,
}: RouterSnapshotInput) {
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

function toRouterLocation(location: RouterLocation) {
  return { ...location };
}

function isReadyCachedRoute(route: ReadyCachedRoute | undefined) {
  return Boolean(
    route &&
    isRouteCacheEnabled(route.staticData) &&
    !isCachedRouteStale(route) &&
    route.ready &&
    route.rootRouteId &&
    route.routerSnapshot
  );
}

function hasErroredRouteMatch(matches: (RouterMatch | undefined)[]) {
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
  matches: (RouterMatch | undefined)[];
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
  matches: (RouterMatch | undefined)[];
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
  rootRouteId,
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
  rootRouteId?: string;
  matches: (RouterMatch | undefined)[];
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
  let routerSnapshot = rootRouteId ? route?.routerSnapshot : undefined;

  if (
    routerSnapshot &&
    !syncRouterSnapshot(routerSnapshot, routerSnapshotInput)
  ) {
    if (isCurrentUnmanagedCachedRoute(route, routerHref)) {
      return;
    }

    routerSnapshot = undefined;
  }

  if (rootRouteId && !routerSnapshot) {
    routerSnapshot = createRouterSnapshot(routerSnapshotInput);
  }

  setCachedRoutes(routerPathname, {
    href: routerHref,
    rootRouteId,
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
  rootRouteId,
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
  rootRouteId?: string;
  matches: (RouterMatch | undefined)[];
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
      rootRouteId,
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

function createRouterSnapshot(input: RouterSnapshotInput) {
  const { router, routerLocation, routerResolvedLocation } = input;
  const snapshotData = createRouterSnapshotData(input);
  const snapshotMatches = snapshotData.matches;
  const matchStores = new Map<string, MatchStore>(
    snapshotMatches.map((match) => [
      match.routeId,
      createSnapshotStore<RouterMatch | undefined>(match),
    ])
  );

  const stores = {
    status: createSnapshotStore(router.stores.status.get()),
    location: createSnapshotStore(routerLocation),
    resolvedLocation: createSnapshotStore(routerResolvedLocation),
    ids: createSnapshotStore(snapshotMatches.map((match) => match.routeId)),
    matches: createSnapshotStore(snapshotMatches),
    __store: createSnapshotStore(snapshotData.state),
    byRoute: matchStores,
    getMatchStore: (routeId: string) => {
      let cached = matchStores.get(routeId);

      if (!cached) {
        cached = createSnapshotStore<RouterMatch | undefined>(undefined);
        matchStores.set(routeId, cached);
      }

      return cached;
    },
    setMatches: () => {},
  };

  const updateSnapshot: RouterSnapshotUpdater = (nextInput) => {
    const nextData = createRouterSnapshotData(nextInput);
    const nextMatches = nextData.matches;
    const nextRouteIds = new Set(nextMatches.map((match) => match.routeId));

    for (const match of nextMatches) {
      const store = matchStores.get(match.routeId);

      if (store) {
        store.set(match);
        continue;
      }

      matchStores.set(
        match.routeId,
        createSnapshotStore<RouterMatch | undefined>(match)
      );
    }

    for (const routeId of matchStores.keys()) {
      if (!nextRouteIds.has(routeId)) {
        matchStores.delete(routeId);
      }
    }

    stores.status.set(nextInput.router.stores.status.get());
    stores.location.set(nextInput.routerLocation);
    stores.resolvedLocation.set(nextInput.routerResolvedLocation);
    stores.ids.set(nextMatches.map((match) => match.routeId));
    stores.matches.set(nextMatches);
    stores.__store.set(nextData.state);
  };

  const routerSnapshotCandidate: unknown = Object.create(router);
  if (!isRouterSnapshot(routerSnapshotCandidate)) {
    throw new TypeError("Unable to create the router cache snapshot.");
  }
  const routerSnapshot = routerSnapshotCandidate;
  Object.defineProperties(routerSnapshot, {
    stores: {
      value: stores,
    },
    latestLocation: {
      get: () => stores.location.get(),
    },
    ...getLiveRouterMethodDescriptors(router),
  });

  routerSnapshotUpdaters.set(routerSnapshot, updateSnapshot);

  return routerSnapshot;
}

function getRouterCacheStaticData(
  childMatches: (RouterMatch | undefined)[],
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
    .catch(() => {});
}

function renderCachedRoute({
  bypassCachedPathname,
  pathname,
  route,
  routerPathname,
}: {
  bypassCachedPathname?: string;
  pathname: string;
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string];
  routerPathname: string;
}) {
  if (pathname === bypassCachedPathname) {
    return null;
  }

  if (isCachedRouteStale(route)) {
    return null;
  }

  const content =
    route.rootRouteId && route.routerSnapshot ? (
      <CachedOutlet
        routeId={route.rootRouteId}
        routerSnapshot={route.routerSnapshot}
      />
    ) : null;

  if (!content) {
    return null;
  }

  return (
    <OffScreen
      effectMode={getRouteCacheEffectMode(route.staticData)}
      key={pathname}
      mode={routerPathname === pathname ? "visible" : "hidden"}
      pathname={pathname}
    >
      {content}
    </OffScreen>
  );
}

function getStaleCachedRoutePathnames(
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"]
) {
  const now = Date.now();

  return Object.entries(cachedRoutes).flatMap(([pathname, route]) =>
    isCachedRouteStale(route, now) ? [pathname] : []
  );
}

function buildRouteCacheModes(
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"],
  routerPathname: string
) {
  const nextModes = new Map<string, ActivityMode>();

  for (const pathname of Object.keys(cachedRoutes)) {
    nextModes.set(pathname, routerPathname === pathname ? "visible" : "hidden");
  }

  return nextModes;
}

function syncCachedRouteActivityEvents(params: {
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"];
  eventListener: ReturnType<typeof useEventListener>["eventListener"];
  previousRouteCacheModes: Map<string, ActivityMode>;
  routerPathname: string;
}) {
  const nextModes = buildRouteCacheModes(
    params.cachedRoutes,
    params.routerPathname
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

  const matches = normalizeRouterMatches(useMatches());
  const childMatches = normalizeRouterMatches(useChildMatches());
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

  const rootRouteId =
    isCurrentMatchResolved && outletRootMatch
      ? outletRootMatch.routeId
      : undefined;
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
  const shouldRestoreDestinationHref = shouldRestoreCachedHref({
    cachedHref: destinationRoute?.href,
    currentHref: routerHref,
    currentPathname: routerPathname,
    isRouteCacheEnabled: isRouteCacheEnabled(destinationRoute?.staticData),
    previousPathname,
  });

  useLayoutEffect(() => {
    const stalePathnames = getStaleCachedRoutePathnames(cachedRoutes);

    if (stalePathnames.length > 0) {
      deleteCachedRoutes(stalePathnames);
    }
  }, [cachedRoutes, deleteCachedRoutes]);

  useLayoutEffect(() => {
    if (shouldRestoreDestinationHref) {
      return;
    }

    syncCachedRouteState({
      isCurrentMatchReady,
      isCurrentMatchResolved,
      isCurrentRouteErrored,
      rootRouteId,
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
    rootRouteId,
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

    if (pendingNavigation && pendingNavigation.pathname !== routerPathname) {
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
  }, [destinationRoute, eventListener, routerPathname]);

  useLayoutEffect(() => {
    previousRouteCacheModesRef.current ??= new Map();

    previousRouteCacheModesRef.current = syncCachedRouteActivityEvents({
      cachedRoutes,
      eventListener,
      previousRouteCacheModes: previousRouteCacheModesRef.current,
      routerPathname,
    });
  }, [cachedRoutes, eventListener, routerPathname]);

  useLayoutEffect(() => {
    if (
      previousVisiblePathnameRef.current === routerPathname ||
      !cachedRoutes[routerPathname]
    ) {
      previousVisiblePathnameRef.current = routerPathname;
      return;
    }

    previousVisiblePathnameRef.current = routerPathname;
    touchCachedRoutes([routerPathname]);
  }, [cachedRoutes, touchCachedRoutes, routerPathname]);

  useEffect(() => {
    const pendingNavigation = pendingCachedNavigationRef.current;

    if (routerPathname !== pendingNavigation?.pathname) {
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
  }, [eventListener, routerPathname]);

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

  const shouldRenderLiveOutlet =
    routerPathname === bypassCachedPathname ||
    !isReadyCachedRoute(destinationRoute);

  useRouterCacheDebug(cachedRoutes, routerPathname);

  return (
    <>
      {Object.entries(cachedRoutes).map(([pathname, route]) =>
        renderCachedRoute({
          bypassCachedPathname,
          pathname,
          route,
          routerPathname,
        })
      )}
      {shouldRenderLiveOutlet ? (
        <Outlet key={`live-${routerPathname}`} />
      ) : null}
    </>
  );
}

export default RouteCacheManager;
