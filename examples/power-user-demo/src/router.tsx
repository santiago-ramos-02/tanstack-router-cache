import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "./app-shell";
import { CatalogWorkspace } from "./pages/catalog-workspace";
import { DraftWorkspace } from "./pages/draft-workspace";
import { HomePage } from "./pages/home-page";
import { RegularWorkspace } from "./pages/regular-workspace";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/draft",
  staticData: {
    routeCache: true,
  },
  component: DraftWorkspace,
});

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/catalog",
  staticData: {
    routeCache: true,
  },
  component: CatalogWorkspace,
});

const regularRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/regular",
  component: RegularWorkspace,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  draftRoute,
  catalogRoute,
  regularRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router registration uses interface merging.
  interface Register {
    router: typeof router;
  }
}
