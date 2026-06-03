# Hooks

## `useRouterCache`

Controls cached route entries.

```tsx
import { useRouterCache } from "tanstack-router-cache";

function CacheTools() {
  const { cachedRoutes, destroy, destroyAll, invalidateWhere, isCached } =
    useRouterCache();

  return (
    <button type="button" onClick={() => destroy("/customers")}>
      Clear customers
    </button>
  );
}
```

Returns:

| Field | Type | Description |
| --- | --- | --- |
| `cachedRoutes` | `CachedRoutes` | Current cached route data keyed by normalized pathname. |
| `destroy` | `(pathname: string | string[]) => void` | Removes one or more cached pathnames. |
| `destroyAll` | `() => void` | Removes every cached route entry. |
| `invalidateWhere` | `(predicate: (pathname: string, route: CachedRouteData) => boolean) => string[]` | Removes entries that match a predicate and returns the removed pathnames. |
| `isCached` | `(pathname: string) => boolean` | Returns whether a normalized pathname currently exists in the cache. |

Example: remove all cached entries for one route id.

```tsx
const { invalidateWhere } = useRouterCache();

invalidateWhere((_, route) => route.routeId === "/customers/$customerId");
```

## `useRouteCacheActive`

Returns whether a cached route is currently visible.

```tsx
import { useRouteCacheActive } from "tanstack-router-cache";

function CustomersPage() {
  const isActive = useRouteCacheActive();

  return <CustomersTable paused={!isActive} />;
}
```

Signature:

```ts
function useRouteCacheActive(pathname?: string): boolean;
```

If `pathname` is omitted, the hook uses the current route pathname. Pass a pathname when a parent component needs to observe another cached route.

## `useRouteCacheEffect`

Runs an effect only while the current cached route is visible. Cleanup runs when the route becomes hidden, when dependencies change, and when the component unmounts.

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

Signature:

```ts
function useRouteCacheEffect(
  activeCallback: React.EffectCallback,
  deps?: React.DependencyList
): void;
```

Use this for polling, subscriptions, observers, expensive timers, or async work that should pause while the route is cached but hidden.

## `useRouteCacheActivity`

Subscribes to active/inactive changes for the current route.

```tsx
import { useRouteCacheActivity } from "tanstack-router-cache";

function CustomersPage() {
  useRouteCacheActivity((active) => {
    if (active) {
      console.log("Customers became visible");
    }
  });

  return <CustomersTable />;
}
```

Signature:

```ts
function useRouteCacheActivity(fn: (active: boolean) => void): void;
```

`active` is `true` when the route is visible and `false` when it is hidden or removed from the visible route position.

## `useRouteCacheNavigation`

Reports navigation timing for cached-route restores.

```tsx
import { useRouteCacheNavigation } from "tanstack-router-cache";

function NavigationProgress() {
  const { activeNavigation, lastCompletedNavigation } =
    useRouteCacheNavigation();

  if (activeNavigation) {
    return <Spinner />;
  }

  return lastCompletedNavigation ? (
    <span>{Math.round(lastCompletedNavigation.duration)} ms</span>
  ) : null;
}
```

Returns:

| Field | Type | Description |
| --- | --- | --- |
| `activeNavigation` | `RouteCacheNavigationStart | null` | The current cached navigation, if one is in progress. |
| `lastCompletedNavigation` | `RouteCacheNavigationComplete | null` | Timing data for the most recent completed cached navigation. |

`RouteCacheNavigationStart`:

| Field | Type | Description |
| --- | --- | --- |
| `pathname` | `string` | Cached route pathname being restored. |
| `startedAt` | `number` | `performance.now()` timestamp when cached navigation began. |

`RouteCacheNavigationComplete`:

| Field | Type | Description |
| --- | --- | --- |
| `pathname` | `string` | Cached route pathname that completed. |
| `startedAt` | `number` | Start timestamp from the matching navigation. |
| `visibleAt` | `number` | Timestamp after the cached route became visible. |
| `paintedAt` | `number` | Timestamp after the next animation frame. |
| `duration` | `number` | `paintedAt - startedAt`. |

## `useRouteCacheErrorBoundary`

Marks the current route as errored while an error boundary fallback is mounted. Errored routes are removed from the cache so users do not keep returning to a failed cached view.

```tsx
import { useRouteCacheErrorBoundary } from "tanstack-router-cache";

function RouteErrorFallback() {
  useRouteCacheErrorBoundary();

  return <p>Something went wrong.</p>;
}
```

Signature:

```ts
function useRouteCacheErrorBoundary(pathname?: string): void;
```

If `pathname` is omitted, the hook uses the current route pathname.

