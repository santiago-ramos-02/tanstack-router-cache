/* oxlint-disable react-hooks/exhaustive-deps, react/rule-suppression -- This hook intentionally forwards the caller-provided dependency list to useEffect, which cannot be statically analyzed. */
import type { DependencyList, EffectCallback } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

import { useRouteCacheActive } from "./use-route-cache-active";

export function useRouteCacheEffect(
  activeCallback: EffectCallback,
  deps: DependencyList = []
) {
  const isActive = useRouteCacheActive();
  const callbackRef = useRef(activeCallback);

  useLayoutEffect(() => {
    callbackRef.current = activeCallback;
  }, [activeCallback]);

  // Activity semantics: the effect is mounted only while the route is
  // visible. Hiding runs the cleanup, showing re-runs the latest callback,
  // and dependency changes that happen while hidden apply once on show.
  useEffect(() => {
    if (!isActive) {
      return;
    }

    return callbackRef.current();
  }, [isActive, ...deps]);
}
