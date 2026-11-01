import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import { Profiler, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RouterCacheOutlet,
  RouterCacheProvider,
  useRouterCache,
} from "../../src";

const START = 1_000_000;
const BASELINE_REENTRY_COMMITS = 8;

type CachedRoutes = ReturnType<typeof useRouterCache>["cachedRoutes"];

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

function createDeferred(): Deferred {
  let settle = () => {};
  const promise = new Promise<void>((resolve) => {
    settle = resolve;
  });

  return { promise, resolve: settle };
}

const probe = {
  cacheRenders: [] as { lastVisibleAt?: number; pathname: string }[],
  cachedRoutes: {} as CachedRoutes,
  commits: 0,
  feedDeferred: null as Deferred | null,
  feedLoads: 0,
  liveRouter: null as unknown,
  searchLoaderPages: [] as (number | undefined)[],
};

function readSearchPage(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function CacheProbe() {
  const { cachedRoutes } = useRouterCache();
  const pathname = useLocation({ select: (location) => location.pathname });

  probe.cachedRoutes = cachedRoutes;
  probe.cacheRenders.push({
    lastVisibleAt: cachedRoutes["/search"]?.lastVisibleAt,
    pathname,
  });

  return null;
}

function RootShell() {
  return (
    <RouterCacheProvider>
      <CacheProbe />
      <Profiler
        id="manager"
        onRender={() => {
          probe.commits += 1;
        }}
      >
        <RouterCacheOutlet />
      </Profiler>
    </RouterCacheProvider>
  );
}

// A cached view renders under the router snapshot, a live one under the real
// router, which is how a test can tell the two apart in the DOM.
function usePageRouterKind() {
  return useRouter() === probe.liveRouter ? "live" : "snapshot";
}

function SearchPage() {
  const search = searchRoute.useSearch();
  const [count, setCount] = useState(0);

  return (
    <>
      <output data-testid="search-page">{search.page ?? "none"}</output>
      <output data-testid="search-count">{count}</output>
      <button
        onClick={() => {
          setCount((value) => value + 1);
        }}
        type="button"
      >
        Increase
      </button>
    </>
  );
}

function OtherPage() {
  return <div data-testid="other-page">Other page</div>;
}

function PlainPage() {
  return <div data-testid="plain-page">Plain page</div>;
}

function FeedPage() {
  const data = feedRoute.useLoaderData();
  const kind = usePageRouterKind();

  return (
    <output data-kind={kind} data-testid="feed-page">
      {data.load}
    </output>
  );
}

const rootRoute = createRootRoute({ component: RootShell });

const searchRoute = createRoute({
  component: SearchPage,
  getParentRoute: () => rootRoute,
  // validateSearch comes first so TypeScript infers the search schema before
  // loaderDeps and navigate use it.
  validateSearch: (search: Record<string, unknown>) => ({
    page: readSearchPage(search.page),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) => {
    probe.searchLoaderPages.push(deps.page);
  },
  path: "/search",
  staticData: { routeCache: true },
});

const otherRoute = createRoute({
  component: OtherPage,
  getParentRoute: () => rootRoute,
  path: "/other",
  staticData: { routeCache: true },
});

const plainRoute = createRoute({
  component: PlainPage,
  getParentRoute: () => rootRoute,
  path: "/plain",
});

const feedRoute = createRoute({
  component: FeedPage,
  getParentRoute: () => rootRoute,
  loader: async () => {
    probe.feedLoads += 1;
    const load = probe.feedLoads;

    // Only revalidations wait; the first visit resolves right away.
    if (load > 1 && probe.feedDeferred) {
      await probe.feedDeferred.promise;
    }

    return { load };
  },
  path: "/feed",
  staleTime: 0,
  staticData: { routeCache: true },
});

const routeTree = rootRoute.addChildren([
  searchRoute,
  otherRoute,
  plainRoute,
  feedRoute,
]);

async function renderRouter(initialPath: string) {
  probe.cacheRenders = [];
  probe.cachedRoutes = {};
  probe.commits = 0;
  probe.feedDeferred = null;
  probe.feedLoads = 0;
  probe.searchLoaderPages = [];

  const router = createRouter({
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    routeTree,
  });

  probe.liveRouter = router;

  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });

  return router;
}

// Takes the navigation as a callback so each call keeps the route tree's own
// typed `to` and `search`.
async function navigate(navigation: () => Promise<void>) {
  await act(async () => {
    await navigation();
  });
}

describe("RouterCacheOutlet navigation events", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: START, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("touching visited routes", () => {
    it("refreshes lastVisibleAt when navigating to a cached route", async () => {
      const router = await renderRouter("/search");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.ready).toBe(true);
      });
      expect(probe.cachedRoutes["/search"]?.lastVisibleAt).toBe(START);

      vi.setSystemTime(START + 1000);
      await navigate(() => router.navigate({ to: "/other" }));
      await waitFor(() => {
        expect(probe.cachedRoutes["/other"]?.ready).toBe(true);
      });

      vi.setSystemTime(START + 5000);
      await navigate(() =>
        router.navigate({ search: { page: 1 }, to: "/search" })
      );

      expect(probe.cachedRoutes["/search"]?.lastVisibleAt).toBe(START + 5000);
      expect(probe.cachedRoutes["/other"]?.lastVisibleAt).toBe(START + 1000);
    });

    it("never renders the visible route with an outdated lastVisibleAt", async () => {
      const router = await renderRouter("/search");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.ready).toBe(true);
      });
      vi.setSystemTime(START + 1000);
      await navigate(() => router.navigate({ to: "/other" }));
      await waitFor(() => {
        expect(probe.cachedRoutes["/other"]?.ready).toBe(true);
      });

      vi.setSystemTime(START + 5000);
      probe.cacheRenders = [];
      await navigate(() =>
        router.navigate({ search: { page: 1 }, to: "/search" })
      );

      const searchRenders = probe.cacheRenders.filter(
        (entry) => entry.pathname === "/search"
      );

      expect(searchRenders.length).toBeGreaterThan(0);
      expect(
        searchRenders.every((entry) => entry.lastVisibleAt === START + 5000)
      ).toBe(true);
    });
  });

  describe("restoring the cached href", () => {
    it("restores the cached search on a bare revisit without resolving the bare location", async () => {
      const router = await renderRouter("/search?page=3");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.href).toBe("/search?page=3");
      });
      await navigate(() => router.navigate({ to: "/other" }));
      await waitFor(() => {
        expect(screen.getByTestId("other-page")).toBeInTheDocument();
      });

      const resolvedHrefs: string[] = [];
      const unsubscribe = router.subscribe("onResolved", (event) => {
        resolvedHrefs.push(event.toLocation.href);
      });

      await navigate(() => router.navigate({ to: "/search" }));
      unsubscribe();

      await waitFor(() => {
        expect(screen.getByTestId("search-page")).toHaveTextContent("3");
      });
      expect(router.state.location.href).toBe("/search?page=3");
      expect(resolvedHrefs).toEqual(["/search?page=3"]);
      expect(probe.searchLoaderPages).not.toContain(undefined);
      expect(probe.cachedRoutes["/search"]?.href).toBe("/search?page=3");
    });

    it("replaces the bare history entry with the cached href", async () => {
      const router = await renderRouter("/search?page=3");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.href).toBe("/search?page=3");
      });
      await navigate(() => router.navigate({ to: "/other" }));
      const lengthBeforeRevisit = router.history.length;

      await navigate(() => router.navigate({ to: "/search" }));
      await waitFor(() => {
        expect(router.history.location.href).toBe("/search?page=3");
      });

      // One entry for the revisit, carrying the cached href, and no loop.
      expect(router.history.length).toBe(lengthBeforeRevisit + 1);
      router.history.back();
      await waitFor(() => {
        expect(router.history.location.pathname).toBe("/other");
      });
    });

    it("keeps an explicit search instead of restoring the cached one", async () => {
      const router = await renderRouter("/search?page=3");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.href).toBe("/search?page=3");
      });
      await navigate(() => router.navigate({ to: "/other" }));

      await navigate(() =>
        router.navigate({ search: { page: 2 }, to: "/search" })
      );

      await waitFor(() => {
        expect(screen.getByTestId("search-page")).toHaveTextContent("2");
      });
      expect(router.state.location.href).toBe("/search?page=2");
    });

    it("does not restore when the destination is not cached", async () => {
      const router = await renderRouter("/search?page=3");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.href).toBe("/search?page=3");
      });
      await navigate(() => router.navigate({ to: "/plain" }));

      expect(screen.getByTestId("plain-page")).toBeInTheDocument();
      expect(router.state.location.href).toBe("/plain");
    });
  });

  describe("render cost", () => {
    it("re-entering a cached route stays within a bounded number of commits", async () => {
      const router = await renderRouter("/search?page=3");

      await waitFor(() => {
        expect(probe.cachedRoutes["/search"]?.ready).toBe(true);
      });
      await navigate(() => router.navigate({ to: "/other" }));
      await waitFor(() => {
        expect(probe.cachedRoutes["/other"]?.ready).toBe(true);
      });
      await navigate(() =>
        router.navigate({ search: { page: 3 }, to: "/search" })
      );
      await navigate(() => router.navigate({ to: "/other" }));

      const commitsBefore = probe.commits;
      const cacheRendersBefore = probe.cacheRenders.length;
      await navigate(() =>
        router.navigate({ search: { page: 3 }, to: "/search" })
      );

      const commits = probe.commits - commitsBefore;
      const cacheRenders = probe.cacheRenders.length - cacheRendersBefore;

      console.info(
        `re-entry commits=${commits} cacheContextRenders=${cacheRenders}`
      );
      expect(commits).toBeLessThanOrEqual(BASELINE_REENTRY_COMMITS);
    });
  });

  describe("synchronizing the visible route", () => {
    it("hands a first visit off to the cached snapshot before anything observes the live view", async () => {
      const seen: string[] = [];
      const observer = new MutationObserver(() => {
        for (const page of document.querySelectorAll<HTMLElement>(
          "[data-kind]"
        )) {
          seen.push(page.dataset.kind ?? "");
        }
      });
      observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      try {
        const router = await renderRouter("/other");

        await navigate(() => router.navigate({ to: "/feed" }));
        await waitFor(() => {
          expect(screen.getByTestId("feed-page")).toHaveAttribute(
            "data-kind",
            "snapshot"
          );
        });
        // Let any pending observer callback run.
        await act(async () => {
          await Promise.resolve();
        });
      } finally {
        observer.disconnect();
      }

      expect(seen.length).toBeGreaterThan(0);
      expect(seen).not.toContain("live");
    });

    it("keeps the cached view in sync with a background loader refresh", async () => {
      const router = await renderRouter("/feed");

      await waitFor(() => {
        expect(screen.getByTestId("feed-page")).toHaveTextContent("1");
      });
      await waitFor(() => {
        expect(probe.cachedRoutes["/feed"]?.ready).toBe(true);
      });
      await navigate(() => router.navigate({ to: "/other" }));

      probe.feedDeferred = createDeferred();
      await navigate(() => router.navigate({ to: "/feed" }));

      // The cached view paints first while the stale loader revalidates.
      expect(screen.getByTestId("feed-page")).toHaveTextContent("1");
      expect(screen.getByTestId("feed-page")).toHaveAttribute(
        "data-kind",
        "snapshot"
      );

      await act(async () => {
        probe.feedDeferred?.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByTestId("feed-page")).toHaveTextContent("2");
      });
      expect(probe.feedLoads).toBe(2);
    });
  });
});
