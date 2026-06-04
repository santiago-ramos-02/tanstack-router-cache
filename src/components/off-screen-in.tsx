import {
  Activity,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import {
  dismissTransientUi,
  initializeTransientUiTracking,
  syncTransientUiRouteActivity,
} from "../dom/dismiss-transient-ui";
import type { ActivityMode } from "../types";

export type OffScreenInProps = {
  mode: ActivityMode;
  children: ReactNode;
  containerRef?: RefObject<HTMLDivElement | null>;
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
  const { mode, children, containerRef, pathname } = props;
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
    let userRequestedScroll = false;
    let scrollTrackingIntervalId:
      | ReturnType<typeof globalThis.setInterval>
      | undefined;
    const startScrollTracking = () => {
      scrollTrackingIntervalId ??= globalThis.setInterval(
        saveScrollPosition,
        SCROLL_TRACKING_INTERVAL_MS
      );
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

    globalThis.addEventListener("scroll", handleScroll, { passive: true });
    globalThis.addEventListener("wheel", markUserRequestedScroll, {
      passive: true,
    });
    globalThis.addEventListener("touchstart", markUserRequestedScroll, {
      passive: true,
    });
    globalThis.addEventListener("pointerdown", markUserRequestedScroll, {
      passive: true,
    });
    globalThis.addEventListener("keydown", handleKeyDown);

    if (!savedPosition) {
      startScrollTracking();
      saveScrollPosition();
      return () => {
        if (scrollTrackingIntervalId !== undefined) {
          globalThis.clearInterval(scrollTrackingIntervalId);
        }
        globalThis.removeEventListener("scroll", handleScroll);
        globalThis.removeEventListener("wheel", markUserRequestedScroll);
        globalThis.removeEventListener("touchstart", markUserRequestedScroll);
        globalThis.removeEventListener("pointerdown", markUserRequestedScroll);
        globalThis.removeEventListener("keydown", handleKeyDown);
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
      if (scrollTrackingIntervalId !== undefined) {
        globalThis.clearInterval(scrollTrackingIntervalId);
      }
      globalThis.removeEventListener("scroll", handleScroll);
      globalThis.removeEventListener("wheel", markUserRequestedScroll);
      globalThis.removeEventListener("touchstart", markUserRequestedScroll);
      globalThis.removeEventListener("pointerdown", markUserRequestedScroll);
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, pathname]);

  return (
    <Activity mode={mode}>
      <div
        className="flex min-h-full w-full flex-1 flex-col"
        data-router-cache-container="true"
        data-router-cache-mode={mode}
        data-router-cache-pathname={pathname}
        ref={attachContainerRef}
      >
        {children}
      </div>
    </Activity>
  );
}
