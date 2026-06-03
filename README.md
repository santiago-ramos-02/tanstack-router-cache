# tanstack-router-cache

Route view caching for [`@tanstack/react-router`](https://tanstack.com/router).

Keep selected route trees mounted while they are hidden, then restore them when the user navigates back.

## Install

```sh
npm install tanstack-router-cache
```

```sh
bun add tanstack-router-cache
```

## Requirements

Your app should already install these packages:

| Package | Supported versions |
| --- | --- |
| `react` | `>=19.0.0 <20.0.0` |
| `react-dom` | Match your React version. |
| `@tanstack/react-router` | `>=1.168.14 <2.0.0` |

## Usage

Wrap your route outlet once:

```tsx
import { RouterCacheOutlet, RouterCacheProvider } from "tanstack-router-cache";

export function RootRoute() {
  return (
    <RouterCacheProvider>
      <RouterCacheOutlet />
    </RouterCacheProvider>
  );
}
```

Enable caching on any route that should stay mounted:

```tsx
export const Route = createFileRoute("/customers")({
  staticData: {
    routeCache: true,
  },
  component: CustomersPage,
});
```

For the full API, see [docs](./docs).

## Examples

- [Basic](https://github.com/santiago-ramos-02/tanstack-router-cache/tree/main/examples/basic): the smallest useful setup. Start here; most apps only need this pattern.
- [Power-user demo](https://github.com/santiago-ramos-02/tanstack-router-cache/tree/main/examples/power-user-demo): a larger demo with retained forms, filtered lists, cache controls, route lifecycle state, and window scroll restoration. Use it when you need to inspect edge cases.

## Acknowledgements

This project originated from [`hemengke1997/tanstack-router-keepalive`](https://github.com/hemengke1997/tanstack-router-keepalive), then diverged with current TanStack Router compatibility, a different API, cache limits, error handling, navigation lifecycle tools, dependency updates, and memory-focused eviction.

## License

MIT. See [LICENSE](./LICENSE).
