# Architecture

This page explains how `tanstack-router-cache` is built: runtime pieces, state shape, rendering flow, eviction, events, and memory behavior.

## Quick map

`tanstack-router-cache` replaces the normal TanStack Router outlet area with a cache manager. The live route still comes from TanStack Router. Cacheable route trees are captured after they become ready, then rendered from a stored router snapshot when they should stay mounted.

```mermaid
flowchart TD
  router["TanStack Router state"]
  provider["RouterCacheProvider"]
  outlet["RouterCacheOutlet"]
  manager["Cache manager"]
  live["Live Outlet"]
  cache["CachedRoutes map"]
  cachedOutlet["CachedOutlet"]
  snapshot["Router snapshot"]
  activity["React Activity container"]
  hooks["Hooks and debug API"]

  provider --> outlet
  router --> manager
  outlet --> manager
  manager --> live
  manager --> cache
  cache --> cachedOutlet
  cachedOutlet --> snapshot
  snapshot --> activity
  manager --> hooks
```

## Runtime pieces

| Piece | Responsibility |
| --- | --- |
| `RouterCacheProvider` | Owns cache state, cache limits, scope resets, and errored-route tracking. |
| `RouterCacheOutlet` | Replaces TanStack Router's outlet for the route branch that can be cached. |
| Cache manager | Reads live router state, decides whether to render the live outlet or cached outlets, and synchronizes cache entries. |
| `CachedOutlet` | Renders a cached route from a stored router snapshot and match id. |
| `OffScreen` | Wraps cached route content in React `Activity` and marks the route as `visible` or `hidden`. |
| Event listener | Emits route activity and cached-navigation lifecycle events used by hooks. |
| Debug hook | Exposes development diagnostics on `window.__TANSTACK_ROUTER_CACHE_DEBUG__`. |
| Transient UI tracker | Tracks external UI added outside the route container and hides or restores it with the owning route. |

## Route lifecycle

A route becomes cacheable only after the current match is resolved, successful, and marked with `staticData.routeCache: true`.

```mermaid
stateDiagram-v2
  [*] --> LiveRoute: normal TanStack render
  LiveRoute --> WaitingForReady: routeCache true
  WaitingForReady --> CachedReady: match success and snapshot stored
  CachedReady --> VisibleCached: pathname is visible
  VisibleCached --> HiddenCached: navigate away
  HiddenCached --> VisibleCached: navigate back
  HiddenCached --> Evicted: cache limit or manual invalidation
  VisibleCached --> Evicted: route error or no longer cacheable
  Evicted --> [*]
```

In normal usage, a cached route alternates between `visible` and `hidden`. It leaves the cache when a limit evicts it, the app invalidates it, the route stops being cacheable, or an error boundary marks it as failed.

## Provider state

The provider stores cached routes by normalized pathname. The same object is exposed publicly as `cachedRoutes`.

```ts
type CachedRoutes = {
  [normalizedPathname: string]: CachedRouteData;
};

type ErroredRouteCounts = Record<string, number>;
```

```mermaid
flowchart LR
  provider["RouterCacheProvider"]
  routes["CachedRoutes map"]
  errors["ErroredRouteCounts"]
  limits["Cache limits"]
  scope["cacheScopeKey"]

  provider --> routes
  provider --> errors
  provider --> limits
  scope --> provider
```

`ErroredRouteCounts` prevents failed cached views from being reused while an error fallback is mounted. It is count-based so repeated error-boundary hooks can retain and release the same pathname safely.

The provider exposes these operations to the cache manager and hooks:

| Operation | Purpose |
| --- | --- |
| Upsert cached route | Insert or update one cached route entry after normalizing the pathname. |
| Delete cached routes | Remove cached entries. Used by invalidation, errored routes, and cache manager cleanup. |
| Touch cached routes | Update `lastVisibleAt` when a cached route becomes visible. |
| Retain errored route | Mark a pathname as currently errored and remove its cached entry. |
| Release errored route | Release one error retain count for a pathname. |

## Cached route data

Each cache entry is small. The large memory cost is the retained React tree, not this data object.

```ts
type CachedRouteData = {
  createdAt?: number;
  href?: string;
  lastVisibleAt?: number;
  routeId?: string;
  staticData: StaticDataRouteOption;
  matchId?: string;
  routerSnapshot?: RouterSnapshot;
  ready?: boolean;
};
```

```mermaid
classDiagram
  class CachedRouteData {
    createdAt
    href
    lastVisibleAt
    routeId
    staticData
    matchId
    routerSnapshot
    ready
  }

  class RouterSnapshot {
    snapshot stores
    snapshot matches
    live navigate
    live invalidate
    live preloadRoute
  }

  CachedRouteData --> RouterSnapshot : uses
```

| Field | Role |
| --- | --- |
| `createdAt` | First time the entry was stored. Used as an eviction fallback. |
| `href` | Full route href, including search and hash when available. Used for restoration. |
| `lastVisibleAt` | Last time the entry became visible. Primary eviction timestamp. |
| `routeId` | TanStack route id. Used by `maxEntriesPerRouteId`. |
| `staticData` | Route static data. The route is cacheable when `routeCache` is `true`. |
| `matchId` | Match id used to render the cached route with TanStack Router's `Match`. |
| `routerSnapshot` | Router-like object with isolated snapshot stores used by the cached route tree. |
| `ready` | Marks that the route has a complete snapshot and can be rendered from cache. |

Pathnames are normalized by removing trailing slashes except for `/`, so `/customers/` and `/customers` share one cache key.

## Router snapshot

Cached route trees still expect TanStack Router context. Instead of connecting every cached tree directly to the live router stores, the package creates a router-like snapshot when a route becomes ready.

```mermaid
flowchart TD
  liveRouter["Live router"]
  matches["Current matches"]
  location["Current location"]
  snapshotStores["Snapshot stores"]
  liveMethods["Bound live methods"]
  routerSnapshot["Router snapshot"]
  cachedOutlet["CachedOutlet"]
  match["Match by cached matchId"]

  liveRouter --> matches
  liveRouter --> location
  matches --> snapshotStores
  location --> snapshotStores
  liveRouter --> liveMethods
  snapshotStores --> routerSnapshot
  liveMethods --> routerSnapshot
  routerSnapshot --> cachedOutlet
  cachedOutlet --> match
```

The snapshot owns isolated stores for the current matches, location, resolved location, and match stores. It also keeps selected live router methods bound to the real router, including `navigate`, `invalidate`, `preloadRoute`, and location builders.

When the cached entry is refreshed, the cache manager updates those snapshot stores in place. This lets route hooks read current match and search data without remounting the retained route tree. Imperative router actions still call through to the real router.

`CachedOutlet` renders that snapshot like this:

```tsx
<RouterContextProvider router={routerSnapshot}>
  <Match matchId={matchId} />
</RouterContextProvider>
```

## Cache synchronization

On every relevant router state change, the cache manager checks the current route state and updates the cache.

```mermaid
flowchart TD
  start["Router state changed"]
  read["Read pathname, href, matches, status"]
  normalize["Normalize pathnames"]
  staticData["Find deepest routeCache static data"]
  errored{"Current route errored?"}
  resolved{"Match resolved?"}
  cacheable{"routeCache true?"}
  ready{"Match successful?"}
  write["Create or refresh cache entry"]
  deleteEntry["Delete cache entry"]
  wait["Wait for next router update"]
  render["Render cached outlets and maybe live outlet"]

  start --> read --> normalize --> staticData --> errored
  errored -- yes --> deleteEntry --> render
  errored -- no --> resolved
  resolved -- no --> wait
  resolved -- yes --> cacheable
  cacheable -- no --> deleteEntry
  cacheable -- yes --> ready
  ready -- no --> wait
  ready -- yes --> write --> render
  deleteEntry --> render
```

The current entry being written is protected during limit enforcement so the route that just became ready is not immediately evicted.

## Visible pathname

The manager tracks three pathnames:

| Name | Meaning |
| --- | --- |
| `routerPathname` | Current router location pathname. |
| `resolvedPathname` | Resolved router location pathname. |
| `visiblePathname` | Cached pathname that should currently be shown. |

```mermaid
flowchart TD
  routerPathname["routerPathname"]
  resolvedPathname["resolvedPathname"]
  readyDestination{"Destination is ready cached route?"}
  ancestor{"Router pathname is ancestor?"}
  useRouter["visiblePathname = routerPathname"]
  useResolved["visiblePathname = resolvedPathname"]

  routerPathname --> readyDestination
  resolvedPathname --> readyDestination
  readyDestination -- yes --> useRouter
  readyDestination -- no --> ancestor
  ancestor -- yes --> useRouter
  ancestor -- no --> useResolved
```

Most of the time, `visiblePathname` is the resolved pathname. During some navigations, TanStack Router can temporarily expose a router pathname that differs from the resolved pathname. If the destination is already cached, the package can show it immediately.

## Rendering model

Every ready cached entry is rendered through `OffScreen`.

```tsx
<OffScreen mode={visiblePathname === pathname ? "visible" : "hidden"}>
  <CachedOutlet matchId={route.matchId} routerSnapshot={route.routerSnapshot} />
</OffScreen>
```

```mermaid
flowchart TD
  routes["CachedRoutes entries"]
  entry["Ready cache entry"]
  offscreen["OffScreen"]
  activity["React Activity"]
  mode{"Visible pathname matches entry?"}
  visible["mode = visible"]
  hidden["mode = hidden"]
  dom["data-router-cache attributes"]

  routes --> entry --> offscreen --> activity --> mode
  mode -- yes --> visible --> dom
  mode -- no --> hidden --> dom
```

`OffScreen` uses React `Activity` with either `visible` or `hidden` mode. The route tree remains mounted in both modes. The wrapping element gets these attributes:

```html
<div
  data-router-cache-container="true"
  data-router-cache-mode="hidden"
  data-router-cache-pathname="/customers"
>
  ...
</div>
```

Those attributes are used by diagnostics and transient UI tracking.

## Scroll and transient UI

The hidden route container is not enough for every UI primitive. Popovers, menus, dialogs, tooltips, and command palettes often render into portals outside the route container.

```mermaid
sequenceDiagram
  participant Route as Visible route
  participant DOM as Document
  participant Tracker as Transient UI tracker
  participant Portal as External portal element

  Route->>DOM: Opens menu, dialog, tooltip, or popover
  DOM->>Tracker: MutationObserver sees added element
  Tracker->>Tracker: Assign owner pathname
  Route->>Tracker: Route becomes hidden
  Tracker->>Portal: Dispatch hover exit and Escape
  Tracker->>Portal: Set display none, aria-hidden, inert
  Route->>Tracker: Route becomes visible
  Tracker->>Portal: Restore previous DOM state
```

External elements can opt out of this ownership behavior with:

```html
<div data-router-cache-persistent-external="true">
  ...
</div>
```

The package also stores window scroll positions by pathname. When a cached route becomes visible, it restores the saved window scroll position after two animation frames.

```mermaid
sequenceDiagram
  participant Route as Cached route
  participant Store as Scroll position map
  participant Window as window

  Route->>Store: Save scroll when hidden
  Route->>Window: Become visible
  Window-->>Route: Animation frame
  Window-->>Route: Animation frame
  Route->>Window: scrollTo saved x and y
```

## Eviction

The provider accepts two limits:

| Limit | Meaning |
| --- | --- |
| `maxEntries` | Maximum cached entries in the provider. |
| `maxEntriesPerRouteId` | Maximum cached entries for the same TanStack route id. |

Invalid, missing, `NaN`, and non-finite limits are normalized to `Infinity`. Negative values are normalized to `0`. `maxEntries={0}` disables caching and clears existing entries.

```mermaid
flowchart TD
  input["Next CachedRoutes map"]
  disabled{"maxEntries is 0?"}
  protect["Protect current pathname"]
  perRoute["Apply maxEntriesPerRouteId"]
  global["Apply maxEntries"]
  sort["Sort evictable entries by lastVisibleAt, createdAt, pathname"]
  delete["Delete selected entries"]
  output["Bounded CachedRoutes map"]

  input --> disabled
  disabled -- yes --> delete
  disabled -- no --> protect --> perRoute --> global --> sort --> delete --> output
```

Limit enforcement runs in this order:

1. Apply `maxEntriesPerRouteId`.
2. Apply `maxEntries`.
3. Keep protected keys, usually the route currently being written.
4. Evict least recently visible entries first.
5. If timestamps tie, sort by pathname for deterministic eviction.

The timestamp used for eviction is `lastVisibleAt`, then `createdAt`, then `0`.

## Href restoration

The cache key is pathname-based, but a route can be cached with a fuller href that includes search params or a hash.

```mermaid
flowchart TD
  enter["Navigate to cached pathname"]
  cachedHref{"Cached href exists?"}
  bareHref{"Current href is bare pathname?"}
  changed{"Cached href differs?"}
  restore["navigate with replace true and resetScroll false"]
  skip["Do nothing"]

  enter --> cachedHref
  cachedHref -- no --> skip
  cachedHref -- yes --> bareHref
  bareHref -- no --> skip
  bareHref -- yes --> changed
  changed -- no --> skip
  changed -- yes --> restore
```

When restoration is needed, the package navigates back to the cached href:

```ts
router.navigate({
  href: cachedHref,
  replace: true,
  resetScroll: false,
});
```

This keeps cached list filters, tabs, anchors, or search state aligned with the retained route view.

## Events and hooks

The package uses a singleton internal event bus.

```mermaid
flowchart LR
  manager["Cache manager"]
  bus["Event bus"]
  active["activeChange"]
  navStart["cachedNavigationStart"]
  navComplete["cachedNavigationComplete"]
  navCancel["cachedNavigationCancel"]
  hooks["Public hooks"]

  manager --> bus
  bus --> active
  bus --> navStart
  bus --> navComplete
  bus --> navCancel
  active --> hooks
  navStart --> hooks
  navComplete --> hooks
  navCancel --> hooks
```

| Event | Payload | Used by |
| --- | --- | --- |
| `activeChange` | `{ pathname, mode }` | `useRouteCacheActive`, `useRouteCacheEffect`, `useRouteCacheActivity`, `useRouterCache` refreshes. |
| `cachedNavigationStart` | `{ pathname, startedAt }` | `useRouteCacheNavigation`. |
| `cachedNavigationComplete` | `{ pathname, startedAt, visibleAt, paintedAt, duration }` | `useRouteCacheNavigation`. |
| `cachedNavigationCancel` | `{ pathname, startedAt }` | Clears pending cached navigation state. |

`cachedNavigationComplete` waits until the cached route is visible and then waits for two animation frames. This makes `duration` closer to "restored and painted" timing rather than just "state changed" timing.

## Error handling

Cached errored routes are intentionally discarded.

```mermaid
flowchart TD
  route["Current route"]
  routerError{"TanStack match status is error?"}
  boundary["useRouteCacheErrorBoundary"]
  retain["Retain errored pathname"]
  deleteEntry["Delete cached entry"]
  live["Render live route or error boundary"]
  release["Release errored pathname on unmount"]

  route --> routerError
  routerError -- yes --> deleteEntry --> live
  routerError -- no --> live
  boundary --> retain --> deleteEntry
  boundary --> release
```

There are two error paths:

- If TanStack Router reports the current match status as `error`, the cache manager deletes that pathname's cached entry.
- If an app-level error fallback calls `useRouteCacheErrorBoundary`, the provider increments an errored count for that pathname and deletes its cached entry until the fallback unmounts.

While a route is errored, the cache manager bypasses its cached outlet and lets the live route or error boundary render.

## Memory model

The package does not clone React component state. It keeps selected route trees mounted and hides them. Memory is bounded by the number and size of cached route trees that remain mounted.

```mermaid
flowchart LR
  optIn["routeCache opt in"]
  limits["maxEntries and maxEntriesPerRouteId"]
  scope["cacheScopeKey reset"]
  manual["destroy, destroyAll, invalidateWhere"]
  errors["error cleanup"]
  memory["Retained mounted route trees"]

  optIn --> memory
  limits --> memory
  scope --> memory
  manual --> memory
  errors --> memory
```

The memory controls are:

- route opt-in through `staticData.routeCache`,
- `maxEntries` for global cache size,
- `maxEntriesPerRouteId` for dynamic routes,
- `cacheScopeKey` for tenant, user, workspace, or environment resets,
- `destroy`, `destroyAll`, and `invalidateWhere` for manual invalidation,
- automatic deletion when a route stops being cacheable or enters an error state.

Dynamic routes are the most important case to bound. For routes such as `/customers/$customerId`, every distinct pathname can retain a separate route tree unless `maxEntriesPerRouteId` or manual invalidation removes older entries.
