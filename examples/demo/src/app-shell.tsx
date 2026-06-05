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
            <div className="brand-lockup">
              <img
                alt=""
                className="brand-logo"
                height="34"
                src="/logo.svg"
                width="34"
              />
              <div className="brand-copy">
                <p className="brand-name">ClaimDesk Live</p>
                <p className="eyebrow">Northline Mutual</p>
              </div>
            </div>
          </div>
          <nav aria-label="Demo areas">
            <ul className="nav-list">
              <li>
                <NavigationLink label="Live case" to="/" />
              </li>
              <li className="nav-group">
                <span className="nav-label">Compare</span>
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
                <span className="nav-label">Workbench</span>
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
