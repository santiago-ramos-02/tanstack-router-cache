import { useState } from "react";
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

  useEventListener({
    on: {
      cachedNavigationStart: (navigation) => {
        setState((current) => ({
          ...current,
          activeNavigation: navigation,
        }));
      },
      cachedNavigationCancel: (navigation) => {
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
      cachedNavigationComplete: (navigation) => {
        setState((current) => ({
          activeNavigation:
            current.activeNavigation?.pathname === navigation.pathname
              ? null
              : current.activeNavigation,
          lastCompletedNavigation: navigation,
        }));
      },
    },
  });

  return state;
}
