import { useMemo, useState } from "react";

import type {
  RouteCacheNavigationComplete,
  RouteCacheNavigationStart,
} from "../types";
import { useEventListener } from "./use-event-listener";

type RouteCacheNavigationState = {
  activeNavigation: RouteCacheNavigationStart | null;
  lastCompletedNavigation: RouteCacheNavigationComplete | null;
};

const INITIAL_STATE: RouteCacheNavigationState = {
  activeNavigation: null,
  lastCompletedNavigation: null,
};

export function useRouteCacheNavigation() {
  const [state, setState] = useState(INITIAL_STATE);

  const events = useMemo(
    () => ({
      on: {
        cachedNavigationStart: (navigation: RouteCacheNavigationStart) => {
          setState((current) => ({
            ...current,
            activeNavigation: navigation,
          }));
        },
        cachedNavigationCancel: (navigation: RouteCacheNavigationStart) => {
          setState((current) => {
            if (current.activeNavigation?.pathname !== navigation.pathname) {
              return current;
            }

            return {
              ...current,
              activeNavigation: null,
            };
          });
        },
        cachedNavigationComplete: (
          navigation: RouteCacheNavigationComplete
        ) => {
          setState((current) => ({
            activeNavigation:
              current.activeNavigation?.pathname === navigation.pathname
                ? null
                : current.activeNavigation,
            lastCompletedNavigation: navigation,
          }));
        },
      },
    }),
    []
  );

  useEventListener(events);

  return state;
}
