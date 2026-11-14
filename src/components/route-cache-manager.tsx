/* oxlint-disable react/react-compiler -- This external route cache intentionally reads stable mutable refs during render to preserve cached element identity. */

import type {
  ParsedLocation,
  RouterEvents,
  StaticDataRouteOption,
} from "@tanstack/react-router";
import {
  Outlet,
  replaceEqualDeep,
  useChildMatches,
  useMatches,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import type { ComponentProps } from "react";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useRouterCacheContext } from "../contexts/router-cache";
import { useEventListener } from "../hooks/use-event-listener";
import { useRouterCacheDebug } from "../hooks/use-router-cache-debug";
import { normalizeCachedRoutePathname } from "../pathname";
import {
  getRouteCacheEffectMode,
  isCachedRouteStale,
  isRouteCacheEnabled,
} from "../route-cache-static-data";
import type { ActivityMode, RouteCacheEffectMode } from "../types";
import type CachedOutlet from "./cached-outlet";
import CachedRouteView from "./cached-route-view";
import { shouldRestoreCachedHref } from "./restore-cached-href";

type RouterSnapshot = ComponentProps<typeof CachedOutlet>["routerSnapshot"];
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
  routerLocation: ParsedLocation;
  routerResolvedLocation?: ParsedLocation;
};
type RouterSnapshotUpdater = (input: RouterSnapshotInput) => void;
type SetCachedRoutes = ReturnType<
  typeof useRouterCacheContext
>["setCachedRoutes"];
type ReadyCachedRoute = ReturnType<
  typeof useRouterCacheContext
>["cachedRoutes"][string];
type PendingCachedNavigation = {
  pathname: string;
  startedAt: number;
};
type FirstVisit = {
  effectMode: RouteCacheEffectMode;
  pathname: string;
  rootRouteId: string;
};
type EnteringRoute = FirstVisit & {
  routerSnapshot: NonNullable<RouterSnapshot>;
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

// Load bookkeeping the router renews on every navigation, even when the
// route's data does not change.
const MATCH_LOAD_BOOKKEEPING = new Set([
  "_nonReactive",
  "abortController",
  "updatedAt",
]);

/**
 * The match a snapshot publishes for `next`. What did not change keeps its
 * identity, as in the router's own structural sharing, and a match whose data
 * did not change stays the same object, carrying the latest load bookkeeping
 * without publishing a change. TanStack Router's `Match` renders its route
 * again for every new match object, and a runtime without React's bailout on
 * an element it already rendered (TanStack Redact) then renders the whole
 * route: revealing a retained route would render all of it.
 */
function shareSnapshotMatch(
  previous: RouterMatch | undefined,
  next: RouterMatch
) {
  if (!previous) {
    return next;
  }

  const shared = { ...next };
  let changed = Object.keys(previous).length !== Object.keys(next).length;

  for (const key of Object.keys(next)) {
    if (!MATCH_LOAD_BOOKKEEPING.has(key)) {
      shared[key] = replaceEqualDeep(previous[key], next[key]);
      changed ||= shared[key] !== previous[key];
    }
  }

  if (changed) {
    return shared;
  }

  for (const key of MATCH_LOAD_BOOKKEEPING) {
    if (key in next) {
      previous[key] = next[key];
    }
  }

  return previous;
}

function hasSameItems<T>(previous: readonly T[], next: readonly T[]) {
  return (
    previous.length === next.length &&
    previous.every((item, index) => item === next[index])
  );
}

function createRouterSnapshotData(
  {
    matches,
    router,
    routerLocation,
    routerResolvedLocation,
  }: RouterSnapshotInput,
  previousMatches: RouterMatch[] = []
) {
  const previousByRoute = new Map(
    previousMatches.map((match) => [match.routeId, match])
  );
  const nextMatches = matches.reduce<RouterMatch[]>((snapshot, match) => {
    const nextMatch = snapshotMatch(match, routerLocation);

    if (isRouterMatch(nextMatch)) {
      snapshot.push(
        shareSnapshotMatch(previousByRoute.get(nextMatch.routeId), nextMatch)
      );
    }

    return snapshot;
  }, []);
  const snapshotMatches = hasSameItems(previousMatches, nextMatches)
    ? previousMatches
    : nextMatches;

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
  routerLocation: ParsedLocation
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
  enteringSnapshot,
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
  enteringSnapshot?: RouterSnapshot;
  rootRouteId?: string;
  matches: (RouterMatch | undefined)[];
  routeId?: string;
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string];
  routerLocation: ParsedLocation;
  router: ReturnType<typeof useRouter>;
  routerResolvedLocation?: ParsedLocation;
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
  // A first visit already renders in its retained view; storing that view's
  // snapshot keeps it mounted.
  let routerSnapshot = rootRouteId
    ? (route?.routerSnapshot ?? enteringSnapshot)
    : undefined;

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
  enteringSnapshot,
  isCurrentMatchReady,
  isCurrentMatchResolved,
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
  enteringSnapshot?: RouterSnapshot;
  isCurrentMatchReady: boolean;
  isCurrentMatchResolved: boolean;
  isCurrentRouteErrored: boolean;
  rootRouteId?: string;
  matches: (RouterMatch | undefined)[];
  routeId?: string;
  route: ReturnType<typeof useRouterCacheContext>["cachedRoutes"][string];
  routerLocation: ParsedLocation;
  router: ReturnType<typeof useRouter>;
  routerResolvedLocation?: ParsedLocation;
  routerHref?: string;
  routerPathname: string;
  setCachedRoutes: SetCachedRoutes;
  staticData?: StaticDataRouteOption;
}) {
  if (isCurrentRouteErrored) {
    if (route) {
      setCachedRoutes(routerPathname, undefined);
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
      enteringSnapshot,
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
    setCachedRoutes(routerPathname, undefined);
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
    const nextData = createRouterSnapshotData(nextInput, stores.matches.get());
    const nextMatches = nextData.matches;
    const nextIds = nextMatches.map((match) => match.routeId);
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
    if (!hasSameItems(stores.ids.get(), nextIds)) {
      stores.ids.set(nextIds);
    }
    stores.matches.set(nextMatches);
    stores.__store.set(nextData.state);
  };

  const routerSnapshot: unknown = Object.create(router);
  if (!isRouterSnapshot(routerSnapshot)) {
    throw new TypeError("Unable to create the router cache snapshot.");
  }
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

  if (!route.rootRouteId || !route.routerSnapshot) {
    return null;
  }

  return (
    <CachedRouteView
      effectMode={getRouteCacheEffectMode(route.staticData)}
      key={pathname}
      mode={routerPathname === pathname ? "visible" : "hidden"}
      pathname={pathname}
      rootRouteId={route.rootRouteId}
      routerSnapshot={route.routerSnapshot}
    />
  );
}

/**
 * The pathname whose view is on screen. The location changes as soon as a
 * navigation starts, but the router keeps rendering the route being left until
 * the destination resolves. A retained route being left stays visible until
 * then, so nothing mounts in its place: a live outlet would mount a second copy
 * of it.
 */
function getVisiblePathname({
  cachedRoutes,
  currentMatchPathname,
  destinationRoute,
  isCurrentMatchResolved,
  routerPathname,
}: {
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"];
  currentMatchPathname?: string;
  destinationRoute?: ReadyCachedRoute;
  isCurrentMatchResolved: boolean;
  routerPathname: string;
}) {
  if (
    isCurrentMatchResolved ||
    currentMatchPathname === undefined ||
    isReadyCachedRoute(destinationRoute) ||
    !isReadyCachedRoute(cachedRoutes[currentMatchPathname])
  ) {
    return routerPathname;
  }

  return currentMatchPathname;
}

/**
 * The route of a first visit, once it is ready to render: cache enabled,
 * resolved without errors, and with no entry yet. Nothing is a first visit
 * when the cache retains no route.
 */
function getFirstVisit({
  destinationRoute,
  isCurrentMatchReady,
  isCurrentRouteErrored,
  retainsRoutes,
  rootRouteId,
  routerPathname,
  staticData,
}: {
  destinationRoute?: ReadyCachedRoute;
  isCurrentMatchReady: boolean;
  isCurrentRouteErrored: boolean;
  retainsRoutes: boolean;
  rootRouteId?: string;
  routerPathname: string;
  staticData?: StaticDataRouteOption;
}): FirstVisit | undefined {
  if (
    !retainsRoutes ||
    isCurrentRouteErrored ||
    !isCurrentMatchReady ||
    rootRouteId === undefined ||
    staticData === undefined ||
    destinationRoute !== undefined
  ) {
    return;
  }

  return {
    effectMode: getRouteCacheEffectMode(staticData),
    pathname: routerPathname,
    rootRouteId,
  };
}

/**
 * A first visit renders in a retained view from its first render, with the
 * snapshot the cache then stores, so storing it remounts nothing. Rendering it
 * in the live outlet first would mount it again in its retained view. The
 * snapshot is created once per visit and kept in state, updated while
 * rendering when the visit changes.
 */
function useEnteringRoute(
  firstVisit: FirstVisit | undefined,
  snapshotInput: RouterSnapshotInput
) {
  const [enteringRoute, setEnteringRoute] = useState<EnteringRoute | null>(
    null
  );

  if (!firstVisit) {
    if (enteringRoute !== null) {
      setEnteringRoute(null);
    }

    return null;
  }

  if (
    enteringRoute?.pathname === firstVisit.pathname &&
    enteringRoute.rootRouteId === firstVisit.rootRouteId
  ) {
    return enteringRoute;
  }

  const nextEnteringRoute = {
    ...firstVisit,
    routerSnapshot: createRouterSnapshot(snapshotInput),
  };

  setEnteringRoute(nextEnteringRoute);
  return nextEnteringRoute;
}

/**
 * Retained views and the first visit share one keyed list, so the entry the
 * cache stores takes the first visit's place without a remount. The live
 * outlet is keyed by the route the router renders in it, so a route being left
 * keeps its outlet until the destination resolves.
 */
function renderRouteViews({
  bypassCachedPathname,
  cachedRoutes,
  enteringRoute,
  livePathname,
  visiblePathname,
}: {
  bypassCachedPathname?: string;
  cachedRoutes: ReturnType<typeof useRouterCacheContext>["cachedRoutes"];
  enteringRoute: EnteringRoute | null;
  livePathname: string;
  visiblePathname: string;
}) {
  const views = Object.entries(cachedRoutes).map(([pathname, route]) =>
    renderCachedRoute({
      bypassCachedPathname,
      pathname,
      route,
      routerPathname: visiblePathname,
    })
  );

  if (enteringRoute) {
    views.push(
      <CachedRouteView
        effectMode={enteringRoute.effectMode}
        key={enteringRoute.pathname}
        mode="visible"
        pathname={enteringRoute.pathname}
        rootRouteId={enteringRoute.rootRouteId}
        routerSnapshot={enteringRoute.routerSnapshot}
      />
    );
  }

  const shouldRenderLiveOutlet =
    enteringRoute === null &&
    (visiblePathname === bypassCachedPathname ||
      !isReadyCachedRoute(cachedRoutes[visiblePathname]));

  return (
    <>
      {views}
      {shouldRenderLiveOutlet ? <Outlet key={`live-${livePathname}`} /> : null}
    </>
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
    erroredRouteCounts,
    retainsRoutes,
    setCachedRoutes,
    touchCachedRoutes,
  } = useRouterCacheContext();
  const { eventListener } = useEventListener();
  const pendingCachedNavigationRef = useRef<PendingCachedNavigation | null>(
    null
  );
  const previousPathnameRef = useRef<string | undefined>(undefined);
  const previousRouteCacheModesRef = useRef<Map<string, ActivityMode> | null>(
    null
  );

  const routerLocation = useRouterState({
    select: (state) => ({ ...state.location }),
  });
  const routerHref = routerLocation.href;
  const routerPathname = normalizeCachedRoutePathname(routerLocation.pathname);
  const routerResolvedLocation = useRouterState({
    select: (state) =>
      state.resolvedLocation ? { ...state.resolvedLocation } : undefined,
  });
  const resolvedPathname = normalizeCachedRoutePathname(
    routerResolvedLocation?.pathname ?? routerPathname
  );
  const destinationRoute = cachedRoutes[routerPathname];
  const router = useRouter();

  const matches = normalizeRouterMatches(useMatches());
  const childMatches = normalizeRouterMatches(useChildMatches());
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
  const visiblePathname = getVisiblePathname({
    cachedRoutes,
    currentMatchPathname,
    destinationRoute,
    isCurrentMatchResolved,
    routerPathname,
  });

  const enteringRoute = useEnteringRoute(
    getFirstVisit({
      destinationRoute,
      isCurrentMatchReady,
      isCurrentRouteErrored,
      retainsRoutes,
      rootRouteId,
      routerPathname,
      staticData,
    }),
    { matches, router, routerLocation, routerResolvedLocation }
  );
  const enteringSnapshot = enteringRoute?.routerSnapshot;
  // TanStack Router has no event for matches the loader republishes in the
  // background, so this follows the render. It is a layout effect so a first
  // visit is stored before paint.
  useLayoutEffect(() => {
    syncCachedRouteState({
      enteringSnapshot,
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
      setCachedRoutes,
      staticData,
    });
  }, [
    currentCachedRoute,
    enteringSnapshot,
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
  }, [destinationRoute, eventListener, routerPathname, previousPathnameRef]);

  useLayoutEffect(() => {
    previousRouteCacheModesRef.current ??= new Map();

    previousRouteCacheModesRef.current = syncCachedRouteActivityEvents({
      cachedRoutes,
      eventListener,
      previousRouteCacheModes: previousRouteCacheModesRef.current,
      routerPathname: visiblePathname,
    });
  }, [cachedRoutes, eventListener, visiblePathname]);

  useEffect(() => {
    const pendingNavigation = pendingCachedNavigationRef.current;

    if (routerPathname !== pendingNavigation?.pathname) {
      return;
    }

    const frameIds = { first: 0, second: 0 };

    frameIds.first = globalThis.requestAnimationFrame(() => {
      const visibleAt = performance.now();

      frameIds.second = globalThis.requestAnimationFrame(() => {
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
      globalThis.cancelAnimationFrame(frameIds.first);
      globalThis.cancelAnimationFrame(frameIds.second);
    };
  }, [eventListener, routerPathname]);

  // Runs before the router loads the destination. Calling `navigate` from here
  // supersedes that load, so a bare revisit never resolves, renders or caches
  // before its cached href replaces it.
  const handleBeforeNavigate = useEffectEvent(
    ({
      fromLocation,
      pathChanged,
      toLocation,
    }: RouterEvents["onBeforeNavigate"]) => {
      const toPathname = normalizeCachedRoutePathname(toLocation.pathname);
      const route = cachedRoutes[toPathname];

      if (!route || isCachedRouteStale(route)) {
        return;
      }

      if (pathChanged) {
        touchCachedRoutes([toPathname]);
      }

      if (
        route.href &&
        shouldRestoreCachedHref({
          cachedHref: route.href,
          currentHref: toLocation.href,
          currentPathname: toPathname,
          isRouteCacheEnabled: isRouteCacheEnabled(route.staticData),
          previousPathname: fromLocation
            ? normalizeCachedRoutePathname(fromLocation.pathname)
            : undefined,
        })
      ) {
        restoreCachedHref(router, route.href);
      }
    }
  );

  useEffect(
    () =>
      router.subscribe("onBeforeNavigate", (event) => {
        handleBeforeNavigate(event);
      }),
    [router]
  );

  useEffect(() => {
    previousPathnameRef.current = routerPathname;
  }, [routerPathname, previousPathnameRef]);

  useRouterCacheDebug(cachedRoutes, routerPathname);

  return renderRouteViews({
    bypassCachedPathname,
    cachedRoutes,
    enteringRoute,
    livePathname: currentMatchPathname ?? routerPathname,
    visiblePathname,
  });
}

export default RouteCacheManager;
