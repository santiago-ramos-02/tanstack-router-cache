import { render, screen } from "@testing-library/react";
import { useLayoutEffect, useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  RouterCacheProvider,
  useRouterCacheContext,
} from "../../src/contexts/router-cache";

function LoopingNonRouterCacheRouteWriter() {
  const { cachedRoutes, setCachedRoutes } = useRouterCacheContext();
  const route = cachedRoutes["/ejecucion"];

  useLayoutEffect(() => {
    setCachedRoutes("/ejecucion", {
      ...route,
      href: "/ejecucion",
      staticData: {
        routeCache: false,
      },
    });
  });

  return <span>{route?.href ?? "missing"}</span>;
}

function NormalizedRouterCacheRouteWriter() {
  const { cachedRoutes, setCachedRoutes } = useRouterCacheContext();
  const hasWrittenRef = useRef(false);

  useLayoutEffect(() => {
    if (hasWrittenRef.current) {
      return;
    }

    hasWrittenRef.current = true;
    setCachedRoutes("/consulta/", {
      href: "/consulta/",
      rootRouteId: "consulta-match",
      ready: true,
      staticData: {
        routeCache: true,
      },
    });
  }, [setCachedRoutes]);

  return <span>{cachedRoutes["/consulta"]?.href ?? "missing"}</span>;
}

function MaxEntriesRouterCacheRouteWriter() {
  const { cachedRoutes, setCachedRoutes } = useRouterCacheContext();
  const hasWrittenRef = useRef(false);

  useLayoutEffect(() => {
    if (hasWrittenRef.current) {
      return;
    }

    hasWrittenRef.current = true;
    setCachedRoutes("/consulta", {
      href: "/consulta",
      routeId: "consulta",
      staticData: {
        routeCache: true,
      },
    });
    setCachedRoutes("/radicacion", {
      href: "/radicacion",
      routeId: "radicacion",
      staticData: {
        routeCache: true,
      },
    });
    setCachedRoutes("/validacion", {
      href: "/validacion",
      routeId: "validacion",
      staticData: {
        routeCache: true,
      },
    });
  }, [setCachedRoutes]);

  return (
    <span>
      {Object.keys(cachedRoutes)
        .toSorted((a, b) => a.localeCompare(b))
        .join(",")}
    </span>
  );
}

function MaxEntriesPerRouteWriter() {
  const { cachedRoutes, setCachedRoutes } = useRouterCacheContext();
  const hasWrittenRef = useRef(false);

  useLayoutEffect(() => {
    if (hasWrittenRef.current) {
      return;
    }

    hasWrittenRef.current = true;
    setCachedRoutes("/consulta/1", {
      href: "/consulta/1",
      routeId: "consulta",
      staticData: {
        routeCache: true,
      },
    });
    setCachedRoutes("/consulta/2", {
      href: "/consulta/2",
      routeId: "consulta",
      staticData: {
        routeCache: true,
      },
    });
    setCachedRoutes("/radicacion", {
      href: "/radicacion",
      routeId: "radicacion",
      staticData: {
        routeCache: true,
      },
    });
  }, [setCachedRoutes]);

  return (
    <span>
      {Object.keys(cachedRoutes)
        .toSorted((a, b) => a.localeCompare(b))
        .join(",")}
    </span>
  );
}

function ErroredRouteWriter() {
  const {
    cachedRoutes,
    erroredRouteCounts,
    releaseErroredRoute,
    retainErroredRoute,
    setCachedRoutes,
  } = useRouterCacheContext();
  const hasWrittenRef = useRef(false);

  useLayoutEffect(() => {
    if (hasWrittenRef.current) {
      return;
    }

    hasWrittenRef.current = true;
    setCachedRoutes("/consulta", {
      href: "/consulta",
      routeId: "consulta",
      staticData: {
        routeCache: true,
      },
    });
    retainErroredRoute("/consulta");
    releaseErroredRoute("/consulta");
  }, [releaseErroredRoute, retainErroredRoute, setCachedRoutes]);

  return (
    <span>
      {`${Object.keys(cachedRoutes).join(",")}|${erroredRouteCounts["/consulta"] ?? 0}`}
    </span>
  );
}

describe("RouterCacheProvider", () => {
  it("never stores non-cache routes", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      expect(() =>
        render(
          <RouterCacheProvider>
            <LoopingNonRouterCacheRouteWriter />
          </RouterCacheProvider>
        )
      ).not.toThrow();

      expect(screen.getByText("missing")).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("normalizes cached route pathnames", () => {
    render(
      <RouterCacheProvider>
        <NormalizedRouterCacheRouteWriter />
      </RouterCacheProvider>
    );

    expect(screen.getByText("/consulta/")).toBeInTheDocument();
  });

  it("evicts the oldest hidden entries when maxEntries is reached", () => {
    render(
      <RouterCacheProvider maxEntries={2}>
        <MaxEntriesRouterCacheRouteWriter />
      </RouterCacheProvider>
    );

    expect(screen.getByText("/radicacion,/validacion")).toBeInTheDocument();
  });

  it("limits cached entries per routeId", () => {
    render(
      <RouterCacheProvider maxEntries={3} maxEntriesPerRouteId={1}>
        <MaxEntriesPerRouteWriter />
      </RouterCacheProvider>
    );

    expect(screen.getByText("/consulta/2,/radicacion")).toBeInTheDocument();
  });

  it("evicts errored routes and clears their error block when released", () => {
    render(
      <RouterCacheProvider>
        <ErroredRouteWriter />
      </RouterCacheProvider>
    );

    expect(screen.getByText("|0")).toBeInTheDocument();
  });
});
