import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RouterCacheOutlet, RouterCacheProvider } from "../../src";
import { useRouteCacheEffect } from "../../src/hooks/use-route-cache-effect";

const effectLog: string[] = [];
let managerRenders = 0;

function RootShell() {
  managerRenders += 1;

  return (
    <RouterCacheProvider>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}

function EffectProbe({ routeName }: { routeName: string }) {
  const [ticks, setTicks] = useState(0);

  useRouteCacheEffect(() => {
    effectLog.push(`setup:${routeName}`);

    return () => {
      effectLog.push(`cleanup:${routeName}`);
    };
  }, []);

  return (
    <>
      <div data-testid={`${routeName}-page`}>{routeName} page</div>
      <output data-testid={`${routeName}-ticks`}>{ticks}</output>
      <button
        onClick={() => {
          setTicks((value) => value + 1);
        }}
        type="button"
      >
        Tick {routeName}
      </button>
    </>
  );
}

function ConsultaPage() {
  return <EffectProbe routeName="consulta" />;
}

function RadicacionPage() {
  return <EffectProbe routeName="radicacion" />;
}

const rootRoute = createRootRoute({
  component: RootShell,
});

const consultaRoute = createRoute({
  component: ConsultaPage,
  getParentRoute: () => rootRoute,
  path: "/consulta",
  staticData: {
    routeCache: true,
  },
});

const radicacionRoute = createRoute({
  component: RadicacionPage,
  getParentRoute: () => rootRoute,
  path: "/radicacion",
  staticData: {
    routeCache: true,
  },
});

const routeTree = rootRoute.addChildren([consultaRoute, radicacionRoute]);

async function renderTwoRouteCacheRouter() {
  effectLog.length = 0;
  managerRenders = 0;

  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: ["/consulta"],
    }),
    routeTree,
  });

  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });

  await waitFor(() => {
    expect(screen.getByTestId("consulta-page")).toBeInTheDocument();
  });

  return router;
}

async function navigateTo(
  router: Awaited<ReturnType<typeof renderTwoRouteCacheRouter>>,
  to: "/consulta" | "/radicacion"
) {
  await act(async () => {
    await router.navigate({ to });
  });
}

describe("RouterCacheOutlet cached route switching", () => {
  it("mounts and cleans up route effects on every visibility change without duplicates", async () => {
    const router = await renderTwoRouteCacheRouter();

    // Warm both cached screens first. A route's first visit hands off from
    // the live outlet to the cached snapshot (an extra setup/cleanup pair),
    // which is separate from the visibility lifecycle asserted below.
    await navigateTo(router, "/radicacion");

    await waitFor(() => {
      expect(screen.getByTestId("radicacion-page")).toBeInTheDocument();
    });

    await navigateTo(router, "/consulta");

    await waitFor(() => {
      expect(screen.getByTestId("consulta-page")).toBeInTheDocument();
      expect(effectLog.at(-1)).toBe("setup:consulta");
    });

    effectLog.length = 0;

    await navigateTo(router, "/radicacion");

    await waitFor(() => {
      expect(effectLog).toEqual(["cleanup:consulta", "setup:radicacion"]);
    });

    await navigateTo(router, "/consulta");

    await waitFor(() => {
      expect(effectLog).toEqual([
        "cleanup:consulta",
        "setup:radicacion",
        "cleanup:radicacion",
        "setup:consulta",
      ]);
    });

    await navigateTo(router, "/radicacion");

    await waitFor(() => {
      expect(effectLog).toEqual([
        "cleanup:consulta",
        "setup:radicacion",
        "cleanup:radicacion",
        "setup:consulta",
        "cleanup:consulta",
        "setup:radicacion",
      ]);
    });

    await navigateTo(router, "/consulta");

    await waitFor(() => {
      expect(effectLog).toEqual([
        "cleanup:consulta",
        "setup:radicacion",
        "cleanup:radicacion",
        "setup:consulta",
        "cleanup:consulta",
        "setup:radicacion",
        "cleanup:radicacion",
        "setup:consulta",
      ]);
    });
  });

  it("keeps cached screen state across switches with a bounded render count", async () => {
    const router = await renderTwoRouteCacheRouter();

    screen.getByRole("button", { name: "Tick consulta" }).click();
    screen.getByRole("button", { name: "Tick consulta" }).click();

    await waitFor(() => {
      expect(screen.getByTestId("consulta-ticks")).toHaveTextContent("2");
    });

    const rendersBeforeSwitches = managerRenders;

    await navigateTo(router, "/radicacion");

    await waitFor(() => {
      expect(screen.getByTestId("radicacion-page")).toBeInTheDocument();
    });

    await navigateTo(router, "/consulta");

    await waitFor(() => {
      expect(screen.getByTestId("consulta-ticks")).toHaveTextContent("2");
    });

    await navigateTo(router, "/radicacion");
    await navigateTo(router, "/consulta");

    await waitFor(() => {
      expect(screen.getByTestId("consulta-ticks")).toHaveTextContent("2");
    });

    // A state-set-from-effect update loop would throw "Maximum update depth
    // exceeded" or explode the render count; four switches must settle.
    expect(managerRenders - rendersBeforeSwitches).toBeLessThan(40);
  });
});
