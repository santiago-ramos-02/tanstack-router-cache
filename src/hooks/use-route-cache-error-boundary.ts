import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOptionalRouterCacheContext } from "../contexts/router-cache";
import { normalizeCachedRoutePathname } from "../pathname";

export function useRouteCacheErrorBoundary(pathname?: string) {
  const context = useOptionalRouterCacheContext();
  const routePathname = useLocation({
    select: (location) => location.pathname,
  });

  useEffect(() => {
    if (!context) {
      return;
    }

    const targetPathname = normalizeCachedRoutePathname(
      pathname ?? routePathname
    );

    context.retainErroredRoute(targetPathname);

    return () => {
      context.releaseErroredRoute(targetPathname);
    };
  }, [context, pathname, routePathname]);
}
