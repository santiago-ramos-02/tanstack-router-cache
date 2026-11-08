import { Activity, memo, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import { RouteCacheActivityProvider } from "../contexts/route-cache-activity";
import {
  dismissTransientUi,
  initializeTransientUiTracking,
  syncTransientUiRouteActivity,
} from "../dom/dismiss-transient-ui";
import type { ActivityMode, RouteCacheEffectMode } from "../types";

export type OffScreenInProps = {
  mode: ActivityMode;
  children: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
  effectMode?: RouteCacheEffectMode;
  pathname?: string;
};

const windowScrollPositions = new Map<string, { x: number; y: number }>();
const IMMEDIATE_SCROLL_RESTORE_DELAY = 0;
const EARLY_SCROLL_RESTORE_DELAY = 80;
const MIDDLE_SCROLL_RESTORE_DELAY = 240;
const LATE_SCROLL_RESTORE_DELAY = 600;
const FINAL_SCROLL_RESTORE_DELAY = 1000;
const SCROLL_TRACKING_INTERVAL_MS = 200;
const SCROLL_KEYS = new Set([
  " ",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);
const SCROLL_RESTORE_DELAYS = [
  IMMEDIATE_SCROLL_RESTORE_DELAY,
  EARLY_SCROLL_RESTORE_DELAY,
  MIDDLE_SCROLL_RESTORE_DELAY,
  LATE_SCROLL_RESTORE_DELAY,
  FINAL_SCROLL_RESTORE_DELAY,
] as const;

/**
 * Runs `callback` in a task after the next frame paints, the way React renders
 * hidden content at a lower priority than what the user sees. Returns its
 * cancellation.
 */
function scheduleAfterPaint(callback: () => void) {
  let isCancelled = false;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  const frameId = globalThis.requestAnimationFrame(() => {
    timeoutId = globalThis.setTimeout(() => {
      if (!isCancelled) {
        callback();
      }
    }, 0);
  });

  return () => {
    isCancelled = true;
    globalThis.cancelAnimationFrame(frameId);
    globalThis.clearTimeout(timeoutId);
  };
}

type RetainedRouteProps = {
  children: ReactNode;
  effectMode: RouteCacheEffectMode;
  mode: ActivityMode;
};

/**
 * The retained subtree. A memo boundary, so it renders only when its own mode
 * changes, never because its container did.
 */
function RetainedSubtree(props: Readonly<RetainedRouteProps>) {
  const { children, effectMode, mode } = props;

  return effectMode === "keep-alive" ? (
    children
  ) : (
    <Activity mode={mode}>{children}</Activity>
  );
}

const RetainedRoute = memo(RetainedSubtree);

export default function OffScreenIn(props: Readonly<OffScreenInProps>) {
  const {
    mode,
    children,
    containerRef,
    effectMode = "pause",
    pathname,
  } = props;
  const localContainerRef = useRef<HTMLDivElement | null>(null);
  // The mode the retained subtree is in. Revealing a route shows it in the
  // navigation's commit. Hiding one only hides its container there; the
  // subtree is retired (effects disconnected, transient UI dismissed) in a
  // later task, after the revealed route paints, so the navigation's commit
  // renders and lays out nothing of the route it leaves.
  const [retainedMode, setRetainedMode] = useState(mode);

  if (mode === "visible" && retainedMode !== "visible") {
    setRetainedMode("visible");
  }

  const subtreeMode = mode === "visible" ? "visible" : retainedMode;

  const attachContainerRef = (node: HTMLDivElement | null) => {
    localContainerRef.current = node;

    if (containerRef) {
      containerRef.current = node;
    }
  };

  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    initializeTransientUiTracking(document);
  }, []);

  useLayoutEffect(() => {
    if (!pathname) {
      return;
    }

    syncTransientUiRouteActivity(pathname, mode);
  }, [mode, pathname]);

  const subtreeModeRef = useRef(subtreeMode);

  useLayoutEffect(() => {
    subtreeModeRef.current = subtreeMode;
  }, [subtreeMode]);

  // Retiring dismisses the route's transient UI while its listeners are still
  // connected, then hides the subtree.
  useLayoutEffect(() => {
    if (subtreeMode === "hidden" || mode === "visible") {
      return;
    }

    const container = localContainerRef.current;

    return scheduleAfterPaint(() => {
      if (pathname) {
        dismissTransientUi(container, pathname);
      }

      setRetainedMode("hidden");
    });
  }, [mode, pathname, subtreeMode]);

  // A route unmounted before it is retired dismisses its transient UI then.
  useLayoutEffect(() => {
    const container = localContainerRef.current;

    return () => {
      if (pathname && subtreeModeRef.current === "visible") {
        dismissTransientUi(container, pathname);
      }
    };
  }, [pathname]);

  useLayoutEffect(() => {
    if (typeof globalThis === "undefined" || !pathname) {
      return;
    }

    const saveScrollPosition = () => {
      windowScrollPositions.set(pathname, {
        x: globalThis.scrollX,
        y: globalThis.scrollY,
      });
    };

    if (mode === "hidden") {
      return;
    }

    const savedPosition = windowScrollPositions.get(pathname);
    // One signal owns every listener, timer and frame of this visit, so each
    // way out of the effect releases them the same way.
    const visit = new AbortController();
    const { signal } = visit;
    let userRequestedScroll = false;
    // The timer runs for the whole visit but records only once tracking
    // starts, so a restored route is not overwritten before it is restored.
    let isTrackingScroll = false;
    const scrollTrackingIntervalId = globalThis.setInterval(() => {
      if (isTrackingScroll) {
        saveScrollPosition();
      }
    }, SCROLL_TRACKING_INTERVAL_MS);
    const startScrollTracking = () => {
      isTrackingScroll = true;
    };
    const handleScroll = () => {
      if (!savedPosition || userRequestedScroll) {
        saveScrollPosition();
      }
    };
    const markUserRequestedScroll = () => {
      userRequestedScroll = true;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) {
        markUserRequestedScroll();
      }
    };

    // oxlint-disable-next-line github/prefer-observers -- Exact window scroll coordinates cannot be observed with IntersectionObserver.
    globalThis.addEventListener("scroll", handleScroll, { signal });
    globalThis.addEventListener("wheel", markUserRequestedScroll, {
      passive: true,
      signal,
    });
    globalThis.addEventListener("touchstart", markUserRequestedScroll, {
      passive: true,
      signal,
    });
    globalThis.addEventListener("pointerdown", markUserRequestedScroll, {
      signal,
    });
    globalThis.addEventListener("keydown", handleKeyDown, { signal });

    if (!savedPosition) {
      // A first visit starts where the router puts it, at the top. The window
      // still holds the scroll of the page navigated from, so it is not saved
      // now: saving it would restore that page's scroll here once the route
      // turns visible again. Tracking records this route's own scroll.
      startScrollTracking();
      return () => {
        globalThis.clearInterval(scrollTrackingIntervalId);
        visit.abort();
      };
    }

    const restoreScrollPosition = () => {
      if (userRequestedScroll) {
        return;
      }

      globalThis.scrollTo(savedPosition.x, savedPosition.y);
      saveScrollPosition();
      startScrollTracking();
    };

    const timeoutIds: ReturnType<typeof globalThis.setTimeout>[] = [];
    let rafId = globalThis.requestAnimationFrame(() => {
      rafId = globalThis.requestAnimationFrame(() => {
        restoreScrollPosition();
        for (const delay of SCROLL_RESTORE_DELAYS) {
          timeoutIds.push(globalThis.setTimeout(restoreScrollPosition, delay));
        }
      });
    });

    return () => {
      globalThis.cancelAnimationFrame(rafId);
      for (const timeoutId of timeoutIds) {
        globalThis.clearTimeout(timeoutId);
      }
      globalThis.clearInterval(scrollTrackingIntervalId);
      visit.abort();
    };
  }, [mode, pathname]);

  const retainedRoute = (
    <RetainedRoute effectMode={effectMode} mode={subtreeMode}>
      {children}
    </RetainedRoute>
  );

  return (
    <div
      aria-hidden={
        effectMode === "keep-alive" && mode === "hidden" ? true : undefined
      }
      className="flex min-h-full w-full flex-1 flex-col"
      data-router-cache-container="true"
      data-router-cache-effect-mode={effectMode}
      data-router-cache-mode={mode}
      data-router-cache-pathname={pathname}
      inert={effectMode === "keep-alive" && mode === "hidden"}
      ref={attachContainerRef}
      style={mode === "hidden" ? { display: "none" } : undefined}
    >
      {pathname ? (
        // The activity context follows the navigation: the hooks that read it
        // learn the route is hidden as soon as the user leaves it. Only those
        // hooks render then; the retained subtree waits for the retire.
        <RouteCacheActivityProvider mode={mode} pathname={pathname}>
          {retainedRoute}
        </RouteCacheActivityProvider>
      ) : (
        retainedRoute
      )}
    </div>
  );
}
