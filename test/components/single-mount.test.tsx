import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { describe, expect, it } from "vitest";

import { RouterCacheOutlet, RouterCacheProvider } from "../../src";

// Each committed instance of a route's page, so a test can tell one mount
// that was hidden and revealed from a second copy of the route.
const mounts = new Map<string, Set<number>>();
let nextInstance = 0;
// Every subscription a page opens and closes, like a data query would, and
// the most that were ever open at once for one route.
const subscriptions = new Map<
  string,
  { open: number; peak: number; total: number }
>();

function subscriptionsOf(routeName: string) {
  let entry = subscriptions.get(routeName);

  if (!entry) {
    entry = { open: 0, peak: 0, total: 0 };
    subscriptions.set(routeName, entry);
  }

  return entry;
}

function useRouteQuery(routeName: string) {
  const [subscribe] = useState(() => () => {
    const entry = subscriptionsOf(routeName);
    entry.open += 1;
    entry.total += 1;
    entry.peak = Math.max(entry.peak, entry.open);

    return () => {
      entry.open -= 1;
    };
  });

  return useSyncExternalStore(subscribe, () => routeName);
}

function RoutePage({ routeName }: { routeName: string }) {
  const [instance] = useState(() => {
    nextInstance += 1;
    return nextInstance;
  });
  const data = useRouteQuery(routeName);

  useLayoutEffect(() => {
    let instances = mounts.get(routeName);

    if (!instances) {
      instances = new Set();
      mounts.set(routeName, instances);
    }

    instances.add(instance);
  }, [instance, routeName]);

  return <div data-testid={`${routeName}-page`}>{data}</div>;
}

function OtherPending() {
  return <div data-testid="other-pending">Loading other</div>;
}

function createSingleMountRouter({
  loadOther,
  maxEntries,
  showPending = false,
}: {
  loadOther: () => Promise<void>;
  maxEntries?: number;
  showPending?: boolean;
}) {
  const rootRoute = createRootRoute({
    component: () => (
      <RouterCacheProvider maxEntries={maxEntries}>
        <RouterCacheOutlet />
      </RouterCacheProvider>
    ),
  });
  const boardRoute = createRoute({
    component: () => <RoutePage routeName="board" />,
    getParentRoute: () => rootRoute,
    path: "/board",
    staticData: { routeCache: true },
  });
  const otherRoute = createRoute({
    component: () => <RoutePage routeName="other" />,
    getParentRoute: () => rootRoute,
    loader: loadOther,
    path: "/other",
    staticData: { routeCache: true },
    ...(showPending
      ? { pendingComponent: OtherPending, pendingMinMs: 0, pendingMs: 0 }
      : {}),
  });

  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/board"] }),
    routeTree: rootRoute.addChildren([boardRoute, otherRoute]),
  });
}

type SingleMountRouter = ReturnType<typeof createSingleMountRouter>;

// Starts the navigation inside act and awaits it outside: a runtime that
// holds commits until act ends would otherwise wait on itself.
async function startNavigation(router: SingleMountRouter, to: string) {
  let navigation: Promise<void> | undefined;

  await act(async () => {
    navigation = router.navigate({ to });
  });

  // Wrapped, so returning it does not await it.
  return { navigation };
}

async function navigateTo(router: SingleMountRouter, to: string) {
  const { navigation } = await startNavigation(router, to);

  await act(async () => {
    await navigation;
  });
}

// A route leaving the screen is retired, releasing its subscriptions, in a
// task after the next paint. This queues behind that task.
async function afterNextPaint() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
    });
  });
}

function deferred() {
  let finish: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });

  return { promise, resolve: finish };
}

async function renderRouter(router: SingleMountRouter) {
  mounts.clear();
  subscriptions.clear();

  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
}

// The load finishes in an act of its own, so the commits it schedules run
// before the navigation is awaited.
async function finishNavigation(
  load: ReturnType<typeof deferred>,
  navigation: Promise<void> | undefined
) {
  await act(async () => {
    load.resolve();
    await load.promise;
  });
  await act(async () => {
    await navigation;
  });
}

function visibleView(routeName: string) {
  return document.querySelector(`[data-router-cache-pathname="/${routeName}"]`);
}

describe("RouterCacheOutlet single mount", () => {
  it("mounts each route once on a first visit and on return, with one subscription at a time", async () => {
    const otherLoad = deferred();
    const router = createSingleMountRouter({
      loadOther: () => otherLoad.promise,
    });

    await renderRouter(router);
    expect(visibleView("board")).toHaveAttribute(
      "data-router-cache-mode",
      "visible"
    );

    const { navigation } = await startNavigation(router, "/other");

    // While the destination loads, the route being left stays on screen as
    // it was: no second copy of it, and no second subscription.
    expect(router.state.location.pathname).toBe("/other");
    expect(screen.getAllByTestId("board-page")).toHaveLength(1);
    expect(visibleView("board")).toHaveAttribute(
      "data-router-cache-mode",
      "visible"
    );
    expect(mounts.get("board")?.size).toBe(1);
    expect(subscriptionsOf("board")).toEqual({ open: 1, peak: 1, total: 1 });

    await finishNavigation(otherLoad, navigation);

    // The first visit mounts once, straight into its retained view.
    expect(screen.getAllByTestId("other-page")).toHaveLength(1);
    expect(visibleView("other")).toHaveAttribute(
      "data-router-cache-mode",
      "visible"
    );
    expect(visibleView("board")).toHaveAttribute(
      "data-router-cache-mode",
      "hidden"
    );
    await afterNextPaint();
    expect(mounts.get("other")?.size).toBe(1);
    expect(subscriptionsOf("other")).toEqual({ open: 1, peak: 1, total: 1 });
    expect(mounts.get("board")?.size).toBe(1);
    expect(subscriptionsOf("board")).toEqual({ open: 0, peak: 1, total: 1 });

    await navigateTo(router, "/board");

    // Returning reveals the retained board: the same instance subscribes
    // again, and the route left is paused, not mounted again.
    expect(visibleView("board")).toHaveAttribute(
      "data-router-cache-mode",
      "visible"
    );
    await afterNextPaint();
    expect(mounts.get("board")?.size).toBe(1);
    expect(subscriptionsOf("board")).toEqual({ open: 1, peak: 1, total: 2 });
    expect(mounts.get("other")?.size).toBe(1);
    expect(subscriptionsOf("other")).toEqual({ open: 0, peak: 1, total: 1 });

    await navigateTo(router, "/other");

    expect(visibleView("other")).toHaveAttribute(
      "data-router-cache-mode",
      "visible"
    );
    await afterNextPaint();
    expect(mounts.get("other")?.size).toBe(1);
    expect(subscriptionsOf("other")).toEqual({ open: 1, peak: 1, total: 2 });
    expect(mounts.get("board")?.size).toBe(1);
    expect(subscriptionsOf("board")).toEqual({ open: 0, peak: 1, total: 2 });
  });

  it("mounts a first visit once when it shows its pending component first", async () => {
    const otherLoad = deferred();
    const router = createSingleMountRouter({
      loadOther: () => otherLoad.promise,
      showPending: true,
    });

    await renderRouter(router);

    const { navigation } = await startNavigation(router, "/other");

    expect(screen.getByTestId("other-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("other-page")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("board-page")).toHaveLength(1);

    await finishNavigation(otherLoad, navigation);
    await afterNextPaint();

    expect(screen.queryByTestId("other-pending")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("other-page")).toHaveLength(1);
    expect(visibleView("other")).toHaveAttribute(
      "data-router-cache-mode",
      "visible"
    );
    expect(mounts.get("other")?.size).toBe(1);
    expect(subscriptionsOf("other")).toEqual({ open: 1, peak: 1, total: 1 });
    expect(mounts.get("board")?.size).toBe(1);
    expect(subscriptionsOf("board")).toEqual({ open: 0, peak: 1, total: 1 });
  });

  it("renders every visit live when the cache retains no route", async () => {
    const router = createSingleMountRouter({
      loadOther: () => Promise.resolve(),
      maxEntries: 0,
    });

    await renderRouter(router);
    await navigateTo(router, "/other");

    expect(screen.getAllByTestId("other-page")).toHaveLength(1);
    expect(screen.queryByTestId("board-page")).not.toBeInTheDocument();

    await navigateTo(router, "/board");

    // Nothing is retained, so returning mounts the board again.
    expect(document.querySelector("[data-router-cache-pathname]")).toBeNull();
    expect(screen.getAllByTestId("board-page")).toHaveLength(1);
    expect(screen.queryByTestId("other-page")).not.toBeInTheDocument();
    expect(mounts.get("board")?.size).toBe(2);
    expect(subscriptionsOf("board")).toEqual({ open: 1, peak: 1, total: 2 });
    expect(subscriptionsOf("other")).toEqual({ open: 0, peak: 1, total: 1 });
  });
});
