# Demo app

Deployable Vite demo for `tanstack-router-cache`.

The app opens on a saved page that stays alive while the user visits another
page. It also includes:

- Guided comparison: a cached form beside a reset form.
- Advanced examples: long notes, filtered records, marked rows,
  lifecycle state, manual close controls, and scroll restoration.

Cached pages use route loaders that call delayed demo server functions. The
first visit shows the loading delay; returning to a cached page keeps the
prepared time, load id, and local state in place.

```sh
bun install
bun run dev
```
