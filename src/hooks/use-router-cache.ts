import type { CachedRouteData } from "../contexts/router-cache";
import { useRouterCacheContext } from "../contexts/router-cache";
import { normalizeCachedRoutePathname } from "../pathname";
import { useEventListener } from "./use-event-listener";
import { useUpdate } from "./use-update";

type InvalidateWherePredicate = (
  pathname: string,
  route: CachedRouteData
) => boolean;

export function useRouterCache() {
  const { cachedRoutes, deleteCachedRoutes } = useRouterCacheContext();

  const update = useUpdate();

  useEventListener({
    on: {
      activeChange: () => {
        update();
      },
    },
  });

  const destroy = (pathname: string | string[]) => {
    const pathnames = Array.isArray(pathname) ? pathname : [pathname];
    deleteCachedRoutes(pathnames);
  };

  const destroyAll = () => {
    deleteCachedRoutes(Object.keys(cachedRoutes));
  };

  const invalidateWhere = (predicate: InvalidateWherePredicate) => {
    const pathnames = Object.entries(cachedRoutes).flatMap(
      ([pathname, route]) => (predicate(pathname, route) ? [pathname] : [])
    );

    if (pathnames.length > 0) {
      deleteCachedRoutes(pathnames);
    }

    return pathnames;
  };

  return {
    cachedRoutes,
    destroy,
    destroyAll,
    invalidateWhere,
    isCached: (pathname: string) =>
      Object.hasOwn(cachedRoutes, normalizeCachedRoutePathname(pathname)),
  };
}
