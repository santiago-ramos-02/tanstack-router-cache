import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RouterCacheOutlet, RouterCacheProvider } from "../../src";

function RootShell() {
  return (
    <RouterCacheProvider>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}

function SavedPage() {
  return <div data-testid="saved-page">Saved page</div>;
}

function RegularPendingPage() {
  return <div data-testid="regular-pending">Loading regular page</div>;
}

function RegularPage() {
  return <div data-testid="regular-page">Regular page</div>;
}

const rootRoute = createRootRoute({
  component: RootShell,
});

const savedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/saved",
  staticData: {
    routeCache: true,
  },
  component: SavedPage,
});

function createPendingRouter(regularLoader: () => Promise<void>) {
  const regularRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/regular",
    loader: regularLoader,
    pendingComponent: RegularPendingPage,
    pendingMinMs: 0,
    pendingMs: 0,
    component: RegularPage,
  });

  return createRouter({
    history: createMemoryHistory({
      initialEntries: ["/saved"],
    }),
    routeTree: rootRoute.addChildren([savedRoute, regularRoute]),
  });
}

describe("RouterCacheOutlet pending navigation", () => {
  it("shows the live pending outlet when leaving a cached route for a non-cached route", async () => {
    let resolveRegularLoader: () => void = () => {};
    const regularLoaderPromise = new Promise<void>((resolve) => {
      resolveRegularLoader = resolve;
    });
    const router = createPendingRouter(async () => {
      await regularLoaderPromise;
    });

    await act(async () => {
      render(<RouterProvider router={router} />);
      await router.load();
    });

    await waitFor(() => {
      expect(screen.getByTestId("saved-page")).toBeInTheDocument();
    });

    let navigationPromise: Promise<void> | undefined;

    await act(async () => {
      navigationPromise = router.navigate({ to: "/regular" });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("regular-pending")).toBeInTheDocument();
    });
    expect(
      document.querySelector('[data-router-cache-pathname="/saved"]')
    ).toHaveAttribute("data-router-cache-mode", "hidden");

    await act(async () => {
      resolveRegularLoader();
      await navigationPromise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("regular-page")).toBeInTheDocument();
    });
  });
});
