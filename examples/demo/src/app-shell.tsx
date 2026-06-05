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
          <nav aria-label="Demo areas">
            <ul className="nav-list">
              <li>
                <NavigationLink label="Live case" to="/" />
              </li>
              <li className="nav-group">
                <NavigationLink label="Guided demo" to="/basic" />
                <ul className="nav-children">
                  <li>
                    <NavigationLink
                      label="Saved claim"
                      to="/basic/saved-form"
                    />
                  </li>
                  <li>
                    <NavigationLink
                      label="Scratch note"
                      to="/basic/regular-form"
                    />
                  </li>
                </ul>
              </li>
              <li className="nav-group">
                <NavigationLink label="Advanced" to="/advanced" />
                <ul className="nav-children">
                  <li>
                    <NavigationLink label="Case plan" to="/advanced/draft" />
                  </li>
                  <li>
                    <NavigationLink
                      label="Repair network"
                      to="/advanced/catalog"
                    />
                  </li>
                  <li>
                    <NavigationLink label="Fresh page" to="/advanced/regular" />
                  </li>
                </ul>
              </li>
            </ul>
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
