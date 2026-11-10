import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { RouterCacheOutlet, RouterCacheProvider } from "../../src";

// Every render and layout effect, in order, so a test can tell what ran in
// the navigation's commit from what ran after it.
const timeline: string[] = [];
// Read in the layout effect of each route that connects, so a test can see
// the page as the commit that revealed it left it.
let onConnect: ((routeName: string) => void) | undefined;

function RootShell() {
  return (
    <RouterCacheProvider>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}

function Row({ routeName, index }: { routeName: string; index: number }) {
  timeline.push(`render:${routeName}`);

  return <li>{`${routeName} ${index}`}</li>;
}

// Floating UI and form fields register their node through a callback ref that
// sets state, so detaching the ref when a route is hidden renders it again.
// That is an update of its own, so it is logged apart from the other renders.
function Anchor({ routeName }: { routeName: string }) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  timeline.push(`anchor:${routeName}`);

  return <span ref={setNode}>{node ? "anchored" : "detached"}</span>;
}

function RoutePage({ routeName }: { routeName: string }) {
  timeline.push(`render:${routeName}`);

  useLayoutEffect(() => {
    timeline.push(`connect:${routeName}`);
    onConnect?.(routeName);

    return () => {
      timeline.push(`disconnect:${routeName}`);
    };
  }, [routeName]);

  return (
    <ul aria-label={routeName} data-testid={`${routeName}-page`}>
      {[0, 1, 2].map((index) => (
        <Row index={index} key={index} routeName={routeName} />
      ))}
      <li>
        <Anchor routeName={routeName} />
      </li>
    </ul>
  );
}

function cachedRoute(routeName: string) {
  return createRoute({
    component: () => <RoutePage routeName={routeName} />,
    getParentRoute: () => rootRoute,
    path: `/${routeName}`,
    staticData: { routeCache: true },
  });
}

const rootRoute = createRootRoute({ component: RootShell });
const routeTree = rootRoute.addChildren(
  ["tramite", "datos", "predio"].map(cachedRoute)
);

type TestRouter = ReturnType<typeof createTestRouter>;

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory({ initialEntries: ["/tramite"] }),
    routeTree,
  });
}

// Starts the navigation inside act and awaits it outside: a runtime that
// holds commits until act ends would otherwise wait on itself.
async function navigateTo(router: TestRouter, to: string) {
  let navigation: Promise<void> | undefined;

  await act(async () => {
    navigation = router.navigate({ to });
  });
  await act(async () => {
    await navigation;
  });
}

// A route leaving the screen is retired in a task after the next paint. This
// queues behind that task, so when it resolves the retire has run.
async function afterNextPaint() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
    });
  });
}

function notShown(entries: string[]) {
  return entries.filter((entry) => !entry.endsWith(":datos"));
}

async function renderCachedRoutes() {
  const router = createTestRouter();

  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });
  for (const pathname of ["/datos", "/predio", "/tramite"]) {
    await navigateTo(router, pathname);
    await afterNextPaint();
  }

  return router;
}

describe("hidden cached route work", () => {
  it("reveals a cached route without running the routes it does not show", async () => {
    const router = await renderCachedRoutes();
    timeline.length = 0;
    await navigateTo(router, "/datos");

    expect(screen.getByTestId("datos-page")).toBeVisible();
    expect(screen.getByTestId("tramite-page")).not.toBeVisible();
    // The revealed route connects its effects at the end of the navigation's
    // commit. Nothing of the routes not shown runs up to that point.
    const revealCommitEnd = timeline.indexOf("connect:datos") + 1;
    expect(revealCommitEnd).toBeGreaterThan(0);
    expect(notShown(timeline.slice(0, revealCommitEnd))).toEqual([]);

    await afterNextPaint();

    // After the reveal, the route it left is retired: its effects disconnect.
    // No other retained route runs at any point.
    expect(timeline.indexOf("disconnect:tramite")).toBeGreaterThan(
      revealCommitEnd - 1
    );
    expect(
      notShown(timeline).filter((entry) => !entry.endsWith(":tramite"))
    ).toEqual([]);
    expect(screen.getByTestId("tramite-page")).not.toBeVisible();
  });

  it("reveals and retires a cached route without rendering it again", async () => {
    const router = await renderCachedRoutes();
    timeline.length = 0;
    await navigateTo(router, "/datos");
    await afterNextPaint();

    // Revealing reconnects the route's effects and retiring disconnects them.
    // Neither renders a component whose props and state did not change.
    expect(timeline).toContain("connect:datos");
    expect(timeline).toContain("disconnect:tramite");
    expect(timeline.filter((entry) => entry.startsWith("render:"))).toEqual([]);
    expect(screen.getByTestId("datos-page")).toBeVisible();
    expect(screen.getByTestId("tramite-page")).not.toBeVisible();
  });

  it("keeps the layout of a route it leaves until its effects disconnect", async () => {
    const router = await renderCachedRoutes();
    const page = screen.getByTestId("tramite-page");
    const container = page.closest<HTMLElement>(
      "[data-router-cache-container]"
    );
    const atReveal: { display: string; visibility: string }[] = [];
    onConnect = (routeName) => {
      if (routeName === "datos") {
        const { display, visibility } = getComputedStyle(container!);
        atReveal.push({ display, visibility });
      }
    };
    timeline.length = 0;
    await navigateTo(router, "/datos");
    onConnect = undefined;

    // In the commit that reveals another route, the route left keeps its
    // effects connected, so its layout must not collapse: an observer of its
    // sizes (a virtualized list) would read every element at zero and render,
    // or load, everything. It is out of sight and out of reach all the same.
    expect(atReveal).toEqual([
      { display: expect.not.stringMatching(/^none$/u), visibility: "hidden" },
    ]);

    await afterNextPaint();

    // Once retired, its effects are disconnected and it leaves the layout.
    expect(timeline.indexOf("disconnect:tramite")).toBeGreaterThan(
      timeline.indexOf("connect:datos")
    );
    expect(getComputedStyle(container!).display).toBe("none");
    expect(page).not.toBeVisible();
    expect(screen.queryByRole("list", { name: "tramite" })).toBeNull();
  });
});
