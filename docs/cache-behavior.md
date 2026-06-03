# Cache Behavior

- Pathnames are normalized before being stored or removed.
- `maxEntries={0}` disables caching and clears existing cached routes.
- Hidden cached routes are rendered in off-screen containers and receive active-change events.
- Cached dynamic routes can grow memory use if every id is retained; use `maxEntriesPerRouteId` for those routes.
- If a cached destination is restored with an outdated href, the package navigates back to the cached href with `replace: true` and `resetScroll: false`.

## Eviction

`maxEntries` limits the total number of cached route entries managed by one provider.

`maxEntriesPerRouteId` limits cached entries for the same TanStack route id. This is useful for dynamic routes where each pathname can produce a separate cached entry, such as `/customers/$customerId`.

When a limit is exceeded, the least recently visible cached route is evicted first. If timestamps tie, pathnames are used as a deterministic fallback.

## Scope resets

Use `cacheScopeKey` when cached views must not survive a user, tenant, workspace, locale, or environment change.

```tsx
<RouterCacheProvider cacheScopeKey={workspaceId}>
  <RouterCacheOutlet />
</RouterCacheProvider>
```

Changing the scope key clears existing cached route entries for that provider.

