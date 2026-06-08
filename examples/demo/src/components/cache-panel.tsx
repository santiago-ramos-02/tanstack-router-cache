import { useRouteCacheNavigation, useRouterCache } from "tanstack-router-cache";

const pageLabels: Record<string, string> = {
  "/": "Saved page",
  "/advanced/list": "Saved list",
  "/advanced/draft": "Saved draft",
  "/basic/cached-form": "Cached form",
};

function getPageLabel(pathname: string) {
  return pageLabels[pathname] ?? pathname;
}

export function CachePanel() {
  const { cachedRoutes, destroy } = useRouterCache();
  const { activeNavigation, lastCompletedNavigation } =
    useRouteCacheNavigation();
  const pathnames = Object.entries(cachedRoutes)
    .flatMap(([pathname, route]) =>
      route.ready && route.routerSnapshot ? [pathname] : []
    )
    .sort((a, b) => a.localeCompare(b));

  return (
    <aside aria-label="Saved page controls" className="inspector">
      <div>
        <p className="eyebrow">Route cache</p>
        <h2>Saved pages</h2>
      </div>

      <p className="shelf-meta">
        {activeNavigation ? getPageLabel(activeNavigation.pathname) : "Ready"}
        {lastCompletedNavigation
          ? ` · ${Math.round(lastCompletedNavigation.duration)}ms return`
          : ""}
      </p>

      <div className="cache-list">
        {pathnames.length === 0 ? (
          <p className="empty-state">Open a cached page and it appears here.</p>
        ) : (
          <ul aria-label="Saved page list">
            {pathnames.map((pathname) => (
              <li key={pathname}>
                <button
                  className="cache-pill"
                  onClick={() => destroy(pathname)}
                  type="button"
                >
                  <span>{getPageLabel(pathname)}</span>
                  <span>Close</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="secondary-button"
        disabled={pathnames.length === 0}
        onClick={() => destroy(pathnames)}
        type="button"
      >
        Close saved pages
      </button>
    </aside>
  );
}
