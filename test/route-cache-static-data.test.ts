import { describe, expect, it } from "vitest";

import {
  defineRouteCache,
  getRouteCacheEffectMode,
} from "../src/route-cache-static-data";

describe("route cache static data", () => {
  it("uses paused effects by default", () => {
    expect(getRouteCacheEffectMode(defineRouteCache().staticData)).toBe(
      "pause"
    );
  });

  it("keeps the effect mode alongside loader cache options", () => {
    const options = defineRouteCache({
      effectMode: "keep-alive",
      gcTime: 30_000,
      maxAge: 60_000,
      preloadStaleTime: 10_000,
      staleTime: 20_000,
    });

    expect(options).toEqual({
      gcTime: 30_000,
      preloadStaleTime: 10_000,
      staleTime: 20_000,
      staticData: {
        routeCache: {
          effectMode: "keep-alive",
          maxAge: 60_000,
        },
      },
    });
    expect(getRouteCacheEffectMode(options.staticData)).toBe("keep-alive");
  });
});
