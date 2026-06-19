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
