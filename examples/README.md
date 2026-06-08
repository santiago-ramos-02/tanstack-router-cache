# Examples

Use [demo](./demo). It is a deployable Vite app with neutral route-cache examples:

- Saved page: a retained route that keeps form state after navigation.
- Guided comparison: a cached form beside a reset form.
- Advanced examples: retained forms, filtered lists, manual close controls,
  lifecycle state, and window scroll restoration.

The retained pages use TanStack Router loaders that call delayed demo server
functions, so first visits show a wait and cached returns are easy to spot.

The demo uses public npm packages only.
