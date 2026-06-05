import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "./app-shell";
import { RoutePendingPage } from "./components/route-pending-page";
import { BasicOverviewPage } from "./pages/basic-overview-page";
import { BasicRegularFormPage } from "./pages/basic-regular-form-page";
import { BasicSavedFormPage } from "./pages/basic-saved-form-page";
import { CatalogWorkspace } from "./pages/catalog-workspace";
import { DraftWorkspace } from "./pages/draft-workspace";
import { HomePage } from "./pages/home-page";
import { PowerOverviewPage } from "./pages/power-overview-page";
import { RegularWorkspace } from "./pages/regular-workspace";
import {
  getCasePlan,
  getFreshWorkspace,
  getLiveClaimFile,
  getRepairNetwork,
  getSavedClaimFile,
  getScratchNotePad,
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
  loader: ({ abortController }) => getLiveClaimFile(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The claim desk is preparing the latest customer note."
      heading="Opening the live claim."
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
  path: "/basic/saved-form",
  loader: ({ abortController }) => getSavedClaimFile(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The customer file is loading before the page opens."
      heading="Opening the saved claim."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: BasicSavedFormPage,
});

const basicRegularFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/basic/regular-form",
  gcTime: resetRouteGcTime,
  loader: {
    handler: ({ abortController }) => getScratchNotePad(abortController.signal),
    staleReloadMode: "blocking",
  },
  pendingComponent: () => (
    <RoutePendingPage
      detail="The inbox opens as a fresh workspace every time."
      heading="Opening the inbox."
    />
  ),
  pendingMinMs,
  pendingMs,
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
  loader: ({ abortController }) => getCasePlan(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="The action list is coming from the case desk."
      heading="Opening the case plan."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: DraftWorkspace,
});

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/power/catalog",
  loader: ({ abortController }) => getRepairNetwork(abortController.signal),
  pendingComponent: () => (
    <RoutePendingPage
      detail="Repair partners are being gathered before the list opens."
      heading="Opening the repair network."
    />
  ),
  pendingMinMs,
  pendingMs,
  staticData: {
    routeCache: true,
  },
  staleTime: cachedRouteStaleTime,
  component: CatalogWorkspace,
});

const regularRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/power/regular",
  gcTime: resetRouteGcTime,
  loader: {
    handler: ({ abortController }) => getFreshWorkspace(abortController.signal),
    staleReloadMode: "blocking",
  },
  pendingComponent: () => (
    <RoutePendingPage
      detail="A new desk is being prepared for this comparison page."
      heading="Opening a fresh page."
    />
  ),
  pendingMinMs,
  pendingMs,
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
});

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router registration uses interface merging.
  interface Register {
    router: typeof router;
  }
}
