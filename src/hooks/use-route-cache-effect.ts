import type { DependencyList, EffectCallback } from "react";
import { useEffect, useRef } from "react";
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
  const isActiveRef = useRef(false);
  const previousCallbackRef = useRef<EffectCallback | undefined>(undefined);
  const previousDepsRef = useRef<DependencyList | undefined>(undefined);

  useEffect(() => {
    const callbackChanged = previousCallbackRef.current !== activeCallback;
    const dependenciesChanged = !areDependenciesEqual(
      previousDepsRef.current,
      deps
    );

    if (!(callbackChanged || dependenciesChanged)) {
      return;
    }

    previousCallbackRef.current = activeCallback;
    previousDepsRef.current = deps;

    if (!isActiveRef.current) {
      return;
    }

    returnValue.current?.();
    returnValue.current = activeCallback();
  });

  useEffect(
    () => () => {
      returnValue.current?.();
    },
    []
  );

  useRouteCacheActivity((active) => {
    if (active) {
      isActiveRef.current = true;
      returnValue.current = activeCallback();
      return;
    }

    isActiveRef.current = false;
    returnValue.current?.();
  });
}
