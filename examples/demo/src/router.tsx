import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "./app-shell";
import { RoutePendingPage } from "./components/route-pending-page";
import { AdvancedOverviewPage } from "./pages/advanced-overview-page";
import { BasicCachedFormPage } from "./pages/basic-cached-form-page";
import { BasicOverviewPage } from "./pages/basic-overview-page";
import { BasicResetFormPage } from "./pages/basic-reset-form-page";
import { HomePage } from "./pages/home-page";
import { ResetPage } from "./pages/reset-page";
import { SavedDraftPage } from "./pages/saved-draft-page";
import { SavedListPage } from "./pages/saved-list-page";
import {
  getCachedFormDemo,
  getResetFormDemo,
  getResetPageDemo,
  getSavedDraftDemo,
  getSavedListDemo,
  getSavedPageDemo,
} from "./server-functions";

const cachedRouteStaleTime = Number.POSITIVE_INFINITY;
const resetRouteGcTime = 0;
const pendingMs = 0;
const pendingMinMs = 450;

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: ({ abortController }) => getSavedPageDemo(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The saved page example is loading before the page opens."
      heading="Opening saved page."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: HomePage,
});

const basicOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic",
  component: BasicOverviewPage,
});

const basicSavedFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic/cached-form",
  loader: ({ abortController }) => getCachedFormDemo(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The cached form example is loading before the page opens."
      heading="Opening cached form."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: BasicCachedFormPage,
});

const basicRegularFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic/reset-form",
  gcTime: resetRouteGcTime,
  loader: {
    handler: ({ abortController }) => getResetFormDemo(abortController.signal),
    staleReloadMode: "blocking",
  },
  pendingComponent: () => (
    <RoutePendingPage
      detail="The reset form loads as a new page each time."
      heading="Opening reset form."
    />
  ),
  pendingMinMs,
  pendingMs,
  component: BasicResetFormPage,
});

const advancedOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/advanced",
  component: AdvancedOverviewPage,
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/advanced/draft",
  loader: ({ abortController }) => getSavedDraftDemo(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The saved draft example is loading before the page opens."
      heading="Opening saved draft."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: SavedDraftPage,
});

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/advanced/list",
  loader: ({ abortController }) => getSavedListDemo(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The saved list example is loading before the page opens."
      heading="Opening saved list."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: SavedListPage,
});

const regularRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/advanced/reset",
  gcTime: resetRouteGcTime,
  loader: {
    handler: ({ abortController }) => getResetPageDemo(abortController.signal),
    staleReloadMode: "blocking",
  },
  pendingComponent: () => (
    <RoutePendingPage
      detail="The reset page loads from a clean state for comparison."
      heading="Opening reset page."
    />
  ),
  pendingMinMs,
  pendingMs,
  component: ResetPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  basicOverviewRoute,
  basicSavedFormRoute,
  basicRegularFormRoute,
  advancedOverviewRoute,
  draftRoute,
  catalogRoute,
  regularRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router registration uses interface merging.
  interface Register {
    router: typeof router;
  }
}
