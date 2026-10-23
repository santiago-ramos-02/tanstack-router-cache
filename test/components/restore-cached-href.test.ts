import { describe, expect, it } from "vitest";

import { shouldRestoreCachedHref } from "../../src/components/restore-cached-href";

describe("shouldRestoreCachedHref", () => {
  it("does not restore when the active route only changes search params", () => {
    expect(
      shouldRestoreCachedHref({
        cachedHref: "/ejecucion?ejecucion_search=abc",
        currentHref: "/ejecucion?ejecucion_search=abcd",
        currentPathname: "/ejecucion",
        isRouteCacheEnabled: true,
        previousPathname: "/ejecucion",
      })
    ).toBe(false);
  });

  it("restores the cached href on a bare revisit from another route", () => {
    expect(
      shouldRestoreCachedHref({
        cachedHref: "/ejecucion?ejecucion_search=abc",
        currentHref: "/ejecucion",
        currentPathname: "/ejecucion",
        isRouteCacheEnabled: true,
        previousPathname: "/consulta",
      })
    ).toBe(true);
  });

  it("does not restore when the incoming url has explicit search params", () => {
    expect(
      shouldRestoreCachedHref({
        cachedHref: "/ejecucion?ejecucion_search=abc",
        currentHref: "/ejecucion?ejecucion_search=xyz",
        currentPathname: "/ejecucion",
        isRouteCacheEnabled: true,
        previousPathname: "/consulta",
      })
    ).toBe(false);
  });

  it("does not restore when no cached href is stored", () => {
    expect(
      shouldRestoreCachedHref({
        currentHref: "/ejecucion",
        currentPathname: "/ejecucion",
        isRouteCacheEnabled: true,
        previousPathname: "/consulta",
      })
    ).toBe(false);
  });

  it("does not restore for routes that are not cache-enabled", () => {
    expect(
      shouldRestoreCachedHref({
        cachedHref: "/ejecucion?ejecucion_search=abc",
        currentHref: "/ejecucion",
        currentPathname: "/ejecucion",
        isRouteCacheEnabled: false,
        previousPathname: "/consulta",
      })
    ).toBe(false);
  });
});
