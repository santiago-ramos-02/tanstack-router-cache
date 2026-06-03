import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "./app-shell";
import { HomePage } from "./routes/home-page";
import { RegularFormRoute } from "./routes/regular-form-route";
import { SavedFormRoute } from "./routes/saved-form-route";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const savedFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/saved-form",
  staticData: {
    routeCache: true,
  },
  component: SavedFormRoute,
});

const regularFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/regular-form",
  component: RegularFormRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  savedFormRoute,
  regularFormRoute,
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
