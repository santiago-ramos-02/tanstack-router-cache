import {
  useRouteCacheNavigation,
  useRouterCache,
} from "tanstack-router-cache";
import { StatusMetric } from "./status-metric";

export function CachePanel() {
  const { cachedRoutes, destroy, destroyAll } = useRouterCache();
  const { activeNavigation, lastCompletedNavigation } =
    useRouteCacheNavigation();
  const pathnames = Object.keys(cachedRoutes).sort((a, b) =>
    a.localeCompare(b)
  );

  return (
    <aside aria-label="Route cache status" className="inspector">
      <div>
        <p className="eyebrow">Cache monitor</p>
        <h2>{pathnames.length} retained routes</h2>
      </div>

      <div className="metric-grid">
        <StatusMetric
          label="Returning"
          value={activeNavigation?.pathname ?? "Idle"}
        />
        <StatusMetric
          label="Last restore"
          value={
            lastCompletedNavigation
              ? `${Math.round(lastCompletedNavigation.duration)}ms`
              : "Waiting"
          }
        />
      </div>

      <div className="cache-list">
        {pathnames.length === 0 ? (
          <p className="empty-state">Open a retained page to fill this list.</p>
        ) : (
          <ul aria-label="Retained route list">
            {pathnames.map((pathname) => (
              <li key={pathname}>
                <button
                  className="cache-pill"
                  onClick={() => destroy(pathname)}
                  type="button"
                >
                  <span>{pathname}</span>
                  <span>Clear</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="secondary-button"
        disabled={pathnames.length === 0}
        onClick={destroyAll}
        type="button"
      >
        Clear retained pages
      </button>
    </aside>
  );
}
