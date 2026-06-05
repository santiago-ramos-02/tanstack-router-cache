# Examples

Use [demo](./demo). It is a deployable Vite app with a claim-desk scenario:

- Live case: a retained claim file that keeps form state after navigation.
- Guided comparison: a saved claim beside a scratch note that resets.
- Advanced workbench: retained forms, filtered lists, manual close controls,
  lifecycle state, and window scroll restoration.

The retained pages use TanStack Router loaders that call delayed demo server
functions, so first visits show a wait and cached returns are easy to spot.

The demo uses public npm packages only.
