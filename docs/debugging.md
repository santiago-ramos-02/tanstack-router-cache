# Debugging

`RouterCacheOutlet` exposes development diagnostics for the cache.

In non-production environments, diagnostics are available at:

```ts
window.__TANSTACK_ROUTER_CACHE_DEBUG__
```

## Debug API

| Field | Type | Description |
| --- | --- | --- |
| `getSnapshot` | `() => RouterCacheDebugSnapshot` | Returns the last recorded snapshot. |
| `refresh` | `() => RouterCacheDebugSnapshot` | Recomputes and returns a snapshot. |
| `lastSnapshot` | `RouterCacheDebugSnapshot | undefined` | Most recent snapshot. |
| `setWarningThreshold` | `(nextThreshold?: number | null) => void` | Sets a development warning threshold for cached route count. |
| `warningThreshold` | `number | null | undefined` | Current warning threshold. |

## Snapshot fields

| Field | Type | Description |
| --- | --- | --- |
| `totalCachedRouteCount` | `number` | Total cached route count. |
| `cachedRoutePathnames` | `string[]` | Cached route pathnames. |
| `dynamicLookingRouteCount` | `number` | Count of cached routes with id-like dynamic segments. |
| `dynamicLookingRoutePathnames` | `string[]` | Cached pathnames that look dynamic. |
| `hiddenCachedRouteCount` | `number` | Cached routes that are not currently visible. |
| `hiddenContainerCount` | `number` | Hidden DOM containers managed by the package. |
| `visiblePathname` | `string` | Current visible cached pathname. |
