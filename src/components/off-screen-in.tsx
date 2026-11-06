import { Activity, useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

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

export default function OffScreenIn(props: Readonly<OffScreenInProps>) {
  const {
    mode,
    children,
    containerRef,
    effectMode = "pause",
    pathname,
  } = props;
  const localContainerRef = useRef<HTMLDivElement | null>(null);

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

  useLayoutEffect(() => {
    const visibleContainer = localContainerRef.current;

    return () => {
      if (!pathname || mode !== "visible") {
        return;
      }

      dismissTransientUi(visibleContainer, pathname);
    };
  }, [mode, pathname]);

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

  const container = (
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
      style={
        effectMode === "keep-alive" && mode === "hidden"
          ? { display: "none" }
          : undefined
      }
    >
      {children}
    </div>
  );

  return effectMode === "keep-alive" ? (
    container
  ) : (
    <Activity mode={mode}>{container}</Activity>
  );
}
