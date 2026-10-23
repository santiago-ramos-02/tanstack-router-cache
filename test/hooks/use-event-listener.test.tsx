import { act, render, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EventBuckets } from "../../src/hooks/use-event-listener";
import { useEventListener } from "../../src/hooks/use-event-listener";

function captureListener() {
  const captured: ReturnType<typeof useEventListener>["eventListener"][] = [];

  function Probe() {
    captured.push(useEventListener().eventListener);
    return null;
  }

  render(<Probe />);

  const [listener] = captured;

  if (!listener) {
    throw new Error("Failed to capture the route-cache event listener.");
  }

  return listener;
}

describe("useEventListener", () => {
  it("fires a `once` handler exactly once across repeated emits", () => {
    const listener = captureListener();
    const handler = vi.fn();

    const { unmount } = renderHook(() =>
      useEventListener({
        once: {
          cachedNavigationStart: handler,
        },
      })
    );

    try {
      act(() => {
        listener.emit("cachedNavigationStart", {
          pathname: "/consulta",
          startedAt: 100,
        });
        listener.emit("cachedNavigationStart", {
          pathname: "/consulta",
          startedAt: 200,
        });
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        pathname: "/consulta",
        startedAt: 100,
      });
    } finally {
      unmount();
    }
  });

  it("calls the latest handler exactly once without re-subscribing every render", () => {
    const listener = captureListener();
    const seen: string[] = [];
    const onSpy = vi.spyOn(listener, "on");
    const offSpy = vi.spyOn(listener, "off");

    function Probe({ tag }: { tag: string }) {
      const events: EventBuckets = {
        on: {
          cachedNavigationStart: () => {
            seen.push(tag);
          },
        },
      };

      useEventListener(events);

      return null;
    }

    const view = render(<Probe tag="a" />);
    view.rerender(<Probe tag="b" />);
    view.rerender(<Probe tag="c" />);

    const subscriptionsAfterRenders = onSpy.mock.calls.length;

    act(() => {
      listener.emit("cachedNavigationStart", {
        pathname: "/consulta",
        startedAt: 100,
      });
    });

    expect(seen).toEqual(["c"]);
    // One subscription per event name, not one per render.
    expect(subscriptionsAfterRenders).toBeLessThanOrEqual(2);
    expect(onSpy.mock.calls.length).toBe(subscriptionsAfterRenders);

    view.unmount();

    act(() => {
      listener.emit("cachedNavigationStart", {
        pathname: "/consulta",
        startedAt: 200,
      });
    });

    expect(seen).toEqual(["c"]);
    expect(offSpy.mock.calls.length).toBeGreaterThan(0);

    onSpy.mockRestore();
    offSpy.mockRestore();
  });

  it("receives events emitted during the mount layout phase", () => {
    const received: string[] = [];

    function Child() {
      useEventListener({
        on: {
          cachedNavigationStart: ({ pathname }) => {
            received.push(pathname);
          },
        },
      });

      return null;
    }

    function Parent() {
      const { eventListener } = useEventListener();

      useLayoutEffect(() => {
        eventListener.emit("cachedNavigationStart", {
          pathname: "/radicacion",
          startedAt: 50,
        });
      }, [eventListener]);

      return <Child />;
    }

    render(<Parent />);

    expect(received).toEqual(["/radicacion"]);
  });

  it("leaves no listener subscribed after unmount", () => {
    const listener = captureListener();
    const onHandler = vi.fn();
    const onceHandler = vi.fn();

    const { unmount } = renderHook(() =>
      useEventListener({
        on: {
          cachedNavigationComplete: onHandler,
        },
        once: {
          cachedNavigationComplete: onceHandler,
        },
      })
    );

    const payload = {
      duration: 12,
      paintedAt: 112,
      pathname: "/consulta",
      startedAt: 100,
      visibleAt: 110,
    };

    act(() => {
      listener.emit("cachedNavigationComplete", payload);
    });

    expect(onHandler).toHaveBeenCalledTimes(1);
    expect(onceHandler).toHaveBeenCalledTimes(1);

    unmount();

    let hadListeners = true;

    act(() => {
      hadListeners = listener.emit("cachedNavigationComplete", payload);
    });

    // `emit` reports whether any listener remains for the event. The layout
    // subscription discards its cleanup, so this also proves the passive
    // cleanup removed the layout subscription's handlers.
    expect(hadListeners).toBe(false);
    expect(onHandler).toHaveBeenCalledTimes(1);
    expect(onceHandler).toHaveBeenCalledTimes(1);
  });

  it("stops calling the handler after unmount", () => {
    const listener = captureListener();
    const handler = vi.fn();

    const { unmount } = renderHook(() =>
      useEventListener({
        on: {
          cachedNavigationStart: handler,
        },
      })
    );

    unmount();

    act(() => {
      listener.emit("cachedNavigationStart", {
        pathname: "/consulta",
        startedAt: 100,
      });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps the latest `once` handler without duplicating it across renders", () => {
    const listener = captureListener();
    const seen: string[] = [];

    function Probe({ tag }: { tag: string }) {
      const events: EventBuckets = {
        once: {
          cachedNavigationStart: () => {
            seen.push(tag);
          },
        },
      };

      useEventListener(events);

      return null;
    }

    const view = render(<Probe tag="a" />);
    view.rerender(<Probe tag="b" />);

    try {
      act(() => {
        listener.emit("cachedNavigationStart", {
          pathname: "/consulta",
          startedAt: 100,
        });
        listener.emit("cachedNavigationStart", {
          pathname: "/consulta",
          startedAt: 200,
        });
      });

      expect(seen).toEqual(["b"]);
    } finally {
      view.unmount();
    }
  });
});
