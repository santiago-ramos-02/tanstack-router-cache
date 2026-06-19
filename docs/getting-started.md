# Getting Started

`tanstack-router-cache` caches selected TanStack Router route views by keeping their rendered route tree mounted while it is hidden. Cached routes can preserve local React state, DOM state, scroll-sensitive UI, expensive list state, and in-progress forms without moving that state into a global store.

## Install

```sh
npm install tanstack-router-cache
```

```sh
bun add tanstack-router-cache
```

## Migration from TanStack Router

You do not need to change your router instance, route tree, loaders, search params, links, or navigation calls. Replace the outlet for the route branch that should support caching, then opt routes into caching with `staticData.routeCache`.

### 1. Replace the outlet

Before:

```tsx
import { Outlet } from "@tanstack/react-router";

export function AppShell() {
  return <Outlet />;
}
```

After:

```tsx
import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";

export function AppShell() {
  return (
    <RouterCacheProvider maxEntries={8} maxEntriesPerRouteId={2}>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}
```

If your app shell has navigation, sidebars, headers, or providers around `Outlet`, keep that structure and replace only the route outlet area:

```tsx
import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";

export function AppShell() {
  return (
    <RouterCacheProvider maxEntries={8} maxEntriesPerRouteId={2}>
      <AppNavigation />
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}
```

### 2. Opt routes into caching

Regular TanStack Router routes continue to work as before. Add `routeCache: true` only to routes whose mounted view should be retained after navigation.

```tsx
export const Route = createFileRoute("/customers")({
  staticData: {
    routeCache: true,
  },
  component: CustomersPage,
});
```

Routes without enabled `routeCache` are rendered and unmounted by TanStack Router normally.

When you also need TanStack Router loader cache options, use `defineRouteCache`. It keeps Router options at the top level of the route config while adding the `staticData.routeCache` opt-in for this package.

```tsx
import { defineRouteCache } from "tanstack-router-cache";

export const Route = createFileRoute("/customers")({
  ...defineRouteCache({
    gcTime: Number.POSITIVE_INFINITY,
    maxAge: 10 * 60_000,
    preloadStaleTime: 30_000,
    staleTime: Number.POSITIVE_INFINITY,
  }),
  component: CustomersPage,
});
```

In that example, `staleTime`, `preloadStaleTime`, and `gcTime` are TanStack Router route options. `maxAge` is the route-cache view lifetime; after that age the cached view is not restored and the live route renders again.

### 3. Pause route work while hidden

Existing `useEffect` calls still work. Use `useRouteCacheEffect` when an effect should run only while the cached route is visible.

```tsx
import { useRouteCacheEffect } from "tanstack-router-cache";

function CustomersPage() {
  useRouteCacheEffect(() => {
    const controller = new AbortController();

    refreshCustomers({ signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, []);

  return <CustomersTable />;
}
```

Use `useRouteCacheActive` when child components need a boolean active state instead of an effect.

## Basic setup

Place `RouterCacheProvider` and `RouterCacheOutlet` where TanStack Router would normally render child routes.

```tsx
import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";

export function AppShell() {
  return (
    <RouterCacheProvider maxEntries={8} maxEntriesPerRouteId={2}>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}
```

Mark routes that should be cached with `staticData.routeCache`.

```tsx
export const Route = createFileRoute("/customers")({
  staticData: {
    routeCache: true,
  },
  component: CustomersPage,
});
```

Routes without enabled `routeCache` are rendered normally and are removed when TanStack Router unmounts them.

## Route static data

The package augments TanStack Router's `StaticDataRouteOption` type:

```ts
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    routeCache?:
      | boolean
      | {
          maxAge?: number;
        };
  }
}
```

Set `routeCache: true` on the route whose rendered view should be retained.

```tsx
export const Route = createFileRoute("/reports")({
  staticData: {
    routeCache: true,
  },
  component: ReportsPage,
});
```

Use an object when the retained route view should expire independently from TanStack Router's loader cache:

```tsx
export const Route = createFileRoute("/reports")({
  staticData: {
    routeCache: {
      maxAge: 5 * 60_000,
    },
  },
  component: ReportsPage,
});
```

If multiple child matches are present, the cache manager checks child route static data from deepest to shallowest and uses the deepest retained route data.
