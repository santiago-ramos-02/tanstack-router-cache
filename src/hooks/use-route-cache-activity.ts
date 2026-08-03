import { useLocation } from "@tanstack/react-router";
import { useLayoutEffect, useMemo, useRef } from "react";

import { useOptionalRouteCacheActivity } from "../contexts/route-cache-activity";
import { normalizeCachedRoutePathname } from "../pathname";
import { useEventListener } from "./use-event-listener";
import type { EventBuckets } from "./use-event-listener";

export function useRouteCacheActivity(fn: (active: boolean) => void) {
  const activity = useOptionalRouteCacheActivity();
  const callbackRef = useRef(fn);
  const lastActiveRef = useRef<boolean | undefined>(undefined);
  const routePathname = useLocation({
    select: (location) => location.pathname,
  });
  const normalizedRoutePathname = normalizeCachedRoutePathname(routePathname);
  const hasActivityContext =
    activity !== null &&
    normalizeCachedRoutePathname(activity.pathname) === normalizedRoutePathname;

  useLayoutEffect(() => {
    callbackRef.current = fn;
  }, [fn]);

  useLayoutEffect(() => {
    if (!hasActivityContext) {
      return;
    }

    const isActive = activity.mode === "visible";
    if (lastActiveRef.current === isActive) {
      return;
    }

    lastActiveRef.current = isActive;
    callbackRef.current(isActive);
  }, [activity?.mode, hasActivityContext]);

  const events = useMemo<EventBuckets>(
    () => ({
      on: {
        activeChange: ({ pathname, mode, callback }) => {
          if (
            normalizeCachedRoutePathname(pathname) === normalizedRoutePathname
          ) {
            const isActive = mode === "visible";
            if (lastActiveRef.current !== isActive) {
              lastActiveRef.current = isActive;
              callbackRef.current(isActive);
            }
          }
          callback?.();
        },
      },
    }),
    [normalizedRoutePathname]
  );

  useEventListener(events);
}
