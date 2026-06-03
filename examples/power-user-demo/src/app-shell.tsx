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
            <NavigationLink label="Draft workspace" to="/draft" />
            <NavigationLink label="Catalog" to="/catalog" />
            <NavigationLink label="Normal route" to="/regular" />
          </nav>
          <div className="sidebar-note">
            Draft and catalog stay mounted when hidden. The normal route resets
            after navigation.
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
