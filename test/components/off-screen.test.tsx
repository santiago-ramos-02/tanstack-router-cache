import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import OffScreen from "../../src/components/off-screen";

type OffScreenMode = "hidden" | "visible";
const cleanupEscapeTrackers = new Set<() => void>();
const initialScrollPosition = { x: 40, y: 120 };
const savedScrollPosition = { x: 320, y: 960 };

function setWindowScrollPosition(x: number, y: number) {
  Object.defineProperties(globalThis, {
    scrollX: {
      configurable: true,
      value: x,
    },
    scrollY: {
      configurable: true,
      value: y,
    },
  });
}

function createEscapeEventTracker() {
  const keydowns: KeyboardEvent[] = [];
  const keyups: KeyboardEvent[] = [];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      keydowns.push(event);
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      keyups.push(event);
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);

  const cleanup = () => {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    cleanupEscapeTrackers.delete(cleanup);
  };

  cleanupEscapeTrackers.add(cleanup);

  return {
    cleanup,
    keydowns,
    keyups,
  };
}

function HoverPortalFixture({ mode }: Readonly<{ mode: OffScreenMode }>) {
  const [open, setOpen] = useState(false);

  return (
    <OffScreen mode={mode} pathname="/ejecucion">
      <button
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        Open hover portal
      </button>
      {open
        ? createPortal(
            <button
              data-testid="hover-portal"
              onMouseLeave={() => {
                setOpen(false);
              }}
              onPointerLeave={() => {
                setOpen(false);
              }}
              type="button"
            >
              Hover portal
            </button>,
            document.body
          )
        : null}
    </OffScreen>
  );
}

function StickyHoverPortalFixture({ mode }: Readonly<{ mode: OffScreenMode }>) {
  const [open, setOpen] = useState(false);

  return (
    <OffScreen mode={mode} pathname="/ejecucion">
      <button
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        Open sticky hover portal
      </button>
      {open
        ? createPortal(
            <div
              data-slot="sticky-hover-popup"
              data-testid="sticky-hover-portal"
              role="menu"
            >
              Sticky hover portal
            </div>,
            document.body
          )
        : null}
    </OffScreen>
  );
}

function PersistentExternalFixture({
  mode,
}: Readonly<{ mode: OffScreenMode }>) {
  const [open, setOpen] = useState(false);

  // Global navigation lives outside the cached route but portals to <body>
  // while the route is visible, where the transient-UI tracker would
  // otherwise attribute it to that route.
  return (
    <>
      <OffScreen mode={mode} pathname="/ejecucion">
        <p>Route content</p>
      </OffScreen>
      <button
        onClick={() => {
          setOpen(true);
        }}
        type="button"
      >
        Open persistent external
      </button>
      {open
        ? createPortal(
            <nav
              data-router-cache-persistent-external="true"
              data-testid="persistent-external"
            >
              Persistent external
            </nav>,
            document.body
          )
        : null}
    </>
  );
}

function StructuralShellFixture({ mode }: Readonly<{ mode: OffScreenMode }>) {
  return (
    <>
      <OffScreen mode={mode} pathname="/ejecucion">
        <button type="button">Inside route</button>
      </OffScreen>
      <div data-testid="structural-shell">
        <div data-router-cache-container="true">Nested route-cache shell</div>
      </div>
    </>
  );
}

afterEach(() => {
  for (const cleanup of cleanupEscapeTrackers) {
    cleanup();
  }
  setWindowScrollPosition(0, 0);
  vi.restoreAllMocks();
});

describe("OffScreen", () => {
  it("keeps child effects mounted while a keep-alive route is hidden", () => {
    const mountEffect = vi.fn();
    const cleanupEffect = vi.fn();

    function EffectFixture() {
      useEffect(() => {
        mountEffect();
        return cleanupEffect;
      }, []);

      return <span>Effect fixture</span>;
    }

    const { rerender, unmount } = render(
      <OffScreen effectMode="keep-alive" mode="visible" pathname="/consulta">
        <EffectFixture />
      </OffScreen>
    );

    rerender(
      <OffScreen effectMode="keep-alive" mode="hidden" pathname="/consulta">
        <EffectFixture />
      </OffScreen>
    );
    rerender(
      <OffScreen effectMode="keep-alive" mode="visible" pathname="/consulta">
        <EffectFixture />
      </OffScreen>
    );

    expect(mountEffect).toHaveBeenCalledTimes(1);
    expect(cleanupEffect).not.toHaveBeenCalled();

    unmount();
    expect(cleanupEffect).toHaveBeenCalledTimes(1);
  });

  it("renders the route-cache container as a full-height flex column", () => {
    const { container } = render(
      <OffScreen mode="visible" pathname="/consulta">
        <button type="button">Inside route</button>
      </OffScreen>
    );

    const routerCacheContainer = container.querySelector(
      '[data-router-cache-container="true"]'
    );

    expect(routerCacheContainer).not.toBeNull();
    expect(routerCacheContainer).toHaveClass(
      "flex",
      "min-h-full",
      "w-full",
      "flex-1",
      "flex-col"
    );
  });

  it("dismisses transient UI when a previously visible route becomes hidden", async () => {
    const escapeEvents = createEscapeEventTracker();
    const { rerender } = render(
      <OffScreen mode="visible" pathname="/consulta">
        <button type="button">Inside route</button>
      </OffScreen>
    );
    const insideButton = screen.getByRole("button", { name: "Inside route" });
    const blurSpy = vi.spyOn(insideButton, "blur");

    insideButton.focus();
    expect(insideButton).toHaveFocus();

    rerender(
      <OffScreen mode="hidden" pathname="/consulta">
        <button type="button">Inside route</button>
      </OffScreen>
    );

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(escapeEvents.keydowns).toHaveLength(1);
      expect(escapeEvents.keyups).toHaveLength(1);
    });

    escapeEvents.cleanup();
  });

  it("does not dismiss transient UI for routes that mount hidden", () => {
    const escapeEvents = createEscapeEventTracker();

    render(
      <OffScreen mode="hidden" pathname="/consulta">
        <button type="button">Inside route</button>
      </OffScreen>
    );

    expect(escapeEvents.keydowns).toHaveLength(0);
    expect(escapeEvents.keyups).toHaveLength(0);

    escapeEvents.cleanup();
  });

  it("dismisses transient UI exactly once when a visible route unmounts", async () => {
    const escapeEvents = createEscapeEventTracker();
    const { unmount } = render(
      <OffScreen mode="visible" pathname="/consulta">
        <button type="button">Inside route</button>
      </OffScreen>
    );
    const insideButton = screen.getByRole("button", { name: "Inside route" });
    const blurSpy = vi.spyOn(insideButton, "blur");

    insideButton.focus();
    expect(insideButton).toHaveFocus();

    unmount();

    await waitFor(() => {
      expect(blurSpy).toHaveBeenCalledTimes(1);
      expect(escapeEvents.keydowns).toHaveLength(1);
      expect(escapeEvents.keyups).toHaveLength(1);
    });

    escapeEvents.cleanup();
  });

  it("does not blur elements outside the route container while still dispatching escape", async () => {
    const escapeEvents = createEscapeEventTracker();
    const { rerender } = render(
      <>
        <input aria-label="outside route" />
        <OffScreen mode="visible" pathname="/consulta">
          <button type="button">Inside route</button>
        </OffScreen>
      </>
    );
    const outsideInput = screen.getByLabelText("outside route");
    const outsideBlurSpy = vi.spyOn(outsideInput, "blur");

    outsideInput.focus();
    expect(outsideInput).toHaveFocus();

    rerender(
      <>
        <input aria-label="outside route" />
        <OffScreen mode="hidden" pathname="/consulta">
          <button type="button">Inside route</button>
        </OffScreen>
      </>
    );

    await waitFor(() => {
      expect(escapeEvents.keydowns).toHaveLength(1);
      expect(escapeEvents.keyups).toHaveLength(1);
    });

    expect(outsideBlurSpy).not.toHaveBeenCalled();

    escapeEvents.cleanup();
  });

  it("restores the saved window scroll position when a cached route becomes visible again", () => {
    const animationFrameCallbacks: FrameRequestCallback[] = [];
    const pathname = "/scroll-restore-test";
    const scrollToSpy = vi
      .spyOn(globalThis, "scrollTo")
      .mockImplementation((x, y) => {
        setWindowScrollPosition(x, y);
      });

    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
      (callback) => {
        animationFrameCallbacks.push(callback);
        return animationFrameCallbacks.length;
      }
    );
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});

    setWindowScrollPosition(initialScrollPosition.x, initialScrollPosition.y);

    const { rerender } = render(
      <OffScreen mode="visible" pathname={pathname}>
        <button type="button">Inside route</button>
      </OffScreen>
    );

    setWindowScrollPosition(savedScrollPosition.x, savedScrollPosition.y);
    globalThis.dispatchEvent(new Event("scroll"));

    rerender(
      <OffScreen mode="hidden" pathname={pathname}>
        <button type="button">Inside route</button>
      </OffScreen>
    );

    setWindowScrollPosition(0, 0);

    rerender(
      <OffScreen mode="visible" pathname={pathname}>
        <button type="button">Inside route</button>
      </OffScreen>
    );

    expect(scrollToSpy).not.toHaveBeenCalled();

    animationFrameCallbacks.shift()?.(performance.now());
    expect(scrollToSpy).not.toHaveBeenCalled();

    animationFrameCallbacks.shift()?.(performance.now());

    expect(scrollToSpy).toHaveBeenCalledWith(
      savedScrollPosition.x,
      savedScrollPosition.y
    );
    expect(globalThis.scrollX).toBe(savedScrollPosition.x);
    expect(globalThis.scrollY).toBe(savedScrollPosition.y);
  });

  it("keeps a first visit at the top instead of the scroll of the page it came from", () => {
    const animationFrameCallbacks: FrameRequestCallback[] = [];
    const scrollToSpy = vi
      .spyOn(globalThis, "scrollTo")
      .mockImplementation((x, y) => {
        setWindowScrollPosition(x, y);
      });

    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
      (callback) => {
        animationFrameCallbacks.push(callback);
        return animationFrameCallbacks.length;
      }
    );
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});

    // The page navigated from was scrolled down when the new route mounts.
    setWindowScrollPosition(savedScrollPosition.x, savedScrollPosition.y);

    const { rerender } = render(
      <OffScreen mode="visible" pathname="/first-visit-test">
        <button type="button">Inside route</button>
      </OffScreen>
    );

    // The router resets the new route to the top.
    setWindowScrollPosition(0, 0);

    rerender(
      <OffScreen mode="hidden" pathname="/first-visit-test">
        <button type="button">Inside route</button>
      </OffScreen>
    );
    rerender(
      <OffScreen mode="visible" pathname="/first-visit-test">
        <button type="button">Inside route</button>
      </OffScreen>
    );

    while (animationFrameCallbacks.length > 0) {
      animationFrameCallbacks.shift()?.(performance.now());
    }

    expect(scrollToSpy).not.toHaveBeenCalledWith(
      savedScrollPosition.x,
      savedScrollPosition.y
    );
    expect(globalThis.scrollX).toBe(0);
    expect(globalThis.scrollY).toBe(0);
  });
});

describe("OffScreen overlay dismissal", () => {
  it("dispatches hover-exit events for hovered portal content when the cached route becomes hidden", async () => {
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    const querySelectorAllSpy = vi
      .spyOn(document, "querySelectorAll")
      .mockImplementation((selectors) => {
        if (selectors === ":hover") {
          return document.body.querySelectorAll('[data-testid="hover-portal"]');
        }

        return originalQuerySelectorAll(selectors);
      });

    const { rerender } = render(<HoverPortalFixture mode="visible" />);

    fireEvent.click(screen.getByRole("button", { name: "Open hover portal" }));

    expect(await screen.findByTestId("hover-portal")).toBeInTheDocument();

    rerender(<HoverPortalFixture mode="hidden" />);

    await waitFor(() => {
      expect(screen.queryByTestId("hover-portal")).not.toBeInTheDocument();
    });

    querySelectorAllSpy.mockRestore();
  });

  it("hides portal content owned by a hidden route even when it stays mounted", async () => {
    const { rerender } = render(<StickyHoverPortalFixture mode="visible" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open sticky hover portal" })
    );

    const portal = await screen.findByTestId("sticky-hover-portal");
    expect(portal).toBeInTheDocument();

    rerender(<StickyHoverPortalFixture mode="hidden" />);

    await waitFor(() => {
      expect(portal).toHaveStyle({
        display: "none",
      });
      expect(portal).toHaveAttribute("aria-hidden", "true");
    });

    rerender(<StickyHoverPortalFixture mode="visible" />);

    await waitFor(() => {
      expect(portal).not.toHaveAttribute("aria-hidden", "true");
      expect(portal).not.toHaveStyle({
        display: "none",
      });
    });
  });

  it("does not hide persistent external elements when a cached route becomes hidden", async () => {
    const { rerender } = render(<PersistentExternalFixture mode="visible" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Open persistent external" })
    );

    const persistentExternal = await screen.findByTestId("persistent-external");
    expect(persistentExternal).toBeInTheDocument();

    rerender(<PersistentExternalFixture mode="hidden" />);

    await waitFor(() => {
      expect(persistentExternal).toBeInTheDocument();
      expect(persistentExternal).not.toHaveAttribute("aria-hidden", "true");
      expect(persistentExternal).not.toHaveStyle({
        display: "none",
      });
    });
  });

  it("does not hide structural shells that contain route-cache containers", async () => {
    const { rerender } = render(<StructuralShellFixture mode="visible" />);

    const structuralShell = await screen.findByTestId("structural-shell");
    expect(structuralShell).toBeInTheDocument();

    rerender(<StructuralShellFixture mode="hidden" />);

    await waitFor(() => {
      expect(structuralShell).not.toHaveAttribute("aria-hidden", "true");
      expect(structuralShell).not.toHaveStyle({
        display: "none",
      });
    });
  });
});
