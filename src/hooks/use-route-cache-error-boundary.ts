import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOptionalRouterCacheContext } from "../contexts/router-cache";
import { normalizeCachedRoutePathname } from "../pathname";

export function useRouteCacheErrorBoundary(pathname?: string) {
  const context = useOptionalRouterCacheContext();
  const releaseErroredRoute = context?.releaseErroredRoute;
  const retainErroredRoute = context?.retainErroredRoute;
  const routePathname = useLocation({
    select: (location) => location.pathname,
  });

  useEffect(() => {
    if (!(releaseErroredRoute && retainErroredRoute)) {
      return;
    }

    const targetPathname = normalizeCachedRoutePathname(
      pathname ?? routePathname
    );

    retainErroredRoute(targetPathname);

    return () => {
      releaseErroredRoute(targetPathname);
    };
  }, [pathname, releaseErroredRoute, retainErroredRoute, routePathname]);
}
