import { render, screen } from "@testing-library/react";
import { createElement, Fragment } from "react";
import { describe, expect, test } from "vitest";

import {
  RouterCacheProvider,
  useRouterCacheContext,
} from "../../src/contexts/router-cache";
import type { CachedRoutes } from "../../src/contexts/router-cache";

const CONSULTA_ROUTE_COUNT = 1000;
const VALIDACION_ROUTE_COUNT = 600;
const MAX_ENTRIES = 100;
const MAX_ENTRIES_PER_ROUTE_ID = 50;

function createSearchParams(index: number) {
  return new URLSearchParams({
    consulta_filters: `estado:${index % 7};gestor:${index % 13}`,
    consulta_page: String((index % 40) + 1),
    consulta_per_page: "25",
    consulta_sort:
      index % 2 === 0
        ? "numero_predial_nacional:asc"
        : "numero_predial_nacional:desc",
  }).toString();
}

function addCachedRoute(
  routes: CachedRoutes,
  pathname: string,
  routeId: string,
  index: number
) {
  routes[`${pathname}/`] = {
    createdAt: index,
    href: `${pathname}/?${createSearchParams(index)}`,
    lastVisibleAt: index,
    routeId,
    staticData: {
      routeCache: true,
    },
  };
}

function createCachedRoutesFixture() {
  const routes: CachedRoutes = {};

  for (let index = 0; index < CONSULTA_ROUTE_COUNT; index += 1) {
    addCachedRoute(
      routes,
      `/consulta/predio/${index}`,
      "consulta-predio",
      index
    );
  }

  for (let index = 0; index < VALIDACION_ROUTE_COUNT; index += 1) {
    addCachedRoute(
      routes,
      `/validacion/solicitudes/${index}`,
      "validacion-solicitudes",
      index
    );
  }

  return routes;
}

function output(testId: string, value: string | number) {
  return createElement("output", { "data-testid": testId, key: testId }, value);
}

function RouteCacheVolumeProbe() {
  const { cachedRoutes } = useRouterCacheContext();
  const keys = Object.keys(cachedRoutes);
  const consultaKeys = keys.filter((key) => key.startsWith("/consulta/"));
  const validacionKeys = keys.filter((key) => key.startsWith("/validacion/"));

  return createElement(
    Fragment,
    null,
    output("total-count", keys.length),
    output("consulta-count", consultaKeys.length),
    output("validacion-count", validacionKeys.length),
    output(
      "old-consulta",
      cachedRoutes["/consulta/predio/949"] ? "present" : "missing"
    ),
    output(
      "new-consulta",
      cachedRoutes["/consulta/predio/999"]?.href ?? "missing"
    ),
    output(
      "old-validacion",
      cachedRoutes["/validacion/solicitudes/549"] ? "present" : "missing"
    ),
    output(
      "new-validacion",
      cachedRoutes["/validacion/solicitudes/599"]?.href ?? "missing"
    ),
    output("normalized", cachedRoutes["/consulta/predio/999/"] ? "bad" : "ok")
  );
}

describe("router cache volume behavior", () => {
  test("limits many cached route entries while preserving search-heavy hrefs", () => {
    const defaultCachedRoutes = createCachedRoutesFixture();
    const providerProps = {
      children: createElement(RouteCacheVolumeProbe),
      defaultCachedRoutes,
      maxEntries: MAX_ENTRIES,
      maxEntriesPerRouteId: MAX_ENTRIES_PER_ROUTE_ID,
    };

    const startedAt = performance.now();
    render(createElement(RouterCacheProvider, providerProps));
    const duration = performance.now() - startedAt;

    expect(screen.getByTestId("total-count")).toHaveTextContent("100");
    expect(screen.getByTestId("consulta-count")).toHaveTextContent("50");
    expect(screen.getByTestId("validacion-count")).toHaveTextContent("50");
    expect(screen.getByTestId("old-consulta")).toHaveTextContent("missing");
    expect(screen.getByTestId("new-consulta")).toHaveTextContent(
      "/consulta/predio/999/?"
    );
    expect(screen.getByTestId("new-consulta")).toHaveTextContent(
      "consulta_sort=numero_predial_nacional%3Adesc"
    );
    expect(screen.getByTestId("old-validacion")).toHaveTextContent("missing");
    expect(screen.getByTestId("new-validacion")).toHaveTextContent(
      "/validacion/solicitudes/599/?"
    );
    expect(screen.getByTestId("normalized")).toHaveTextContent("ok");
    expect(duration).toBeLessThan(1000);
  });
});
