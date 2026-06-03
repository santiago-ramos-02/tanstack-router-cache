import { Link } from "@tanstack/react-router";
import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";

export function AppShell() {
  return (
    <RouterCacheProvider>
      <div className="app-shell">
        <header>
          <div>
            <p>tanstack-router-cache</p>
            <h1>Retain one route, reset another</h1>
          </div>
          <nav aria-label="Example routes">
            <Link activeProps={{ "data-active": "true" }} to="/">
              Overview
            </Link>
            <Link activeProps={{ "data-active": "true" }} to="/saved-form">
              Saved form
            </Link>
            <Link activeProps={{ "data-active": "true" }} to="/regular-form">
              Regular form
            </Link>
          </nav>
        </header>
        <main>
          <RouterCacheOutlet />
        </main>
      </div>
    </RouterCacheProvider>
  );
}
