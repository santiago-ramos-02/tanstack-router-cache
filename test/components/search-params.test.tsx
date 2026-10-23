import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { RouterCacheOutlet, RouterCacheProvider } from "../../src";

function readSearchPage(value: unknown) {
  return typeof value === "string" ? value : "1";
}

function RootShell() {
  return (
    <RouterCacheProvider>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}

function OtherPage() {
  return <div data-testid="other-page">Other page</div>;
}

function SearchPage() {
  const search = searchRoute.useSearch();
  const [count, setCount] = useState(0);

  return (
    <>
      <output data-testid="search-page">{search.page}</output>
      <output data-testid="search-count">{count}</output>
      <button
        onClick={() => {
          setCount((value) => value + 1);
        }}
        type="button"
      >
        Increase
      </button>
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootShell,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  staticData: {
    routeCache: true,
  },
  validateSearch: (search: Record<string, unknown>) => ({
    page: readSearchPage(search.page),
  }),
  component: SearchPage,
});

const otherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/other",
  component: OtherPage,
});

const routeTree = rootRoute.addChildren([searchRoute, otherRoute]);

async function renderSearchCacheRouter(initialPath = "/search?page=1") {
  const router = createRouter({
    history: createMemoryHistory({
      initialEntries: [initialPath],
    }),
    routeTree,
  });

  await act(async () => {
    render(<RouterProvider router={router} />);
    await router.load();
  });

  return router;
}

describe("RouterCacheOutlet search params", () => {
  it("updates useSearch values during same-route search param navigation", async () => {
    const router = await renderSearchCacheRouter();

    await waitFor(() => {
      expect(screen.getByTestId("search-page")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Increase" }));

    await act(async () => {
      await router.navigate({
        search: {
          page: "2",
        },
        to: "/search",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-page")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("search-count")).toHaveTextContent("1");
  });

  it("updates useSearch values when returning to a cached route with new search params", async () => {
    const router = await renderSearchCacheRouter();

    await waitFor(() => {
      expect(screen.getByTestId("search-page")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Increase" }));

    await act(async () => {
      await router.navigate({ to: "/other" });
    });

    expect(screen.getByTestId("other-page")).toBeInTheDocument();

    await act(async () => {
      await router.navigate({
        search: {
          page: "2",
        },
        to: "/search",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("search-page")).toHaveTextContent("2");
    });
    expect(screen.getByTestId("search-count")).toHaveTextContent("1");
  });
});
