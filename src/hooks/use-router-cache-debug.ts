import { useEffect, useMemo, useRef } from "react";
import type { CachedRoutes } from "../contexts/router-cache";

const DYNAMIC_SEGMENT_PATTERNS = [
  /^\d{4,}$/u,
  /^[0-9a-f]{8,}$/iu,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
] as const;
type RouterCacheDebugSnapshot = {
  cachedRoutePathnames: string[];
  dynamicLookingRouteCount: number;
  dynamicLookingRoutePathnames: string[];
  hiddenCachedRouteCount: number;
  hiddenContainerCount: number;
  totalCachedRouteCount: number;
  visiblePathname: string;
};

type RouterCacheDebugApi = {
  getSnapshot: () => RouterCacheDebugSnapshot;
  lastSnapshot?: RouterCacheDebugSnapshot;
  refresh: () => RouterCacheDebugSnapshot;
  setWarningThreshold: (nextThreshold?: number | null) => void;
  warningThreshold?: number | null;
};

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Window must be extended through interface merging.
  interface Window {
    __TANSTACK_ROUTER_CACHE_DEBUG__?: RouterCacheDebugApi;
  }
}

function isDynamicLookingSegment(segment: string) {
  for (const pattern of DYNAMIC_SEGMENT_PATTERNS) {
    if (pattern.test(segment)) {
      return true;
    }
  }

  return false;
}

function isDynamicLookingPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  return segments.some(isDynamicLookingSegment);
}

function countHiddenContainers() {
  if (typeof document === "undefined") {
    return 0;
  }

  return document.querySelectorAll(
    '[data-router-cache-container="true"][data-router-cache-mode="hidden"]'
  ).length;
}

function buildSnapshot(
  cachedRoutes: CachedRoutes,
  visiblePathname: string
): RouterCacheDebugSnapshot {
  const cachedRoutePathnames = Object.keys(cachedRoutes).sort((a, b) =>
    a.localeCompare(b)
  );
  const dynamicLookingRoutePathnames = cachedRoutePathnames.filter(
    isDynamicLookingPathname
  );
  const hiddenCachedRoutePathnames = cachedRoutePathnames.filter(
    (pathname) => pathname !== visiblePathname
  );

  return {
    cachedRoutePathnames,
    dynamicLookingRouteCount: dynamicLookingRoutePathnames.length,
    dynamicLookingRoutePathnames,
    hiddenCachedRouteCount: hiddenCachedRoutePathnames.length,
    hiddenContainerCount: countHiddenContainers(),
    totalCachedRouteCount: cachedRoutePathnames.length,
    visiblePathname,
  };
}

function getDebugWindow() {
  return globalThis.window;
}

function isProduction() {
  const environment = (
    globalThis as typeof globalThis & {
      process?: {
        env?: {
          NODE_ENV?: string;
        };
      };
    }
  ).process?.env?.NODE_ENV;

  return environment === "production";
}

export function useRouterCacheDebug(
  cachedRoutes: CachedRoutes,
  visiblePathname: string
) {
  const warningThresholdRef = useRef<number | null>(null);
  const lastWarnedCountRef = useRef<number | null>(null);
  const lastSnapshotRef = useRef<RouterCacheDebugSnapshot | null>(null);
  if (lastSnapshotRef.current === null) {
    lastSnapshotRef.current = buildSnapshot(cachedRoutes, visiblePathname);
  }

  const snapshot = useMemo(
    () => buildSnapshot(cachedRoutes, visiblePathname),
    [cachedRoutes, visiblePathname]
  );

  useEffect(() => {
    if (isProduction()) {
      return;
    }

    const debugWindow = getDebugWindow();
    if (!debugWindow) {
      return;
    }

    const refresh = () => {
      lastSnapshotRef.current = buildSnapshot(cachedRoutes, visiblePathname);
      return lastSnapshotRef.current;
    };

    const api: RouterCacheDebugApi = {
      getSnapshot: () => lastSnapshotRef.current ?? snapshot,
      lastSnapshot: snapshot,
      refresh,
      setWarningThreshold: (nextThreshold) => {
        warningThresholdRef.current =
          typeof nextThreshold === "number" ? nextThreshold : null;
        lastWarnedCountRef.current = null;
      },
      warningThreshold: warningThresholdRef.current,
    };

    debugWindow.__TANSTACK_ROUTER_CACHE_DEBUG__ = api;

    const rafId = globalThis.requestAnimationFrame(() => {
      const nextSnapshot = refresh();
      debugWindow.__TANSTACK_ROUTER_CACHE_DEBUG__ = {
        ...api,
        lastSnapshot: nextSnapshot,
        warningThreshold: warningThresholdRef.current,
      };

      const warningThreshold = warningThresholdRef.current;
      if (
        typeof warningThreshold === "number" &&
        nextSnapshot.totalCachedRouteCount > warningThreshold &&
        lastWarnedCountRef.current !== nextSnapshot.totalCachedRouteCount
      ) {
        lastWarnedCountRef.current = nextSnapshot.totalCachedRouteCount;
      }
    });

    return () => {
      globalThis.cancelAnimationFrame(rafId);
      if (debugWindow.__TANSTACK_ROUTER_CACHE_DEBUG__ === api) {
        debugWindow.__TANSTACK_ROUTER_CACHE_DEBUG__ = undefined;
      }
    };
  }, [cachedRoutes, snapshot, visiblePathname]);
}
