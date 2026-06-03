# tanstack-router-cache

Route view caching for [`@tanstack/react-router`](https://tanstack.com/router).

`tanstack-router-cache` keeps selected route trees mounted while they are hidden, then restores them when the user navigates back. Use it for tab-like workflows, long forms, filtered lists, scroll positions, and page state that should survive route changes without moving everything into global state.

## Install

```sh
bun add tanstack-router-cache
```

```sh
npm install tanstack-router-cache
```

## Consumer requirements

Your app should already use React and TanStack Router. This package keeps them as peer dependencies so it does not install a second router or React runtime.

| Package | Supported versions |
| --- | --- |
| `react` | `>=19.0.0 <20.0.0` |
| `react-dom` | Match your React version. |
| `@tanstack/react-router` | `>=1.168.14 <2.0.0` |

## Maintenance

This package is intended to stay compatible with current TanStack Router 1.x releases. The peer dependency floor is tested against the oldest version supported by the current implementation, while development tracks the latest compatible TanStack Router version.

## Usage

Wrap the route tree that should support retention:

```tsx
import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";

export function RootRoute() {
  return (
    <RouterCacheProvider maxEntries={8} maxEntriesPerRouteId={2}>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}
```

Enable caching on a route:

```tsx
export const Route = createFileRoute("/customers")({
  staticData: {
    routeCache: true,
  },
  component: CustomersPage,
});
```

Run work only while a retained route is visible:

```tsx
import { useRouteCacheEffect } from "tanstack-router-cache";

function CustomersPage() {
  useRouteCacheEffect(() => {
    const controller = new AbortController();

    return () => {
      controller.abort();
    };
  }, []);

  return <CustomersTable />;
}
```

More usage details are in [docs/usage.md](./docs/usage.md).

## Acknowledgements

This project originated from [`hemengke1997/tanstack-router-keepalive`](https://github.com/hemengke1997/tanstack-router-keepalive). The implementation has since diverged substantially, including current TanStack Router compatibility, cache limits, error handling, navigation lifecycle instrumentation, dependency updates, and memory-focused eviction.

## License

MIT. See [LICENSE](./LICENSE).
