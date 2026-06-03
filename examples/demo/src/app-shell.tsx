import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";
import { CachePanel } from "./components/cache-panel";
import { NavigationLink } from "./components/navigation-link";

export function AppShell() {
  return (
    <RouterCacheProvider maxEntries={6} maxEntriesPerRouteId={2}>
      <div className="app-shell">
        <aside className="sidebar">
          <div>
            <p className="eyebrow">tanstack-router-cache</p>
            <h1>Route state that stays ready</h1>
          </div>
          <nav aria-label="Demo routes" className="nav-list">
            <NavigationLink label="Overview" to="/" />
            <NavigationLink label="Basic setup" to="/basic" />
            <NavigationLink label="Saved form" to="/basic/saved-form" />
            <NavigationLink label="Regular form" to="/basic/regular-form" />
            <NavigationLink label="Power demo" to="/power" />
            <NavigationLink label="Draft workspace" to="/power/draft" />
            <NavigationLink label="Catalog" to="/power/catalog" />
            <NavigationLink label="Normal route" to="/power/regular" />
          </nav>
          <div className="sidebar-note">
            The basic flow is what most apps need. The power flow shows heavier
            retained-route behavior for edge cases.
          </div>
        </aside>
        <main className="route-surface">
          <RouterCacheOutlet />
        </main>
        <CachePanel />
      </div>
    </RouterCacheProvider>
  );
}
