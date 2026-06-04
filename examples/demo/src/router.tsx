import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "./app-shell";
import { BasicOverviewPage } from "./pages/basic-overview-page";
import { BasicRegularFormPage } from "./pages/basic-regular-form-page";
import { BasicSavedFormPage } from "./pages/basic-saved-form-page";
import { CatalogWorkspace } from "./pages/catalog-workspace";
import { DraftWorkspace } from "./pages/draft-workspace";
import { HomePage } from "./pages/home-page";
import { PowerOverviewPage } from "./pages/power-overview-page";
import { RegularWorkspace } from "./pages/regular-workspace";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const basicOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic",
  component: BasicOverviewPage,
});

const basicSavedFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic/saved-form",
  staticData: {
    routeCache: true,
  },
  component: BasicSavedFormPage,
});

const basicRegularFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic/regular-form",
  component: BasicRegularFormPage,
});

const powerOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/power",
  component: PowerOverviewPage,
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/power/draft",
  staticData: {
    routeCache: true,
  },
  component: DraftWorkspace,
});

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/power/catalog",
  staticData: {
    routeCache: true,
  },
  component: CatalogWorkspace,
});

const regularRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/power/regular",
  component: RegularWorkspace,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  basicOverviewRoute,
  basicSavedFormRoute,
  basicRegularFormRoute,
  powerOverviewRoute,
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
