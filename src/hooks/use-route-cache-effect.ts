import type { DependencyList, EffectCallback } from "react";
import { useCallback, useEffect, useRef } from "react";

import { useRouteCacheActivity } from "./use-route-cache-activity";

function areDependenciesEqual(
  previousDeps: DependencyList | undefined,
  nextDeps: DependencyList
) {
  if (previousDeps?.length !== nextDeps.length) {
    return false;
  }

  for (let index = 0; index < nextDeps.length; index += 1) {
    if (!Object.is(previousDeps[index], nextDeps[index])) {
      return false;
    }
  }

  return true;
}

export function useRouteCacheEffect(
  activeCallback: EffectCallback,
  deps: DependencyList = []
) {
  const returnValue = useRef<ReturnType<EffectCallback> | undefined>(undefined);
  const isActiveRef = useRef(true);
  const previousCallbackRef = useRef<EffectCallback | undefined>(undefined);
  const previousDepsRef = useRef<DependencyList | undefined>(undefined);

  useEffect(() => {
    const callbackChanged = previousCallbackRef.current !== activeCallback;
    const dependenciesChanged = !areDependenciesEqual(
      previousDepsRef.current,
      deps
    );

    if (!(callbackChanged || dependenciesChanged || !isActiveRef.current)) {
      return;
    }

    previousCallbackRef.current = activeCallback;
    previousDepsRef.current = deps;

    isActiveRef.current = true;
    returnValue.current?.();
    returnValue.current = activeCallback();
  });

  useEffect(
    () => () => {
      returnValue.current?.();
    },
    []
  );

  const handleActivityChange = useCallback(
    (active: boolean) => {
      if (active) {
        if (isActiveRef.current) {
          return;
        }

        isActiveRef.current = true;
        returnValue.current = activeCallback();
        return;
      }

      if (!isActiveRef.current) {
        return;
      }

      isActiveRef.current = false;
      returnValue.current?.();
      returnValue.current = undefined;
    },
    [activeCallback]
  );

  useRouteCacheActivity(handleActivityChange);
}
