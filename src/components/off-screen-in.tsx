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
      saveScrollPosition();
      return;
    }

    const savedPosition = windowScrollPositions.get(pathname);
    const handleScroll = () => saveScrollPosition();

    globalThis.addEventListener("scroll", handleScroll, { passive: true });

    if (!savedPosition) {
      saveScrollPosition();
      return () => globalThis.removeEventListener("scroll", handleScroll);
    }

    let rafId = globalThis.requestAnimationFrame(() => {
      rafId = globalThis.requestAnimationFrame(() => {
        globalThis.scrollTo(savedPosition.x, savedPosition.y);
        saveScrollPosition();
      });
    });

    return () => {
      globalThis.cancelAnimationFrame(rafId);
      globalThis.removeEventListener("scroll", handleScroll);
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
