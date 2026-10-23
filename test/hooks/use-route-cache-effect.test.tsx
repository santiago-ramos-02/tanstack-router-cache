import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render } from "@testing-library/react";
import { useCallback, useState } from "react";
import { describe, expect, it } from "vitest";

import { RouteCacheActivityProvider } from "../../src/contexts/route-cache-activity";
import { useRouteCacheEffect } from "../../src/hooks/use-route-cache-effect";
import type { ActivityMode } from "../../src/types";

const setupCalls: string[] = [];
const cleanupCalls: string[] = [];

let initialMode: ActivityMode = "visible";

const controls: {
  setDep: ((dep: string) => void) | null;
  setMode: ((mode: ActivityMode) => void) | null;
} = {
  setDep: null,
  setMode: null,
};

function Probe({ dep }: { dep: string }) {
  const callback = useCallback(() => {
    setupCalls.push(dep);

    return () => {
      cleanupCalls.push(dep);
    };
  }, [dep]);

  useRouteCacheEffect(callback, [dep]);

  return null;
}

function Harness() {
  const [mode, setMode] = useState<ActivityMode>(initialMode);
  const [dep, setDep] = useState("a");

  controls.setMode = setMode;
  controls.setDep = setDep;

  return (
    <RouteCacheActivityProvider mode={mode} pathname="/probe">
      <Probe dep={dep} />
    </RouteCacheActivityProvider>
  );
}

const rootRoute = createRootRoute();

const probeRoute = createRoute({
  component: Harness,
  getParentRoute: () => rootRoute,
  path: "/probe",
});

const routeTree = rootRoute.addChildren([probeRoute]);

async function renderProbe(mode: ActivityMode = "visible") {
  setupCalls.length = 0;
  cleanupCalls.length = 0;
  controls.setDep = null;
  controls.setMode = null;
  initialMode = mode;

  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/probe"] }),
    routeTree,
  });

  let view: ReturnType<typeof render> | undefined;

  await act(async () => {
    view = render(<RouterProvider router={router} />);
    await router.load();
  });

  if (!view || !controls.setMode || !controls.setDep) {
    throw new Error("Failed to render the route-cache effect probe.");
  }

  return view;
}

async function setMode(mode: ActivityMode) {
  await act(async () => {
    controls.setMode?.(mode);
  });
}

async function setDep(dep: string) {
  await act(async () => {
    controls.setDep?.(dep);
  });
}

describe("useRouteCacheEffect", () => {
  it("mounts the effect when visible and cleans up on hide, every time", async () => {
    const view = await renderProbe("visible");

    expect(setupCalls).toEqual(["a"]);
    expect(cleanupCalls).toEqual([]);

    await setMode("hidden");

    expect(setupCalls).toEqual(["a"]);
    expect(cleanupCalls).toEqual(["a"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a", "a"]);
    expect(cleanupCalls).toEqual(["a"]);

    await setMode("hidden");

    expect(setupCalls).toEqual(["a", "a"]);
    expect(cleanupCalls).toEqual(["a", "a"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a", "a", "a"]);
    expect(cleanupCalls).toEqual(["a", "a"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a", "a", "a"]);
  });

  it("ignores dependency changes while hidden and runs once with the latest deps on show", async () => {
    const view = await renderProbe("visible");

    expect(setupCalls).toEqual(["a"]);

    await setMode("hidden");

    expect(cleanupCalls).toEqual(["a"]);

    await setDep("b");

    expect(setupCalls).toEqual(["a"]);
    expect(cleanupCalls).toEqual(["a"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a", "b"]);
    expect(cleanupCalls).toEqual(["a"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a", "b"]);
  });

  it("re-runs the effect when dependencies change while visible", async () => {
    const view = await renderProbe("visible");

    expect(setupCalls).toEqual(["a"]);

    await setDep("b");

    expect(setupCalls).toEqual(["a", "b"]);
    expect(cleanupCalls).toEqual(["a"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a", "b"]);
  });

  it("does not run the effect when the route mounts hidden", async () => {
    const view = await renderProbe("hidden");

    expect(setupCalls).toEqual([]);
    expect(cleanupCalls).toEqual([]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a"]);
    expect(cleanupCalls).toEqual([]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a"]);
  });
});
