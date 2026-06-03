export type ActivityMode = "visible" | "hidden";

export type RouteCacheNavigationStart = {
  pathname: string;
  startedAt: number;
};

export type RouteCacheNavigationComplete = RouteCacheNavigationStart & {
  duration: number;
  paintedAt: number;
  visibleAt: number;
};
