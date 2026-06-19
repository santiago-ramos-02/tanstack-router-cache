# Types

## Exported types

```ts
export type ActivityMode = "visible" | "hidden";

export type RouteCacheOptions = {
  maxAge?: number;
};

export type RouteCacheStaticOption = boolean | RouteCacheOptions;

export type RouteCacheRouteOptions = RouteCacheOptions & {
  gcTime?: number;
  preloadStaleTime?: number;
  staleTime?: number;
};

export type RouteCacheNavigationStart = {
  pathname: string;
  startedAt: number;
};

export type RouteCacheNavigationComplete = RouteCacheNavigationStart & {
  duration: number;
  paintedAt: number;
  visibleAt: number;
};
```

The package also uses these cache shapes in public return values:

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

type CachedRoutes = {
  [key: string]: CachedRouteData;
};
```
