import { useLocation } from "@tanstack/react-router";
import { useEventListener } from "./use-event-listener";

export function useRouteCacheActivity(fn: (active: boolean) => void) {
  const routePathname = useLocation({
    select: (location) => (location as { pathname: string }).pathname,
  });
  useEventListener({
    on: {
      activeChange: ({ pathname, mode, callback }) => {
        if (pathname === routePathname) {
          const isActive = mode === "visible";
          fn(isActive);
        }
        callback?.();
      },
    },
  });
}
