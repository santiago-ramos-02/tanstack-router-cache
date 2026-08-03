import { describe, expect, test } from "bun:test";

import { normalizeRouterMatches } from "../src/components/route-cache-manager";

describe("normalizeRouterMatches", () => {
  test("preserves the identity of an already-valid match array", () => {
    const matches = [{ id: "root", routeId: "root" }];

    expect(normalizeRouterMatches(matches)).toBe(matches);
  });

  test("filters invalid entries from a mixed match array", () => {
    const matches = [
      { id: "root", routeId: "root" },
      { id: "invalid" },
    ];

    const normalized = normalizeRouterMatches(matches);

    expect(normalized).toEqual([{ id: "root", routeId: "root" }]);
    expect(normalized).not.toBe(matches);
  });

  test("filters holes from sparse match arrays", () => {
    const matches: unknown[] = [];
    matches.length = 2;
    matches[1] = { id: "root", routeId: "root" };

    const normalized = normalizeRouterMatches(matches);

    expect(normalized).toEqual([{ id: "root", routeId: "root" }]);
    expect(normalized).not.toBe(matches);
  });
});
