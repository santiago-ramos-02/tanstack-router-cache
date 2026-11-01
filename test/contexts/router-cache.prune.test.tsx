import { act, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RouterCacheProvider,
  useRouterCacheContext,
} from "../../src/contexts/router-cache";
import type {
  CachedRoutes,
  RouterCacheContextState,
} from "../../src/contexts/router-cache";

const START = 1_000_000;
const MAX_AGE = 1000;

const probe: {
  context: RouterCacheContextState | null;
  renders: number;
} = { context: null, renders: 0 };

function ContextProbe() {
  probe.context = useRouterCacheContext();
  probe.renders += 1;

  return null;
}

function createDefaultRoutes(): CachedRoutes {
  return {
    "/fresh": {
      createdAt: START,
      href: "/fresh",
      routeId: "fresh",
      staticData: { routeCache: true },
    },
    "/stale": {
      createdAt: START,
      href: "/stale",
      routeId: "stale",
      staticData: { routeCache: { maxAge: MAX_AGE } },
    },
  };
}

function mountProvider(
  props: Partial<ComponentProps<typeof RouterCacheProvider>> = {}
) {
  probe.context = null;
  probe.renders = 0;

  render(
    <RouterCacheProvider defaultCachedRoutes={createDefaultRoutes()} {...props}>
      <ContextProbe />
    </RouterCacheProvider>
  );

  // The stale entry is still fresh at mount and expires afterwards.
  vi.setSystemTime(START + MAX_AGE * 2);
}

function readContext() {
  if (!probe.context) {
    throw new Error("The context probe did not render.");
  }

  return probe.context;
}

function cachedPathnames() {
  return Object.keys(readContext().cachedRoutes).toSorted();
}

describe("RouterCacheProvider stale pruning", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: START, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with the stale entry still cached", () => {
    mountProvider();

    expect(cachedPathnames()).toEqual(["/fresh", "/stale"]);
  });

  it("prunes stale entries when setting another route", () => {
    mountProvider();

    act(() => {
      readContext().setCachedRoutes("/other", {
        href: "/other",
        routeId: "other",
        staticData: { routeCache: true },
      });
    });

    expect(cachedPathnames()).toEqual(["/fresh", "/other"]);
  });

  it("prunes stale entries when the set is a no-op for its own route", () => {
    mountProvider();

    act(() => {
      readContext().setCachedRoutes("/fresh", {
        createdAt: START,
        href: "/fresh",
        lastVisibleAt: START,
        routeId: "fresh",
        staticData: { routeCache: true },
      });
    });

    expect(cachedPathnames()).toEqual(["/fresh"]);
  });

  it("prunes stale entries when deleting a route", () => {
    mountProvider();

    act(() => {
      readContext().deleteCachedRoutes(["/fresh"]);
    });

    expect(cachedPathnames()).toEqual([]);
  });

  it("prunes stale entries when the deleted route is not cached", () => {
    mountProvider();

    act(() => {
      readContext().deleteCachedRoutes(["/missing"]);
    });

    expect(cachedPathnames()).toEqual(["/fresh"]);
  });

  it("prunes stale entries when touching a route", () => {
    mountProvider();

    act(() => {
      readContext().touchCachedRoutes(["/fresh"]);
    });

    expect(cachedPathnames()).toEqual(["/fresh"]);
    expect(readContext().cachedRoutes["/fresh"]?.lastVisibleAt).toBe(
      START + MAX_AGE * 2
    );
  });

  it("does not touch a stale entry back to life", () => {
    mountProvider();

    act(() => {
      readContext().touchCachedRoutes(["/stale"]);
    });

    expect(cachedPathnames()).toEqual(["/fresh"]);
  });

  it("prunes stale entries when retaining an errored route", () => {
    mountProvider();

    act(() => {
      readContext().retainErroredRoute("/missing");
    });

    expect(cachedPathnames()).toEqual(["/fresh"]);
    expect(readContext().erroredRouteCounts).toEqual({ "/missing": 1 });
  });

  it("deletes a route when the desired entry is undefined", () => {
    mountProvider();

    act(() => {
      readContext().setCachedRoutes("/fresh", undefined);
    });

    expect(cachedPathnames()).toEqual([]);
  });

  it("prunes, upserts and applies limits in a single state change", () => {
    mountProvider({ maxEntries: 2 });
    const rendersBefore = probe.renders;

    act(() => {
      readContext().setCachedRoutes("/other", {
        href: "/other",
        routeId: "other",
        staticData: { routeCache: true },
      });
    });

    // /stale is pruned first, so the limit of two evicts nothing else.
    expect(cachedPathnames()).toEqual(["/fresh", "/other"]);
    expect(probe.renders - rendersBefore).toBe(1);
  });
});
