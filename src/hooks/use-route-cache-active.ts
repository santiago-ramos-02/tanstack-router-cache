import { useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useOptionalRouteCacheActivity } from "../contexts/route-cache-activity";
import { normalizeCachedRoutePathname } from "../pathname";
import { useEventListener } from "./use-event-listener";
import type { EventBuckets } from "./use-event-listener";

function useRoutePathname(pathname?: string) {
  const locationPathname = useLocation({
    select: (location) => (location as { pathname: string }).pathname,
  });

  return normalizeCachedRoutePathname(pathname ?? locationPathname);
}

export function useRouteCacheActive(pathname?: string) {
  const activity = useOptionalRouteCacheActivity();
  const routePathname = useRoutePathname(pathname);
  const [isActive, setIsActive] = useState(true);

  const events = useMemo<EventBuckets>(
    () => ({
      on: {
        activeChange: ({ pathname: changedPathname, mode }) => {
          if (changedPathname === routePathname) {
            setIsActive(mode === "visible");
          }
        },
      },
    }),
    [routePathname]
  );

  useEventListener(events);

  if (
    activity &&
    normalizeCachedRoutePathname(activity.pathname) === routePathname
  ) {
    return activity.mode === "visible";
  }

  return isActive;
}
