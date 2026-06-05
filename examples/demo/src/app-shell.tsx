import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";
import { CachePanel } from "./components/cache-panel";
import { NavigationLink } from "./components/navigation-link";

export function AppShell() {
  return (
    <RouterCacheProvider maxEntries={6} maxEntriesPerRouteId={2}>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to case
        </a>
        <header className="top-bar">
          <div className="brand-block">
            <p className="eyebrow">tanstack-router-cache</p>
            <h1>Keep a busy page alive.</h1>
          </div>
          <nav aria-label="Demo areas" className="nav-list">
            <NavigationLink label="Live case" to="/" />
            <NavigationLink label="Guided demo" to="/basic" />
            <NavigationLink label="Saved claim" to="/basic/saved-form" />
            <NavigationLink label="Scratch note" to="/basic/regular-form" />
            <NavigationLink label="Advanced" to="/power" />
            <NavigationLink label="Case plan" to="/power/draft" />
            <NavigationLink label="Repair network" to="/power/catalog" />
            <NavigationLink label="Fresh page" to="/power/regular" />
          </nav>
        </header>
        <main className="route-surface" id="main-content">
          <RouterCacheOutlet />
        </main>
        <CachePanel />
      </div>
    </RouterCacheProvider>
  );
}
