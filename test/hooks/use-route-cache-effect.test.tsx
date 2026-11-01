import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RouteCacheActivityProvider } from "../../src/contexts/route-cache-activity";
import { useRouteCacheEffect } from "../../src/hooks/use-route-cache-effect";
import type { ActivityMode } from "../../src/types";

const setupCalls: string[] = [];
const cleanupCalls: string[] = [];

let initialMode: ActivityMode = "visible";

const controls: {
  setDep: ((dep: string) => void) | null;
  setLabel: ((label: string) => void) | null;
  setMode: ((mode: ActivityMode) => void) | null;
} = {
  setDep: null,
  setLabel: null,
  setMode: null,
};

function Probe({ dep, label }: { dep: string; label: string }) {
  // `label` is deliberately not a dependency: it must reach the callback only
  // when the effect runs for another reason.
  useRouteCacheEffect(() => {
    setupCalls.push(`${dep}:${label}`);

    return () => {
      cleanupCalls.push(`${dep}:${label}`);
    };
  }, [dep]);

  return null;
}

function Harness() {
  const [mode, setMode] = useState<ActivityMode>(initialMode);
  const [dep, setDep] = useState("a");
  const [label, setLabel] = useState("one");

  controls.setMode = setMode;
  controls.setDep = setDep;
  controls.setLabel = setLabel;

  return (
    <RouteCacheActivityProvider mode={mode} pathname="/probe">
      <Probe dep={dep} label={label} />
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
  controls.setLabel = null;
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

async function setLabel(label: string) {
  await act(async () => {
    controls.setLabel?.(label);
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

    expect(setupCalls).toEqual(["a:one"]);
    expect(cleanupCalls).toEqual([]);

    await setMode("hidden");

    expect(setupCalls).toEqual(["a:one"]);
    expect(cleanupCalls).toEqual(["a:one"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a:one", "a:one"]);
    expect(cleanupCalls).toEqual(["a:one"]);

    await setMode("hidden");

    expect(setupCalls).toEqual(["a:one", "a:one"]);
    expect(cleanupCalls).toEqual(["a:one", "a:one"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a:one", "a:one", "a:one"]);
    expect(cleanupCalls).toEqual(["a:one", "a:one"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a:one", "a:one", "a:one"]);
  });

  it("ignores dependency changes while hidden and runs once with the latest deps on show", async () => {
    const view = await renderProbe("visible");

    expect(setupCalls).toEqual(["a:one"]);

    await setMode("hidden");

    expect(cleanupCalls).toEqual(["a:one"]);

    await setDep("b");

    expect(setupCalls).toEqual(["a:one"]);
    expect(cleanupCalls).toEqual(["a:one"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a:one", "b:one"]);
    expect(cleanupCalls).toEqual(["a:one"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a:one", "b:one"]);
  });

  it("re-runs the effect when dependencies change while visible", async () => {
    const view = await renderProbe("visible");

    expect(setupCalls).toEqual(["a:one"]);

    await setDep("b");

    expect(setupCalls).toEqual(["a:one", "b:one"]);
    expect(cleanupCalls).toEqual(["a:one"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a:one", "b:one"]);
  });

  it("does not run the effect when the route mounts hidden", async () => {
    const view = await renderProbe("hidden");

    expect(setupCalls).toEqual([]);
    expect(cleanupCalls).toEqual([]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a:one"]);
    expect(cleanupCalls).toEqual([]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a:one"]);
  });

  it("does not re-run for a new callback identity and uses the latest callback on the next run", async () => {
    const view = await renderProbe("visible");

    await setLabel("two");

    expect(setupCalls).toEqual(["a:one"]);
    expect(cleanupCalls).toEqual([]);

    await setMode("hidden");

    // The cleanup is the closure returned by the setup that ran.
    expect(cleanupCalls).toEqual(["a:one"]);

    await setMode("visible");

    expect(setupCalls).toEqual(["a:one", "a:two"]);

    view.unmount();

    expect(cleanupCalls).toEqual(["a:one", "a:two"]);
  });
});
