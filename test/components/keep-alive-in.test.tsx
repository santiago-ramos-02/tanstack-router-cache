import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RouteCacheManager from "../../src/components/route-cache-manager";

const SUCCESS_STATUS_CODE = 200;

type MockRouterLocation = {
  href?: string;
  pathname: string;
  search?: Record<string, unknown>;
};

type MockMatch = Record<string, unknown>;

type MockRouterState = {
  childMatches: MockMatch[];
  location: MockRouterLocation;
  matches: MockMatch[];
  resolvedLocation: MockRouterLocation;
  router: Record<string, unknown>;
};

const routerState: MockRouterState = {
  childMatches: [],
  location: {
    href: "/consulta",
    pathname: "/consulta",
    search: {
      consulta_q: "*",
      mode: "search",
    },
  },
  matches: [],
  resolvedLocation: {
    href: "/consulta?consulta_q=*&mode=search",
    pathname: "/consulta",
    search: {
      consulta_q: "*",
      mode: "search",
    },
  },
  router: {},
};

type MockCachedRoute = Record<string, unknown>;

type MockRouterCacheContext = {
  cachedRoutes: Record<string, MockCachedRoute>;
  deleteCachedRoutes: ReturnType<typeof vi.fn>;
  erroredRouteCounts: Record<string, number>;
  releaseErroredRoute: ReturnType<typeof vi.fn>;
  retainErroredRoute: ReturnType<typeof vi.fn>;
  setCachedRoutes: ReturnType<typeof vi.fn>;
  touchCachedRoutes: ReturnType<typeof vi.fn>;
};

const routerCacheContext: MockRouterCacheContext = {
  cachedRoutes: {},
  deleteCachedRoutes: vi.fn(),
  erroredRouteCounts: {},
  releaseErroredRoute: vi.fn(),
  retainErroredRoute: vi.fn(),
  setCachedRoutes: vi.fn(),
  touchCachedRoutes: vi.fn(),
};

function createRouterStore<T>(value: T) {
  return {
    get: () => value,
    subscribe: () => ({
      unsubscribe: () => {},
    }),
  };
}

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="live-outlet" />,
  useChildMatches: () => routerState.childMatches,
  useMatches: () => routerState.matches,
  useRouter: () => routerState.router,
  useRouterState: ({
    select,
  }: {
    select: (state: {
      location: MockRouterLocation;
      resolvedLocation: MockRouterLocation;
    }) => unknown;
  }) =>
    select({
      location: routerState.location,
      resolvedLocation: routerState.resolvedLocation,
    }),
}));

vi.mock("../../src/contexts/router-cache", () => ({
  useRouterCacheContext: () => routerCacheContext,
}));

vi.mock("../../src/hooks/use-router-cache-debug", () => ({
  useRouterCacheDebug: () => {},
}));

vi.mock("../../src/components/cached-outlet", () => ({
  default: ({ routeId }: { routeId: string }) => (
    <div data-testid={`cached-${routeId}`}>cached route</div>
  ),
}));

vi.mock("../../src/components/off-screen", () => ({
  default: ({
    children,
    effectMode,
    mode,
    pathname,
  }: {
    children: ReactNode;
    effectMode?: "keep-alive" | "pause";
    mode: "hidden" | "visible";
    pathname: string;
  }) => (
    <div
      data-effect-mode={effectMode}
      data-mode={mode}
      data-pathname={pathname}
      data-testid={`offscreen-${pathname}`}
    >
      {children}
    </div>
  ),
}));

vi.mock("../../src/components/restore-cached-href", () => ({
  shouldRestoreCachedHref: () => false,
}));

function createRouterCacheMatch(overrides: Record<string, unknown> = {}) {
  return {
    _nonReactive: {},
    id: "consulta-match",
    pathname: "/consulta",
    routeId: "/_auth/_app/consulta/",
    staticData: {
      routeCache: true,
    },
    status: "success",
    ...overrides,
  };
}

describe("RouteCacheManager", () => {
  beforeEach(() => {
    routerCacheContext.cachedRoutes = {};
    routerCacheContext.deleteCachedRoutes.mockReset();
    routerCacheContext.erroredRouteCounts = {};
    routerCacheContext.releaseErroredRoute.mockReset();
    routerCacheContext.retainErroredRoute.mockReset();
    routerCacheContext.setCachedRoutes.mockReset();
    routerCacheContext.touchCachedRoutes.mockReset();
    routerState.location = {
      href: "/consulta",
      pathname: "/consulta",
      search: {
        consulta_q: "*",
        mode: "search",
      },
    };
    routerState.resolvedLocation = {
      href: "/consulta?consulta_q=*&mode=search",
      pathname: "/consulta",
      search: {
        consulta_q: "*",
        mode: "search",
      },
    };
    routerState.matches = [createRouterCacheMatch()];
    routerState.childMatches = [createRouterCacheMatch()];
    routerState.router = {};
  });

  it("renders the active cached route instead of a fresh live outlet", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        rootRouteId: "consulta-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
      "/radicacion": {
        href: "/radicacion",
        rootRouteId: "radicacion-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
    };

    render(<RouteCacheManager />);

    expect(screen.getByTestId("offscreen-/consulta")).toHaveAttribute(
      "data-mode",
      "visible"
    );
    expect(screen.getByTestId("cached-consulta-match")).toBeInTheDocument();
    expect(screen.getByTestId("offscreen-/radicacion")).toHaveAttribute(
      "data-mode",
      "hidden"
    );
    expect(screen.queryByTestId("live-outlet")).not.toBeInTheDocument();
  });

  it("forwards the route effect mode to the retained view", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        rootRouteId: "consulta-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: {
            effectMode: "keep-alive",
          },
        },
      },
    };

    render(<RouteCacheManager />);

    expect(screen.getByTestId("offscreen-/consulta")).toHaveAttribute(
      "data-effect-mode",
      "keep-alive"
    );
  });

  it("falls back to the live outlet when the current route has no ready cached snapshot", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        staticData: {
          routeCache: true,
        },
      },
    };
    routerState.matches = [createRouterCacheMatch({ status: "pending" })];
    routerState.childMatches = [createRouterCacheMatch({ status: "pending" })];

    render(<RouteCacheManager />);

    expect(screen.getByTestId("live-outlet")).toBeInTheDocument();
    expect(screen.queryByTestId("offscreen-/consulta")).not.toBeInTheDocument();
  });

  it("renders the live outlet while a non-cached destination is loading from a cached route", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        rootRouteId: "consulta-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
    };
    routerState.location = {
      href: "/radicacion",
      pathname: "/radicacion",
      search: {},
    };
    routerState.resolvedLocation = {
      href: "/consulta?consulta_q=*&mode=search",
      pathname: "/consulta",
      search: {
        consulta_q: "*",
        mode: "search",
      },
    };
    routerState.matches = [createRouterCacheMatch()];
    routerState.childMatches = [createRouterCacheMatch()];

    render(<RouteCacheManager />);

    expect(screen.getByTestId("offscreen-/consulta")).toHaveAttribute(
      "data-mode",
      "hidden"
    );
    expect(screen.getByTestId("live-outlet")).toBeInTheDocument();
  });

  it("shows the destination immediately when navigating to a ready cached route", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        rootRouteId: "consulta-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
      "/radicacion": {
        href: "/radicacion",
        rootRouteId: "radicacion-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
    };
    routerState.location = {
      href: "/radicacion",
      pathname: "/radicacion",
      search: {},
    };
    routerState.resolvedLocation = {
      href: "/consulta?consulta_q=*&mode=search",
      pathname: "/consulta",
      search: {
        consulta_q: "*",
        mode: "search",
      },
    };
    routerState.matches = [
      createRouterCacheMatch({
        id: "radicacion-match",
        pathname: "/radicacion",
        routeId: "/_auth/_app/radicacion/",
      }),
    ];
    routerState.childMatches = [
      createRouterCacheMatch({
        id: "radicacion-match",
        pathname: "/radicacion",
        routeId: "/_auth/_app/radicacion/",
      }),
    ];

    render(<RouteCacheManager />);

    expect(screen.getByTestId("offscreen-/radicacion")).toHaveAttribute(
      "data-mode",
      "visible"
    );
    expect(screen.getByTestId("offscreen-/consulta")).toHaveAttribute(
      "data-mode",
      "hidden"
    );
    expect(screen.queryByTestId("live-outlet")).not.toBeInTheDocument();
  });

  it("does not evict a cached destination because the previous resolved match errored", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        rootRouteId: "consulta-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
      "/radicacion": {
        href: "/radicacion",
        rootRouteId: "radicacion-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
    };
    routerState.location = {
      href: "/radicacion",
      pathname: "/radicacion",
      search: {},
    };
    routerState.resolvedLocation = {
      href: "/consulta?consulta_q=*&mode=search",
      pathname: "/consulta",
      search: {
        consulta_q: "*",
        mode: "search",
      },
    };
    routerState.matches = [createRouterCacheMatch({ status: "error" })];
    routerState.childMatches = [createRouterCacheMatch({ status: "error" })];

    render(<RouteCacheManager />);

    expect(routerCacheContext.deleteCachedRoutes).not.toHaveBeenCalled();
    expect(screen.getByTestId("offscreen-/radicacion")).toHaveAttribute(
      "data-mode",
      "visible"
    );
    expect(screen.queryByTestId("live-outlet")).not.toBeInTheDocument();
  });

  it("preserves the committed location search in cached router snapshots", () => {
    const currentMatch = createRouterCacheMatch();

    routerState.router = {
      stores: {
        __store: createRouterStore({
          location: routerState.location,
          resolvedLocation: routerState.resolvedLocation,
          status: "idle",
        }),
        cachedIds: createRouterStore<string[]>([]),
        cachedMatches: createRouterStore([]),
        firstId: createRouterStore(currentMatch.id),
        getRouteMatchStore: vi.fn(),
        hasPending: createRouterStore(false),
        isLoading: createRouterStore(false),
        isTransitioning: createRouterStore(false),
        loadedAt: createRouterStore(0),
        location: createRouterStore(routerState.location),
        matchRouteDeps: createRouterStore({}),
        matches: createRouterStore([currentMatch]),
        matchesId: createRouterStore([currentMatch.id]),
        pendingIds: createRouterStore<string[]>([]),
        pendingMatches: createRouterStore([]),
        pendingMatchStores: new Map(),
        cachedMatchStores: new Map(),
        matchStores: new Map(),
        redirect: createRouterStore(undefined),
        resolvedLocation: createRouterStore(routerState.resolvedLocation),
        setCached: vi.fn(),
        setMatches: vi.fn(),
        setPending: vi.fn(),
        status: createRouterStore("idle"),
        statusCode: createRouterStore(SUCCESS_STATUS_CODE),
      },
    };

    render(<RouteCacheManager />);

    const snapshot =
      routerCacheContext.setCachedRoutes.mock.calls[0]?.[1]?.routerSnapshot;

    expect(snapshot?.stores.location.get()).toMatchObject({
      search: {
        consulta_q: "*",
        mode: "search",
      },
    });
    expect(snapshot?.stores.resolvedLocation.get()).toMatchObject({
      search: {
        consulta_q: "*",
        mode: "search",
      },
    });
  });

  it("binds cached router imperative methods back to the live router", async () => {
    const currentMatch = createRouterCacheMatch();
    let preloadRouteThis: unknown;
    let navigateThis: unknown;

    routerState.router = {
      navigate: vi.fn(function navigate(this: unknown) {
        navigateThis = this;
      }),
      preloadRoute: vi.fn(async function preloadRoute(this: unknown) {
        preloadRouteThis = this;
      }),
      stores: {
        __store: createRouterStore({
          location: routerState.location,
          resolvedLocation: routerState.resolvedLocation,
          status: "idle",
        }),
        cachedIds: createRouterStore<string[]>([]),
        cachedMatches: createRouterStore([]),
        firstId: createRouterStore(currentMatch.id),
        getRouteMatchStore: vi.fn(),
        hasPending: createRouterStore(false),
        isLoading: createRouterStore(false),
        isTransitioning: createRouterStore(false),
        loadedAt: createRouterStore(0),
        location: createRouterStore(routerState.location),
        matchRouteDeps: createRouterStore({}),
        matches: createRouterStore([currentMatch]),
        matchesId: createRouterStore([currentMatch.id]),
        pendingIds: createRouterStore<string[]>([]),
        pendingMatches: createRouterStore([]),
        pendingMatchStores: new Map(),
        cachedMatchStores: new Map(),
        matchStores: new Map(),
        redirect: createRouterStore(undefined),
        resolvedLocation: createRouterStore(routerState.resolvedLocation),
        setCached: vi.fn(),
        setMatches: vi.fn(),
        setPending: vi.fn(),
        status: createRouterStore("idle"),
        statusCode: createRouterStore(SUCCESS_STATUS_CODE),
      },
    };

    render(<RouteCacheManager />);

    const snapshot =
      routerCacheContext.setCachedRoutes.mock.calls[0]?.[1]?.routerSnapshot;

    await snapshot?.preloadRoute();
    snapshot?.navigate();

    expect(routerState.router.preloadRoute).toHaveBeenCalledTimes(1);
    expect(routerState.router.navigate).toHaveBeenCalledTimes(1);
    expect(preloadRouteThis).toBe(routerState.router);
    expect(navigateThis).toBe(routerState.router);
  });

  it("evicts and bypasses a cached route when the live router match errors", () => {
    routerCacheContext.cachedRoutes = {
      "/consulta": {
        href: "/consulta",
        rootRouteId: "consulta-match",
        ready: true,
        routerSnapshot: {},
        staticData: {
          routeCache: true,
        },
      },
    };
    routerState.matches = [createRouterCacheMatch({ status: "error" })];
    routerState.childMatches = [createRouterCacheMatch({ status: "error" })];

    render(<RouteCacheManager />);

    expect(routerCacheContext.deleteCachedRoutes).toHaveBeenCalledWith([
      "/consulta",
    ]);
    expect(screen.getByTestId("live-outlet")).toBeInTheDocument();
    expect(
      screen.queryByTestId("cached-consulta-match")
    ).not.toBeInTheDocument();
    expect(routerCacheContext.setCachedRoutes).not.toHaveBeenCalled();
  });
});
