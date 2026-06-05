import { useRouteCacheNavigation, useRouterCache } from "tanstack-router-cache";
import { StatusMetric } from "./status-metric";

const pageLabels: Record<string, string> = {
  "/": "Live case",
  "/advanced/catalog": "Repair network",
  "/advanced/draft": "Case plan",
  "/basic/saved-form": "Saved claim",
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
    <aside aria-label="Workspace shelf" className="inspector">
      <div>
        <p className="eyebrow">Workspace shelf</p>
        <h2>Saved pages</h2>
      </div>

      <div className="metric-grid">
        <StatusMetric
          label="Opening"
          value={
            activeNavigation ? getPageLabel(activeNavigation.pathname) : "Ready"
          }
        />
        <StatusMetric
          label="Last return"
          value={
            lastCompletedNavigation
              ? `${Math.round(lastCompletedNavigation.duration)}ms`
              : "None yet"
          }
        />
      </div>

      <div className="cache-list">
        {pathnames.length === 0 ? (
          <p className="empty-state">Open a saved page and it appears here.</p>
        ) : (
          <ul aria-label="Open workspace list">
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
