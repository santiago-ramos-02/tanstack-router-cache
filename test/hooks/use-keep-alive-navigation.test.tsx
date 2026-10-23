import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import { useEventListener } from "../../src/hooks/use-event-listener";
import { useRouteCacheNavigation } from "../../src/hooks/use-route-cache-navigation";

const capturedListeners: ReturnType<
  typeof useEventListener
>["eventListener"][] = [];

function Wrapper({ children }: { children: ReactNode }) {
  const { eventListener } = useEventListener();

  useEffect(() => {
    capturedListeners.push(eventListener);
    return () => {
      const index = capturedListeners.indexOf(eventListener);
      if (index !== -1) {
        capturedListeners.splice(index, 1);
      }
    };
  }, [eventListener]);

  return children;
}

function getCapturedListener() {
  return capturedListeners.at(-1) ?? null;
}

describe("useRouteCacheNavigation", () => {
  it("tracks cached navigation lifecycle events", () => {
    const { result } = renderHook(() => useRouteCacheNavigation(), {
      wrapper: Wrapper,
    });

    act(() => {
      getCapturedListener()?.emit("cachedNavigationStart", {
        pathname: "/consulta",
        startedAt: 100,
      });
    });

    expect(result.current.activeNavigation).toEqual({
      pathname: "/consulta",
      startedAt: 100,
    });
    expect(result.current.lastCompletedNavigation).toBeNull();

    act(() => {
      getCapturedListener()?.emit("cachedNavigationComplete", {
        pathname: "/consulta",
        startedAt: 100,
        duration: 220,
        paintedAt: 320,
        visibleAt: 300,
      });
    });

    expect(result.current.activeNavigation).toBeNull();
    expect(result.current.lastCompletedNavigation).toEqual({
      pathname: "/consulta",
      startedAt: 100,
      duration: 220,
      paintedAt: 320,
      visibleAt: 300,
    });
  });

  it("clears the active cached navigation on cancel", () => {
    const { result } = renderHook(() => useRouteCacheNavigation(), {
      wrapper: Wrapper,
    });

    act(() => {
      getCapturedListener()?.emit("cachedNavigationStart", {
        pathname: "/radicacion",
        startedAt: 50,
      });
      getCapturedListener()?.emit("cachedNavigationCancel", {
        pathname: "/radicacion",
        startedAt: 50,
      });
    });

    expect(result.current.activeNavigation).toBeNull();
  });
});
