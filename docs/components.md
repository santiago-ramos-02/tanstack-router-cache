# Components

## `RouterCacheProvider`

Owns the route cache and exposes cache state to the rest of the package.

```tsx
<RouterCacheProvider
  cacheScopeKey={tenantId}
  defaultCachedRoutes={{}}
  maxEntries={10}
  maxEntriesPerRouteId={2}
>
  <RouterCacheOutlet />
</RouterCacheProvider>
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | Required | The outlet and surrounding UI that can use the cache. |
| `cacheScopeKey` | `string | number | null` | `"__default__"` | Resets the entire cache when the key changes. Use this for tenant, user, workspace, or environment changes. |
| `defaultCachedRoutes` | `CachedRoutes` | `{}` | Initial cache data. Most apps do not need this. Entries without enabled `staticData.routeCache` or entries older than their `maxAge` are ignored. |
| `maxEntries` | `number` | `Infinity` | Maximum cached route entries across the provider. `0` disables caching. Non-finite or invalid values are treated as `Infinity`. |
| `maxEntriesPerRouteId` | `number` | `Infinity` | Maximum cached entries for the same TanStack route id. Useful for dynamic routes such as `/customers/$id`. |

When a cache limit is exceeded, the least recently visible cached route is evicted first. If timestamps tie, pathnames are used as a deterministic fallback.

## `RouterCacheOutlet`

Renders the live TanStack Router outlet and any hidden cached route views.

```tsx
<RouterCacheOutlet />
```

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | `undefined` | Optional content rendered after the outlet manager. |

Use one `RouterCacheOutlet` inside a `RouterCacheProvider` for the route branch you want to cache.
