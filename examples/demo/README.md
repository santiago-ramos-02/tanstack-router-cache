# Demo app

Deployable Vite demo for `tanstack-router-cache`.

The app opens on a claim file that stays alive while the user visits another
page. It also includes:

- Guided comparison: a saved claim file beside a scratch note that resets.
- Advanced workbench: long notes, filtered repair partners, marked rows,
  lifecycle state, manual close controls, and scroll restoration.

Cached pages use route loaders that call delayed demo server functions. The
first visit shows the loading delay; returning to a cached page keeps the
prepared time, desk id, and local state in place.

```sh
bun install
bun run dev
```

## Vercel

The Vercel project config lives at the package root in `../../vercel.json`.
Import the Git repository in Vercel with `packages/tanstack-router-cache` as the
project root when deploying from the parent monorepo. The config installs this
demo folder, builds it, and serves `examples/demo/dist`.

Deploy this example after the `tanstack-router-cache` version in `package.json` has been published to npm.
