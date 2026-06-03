type RestoreCachedHrefInput = {
  cachedHref?: string;
  currentHref?: string;
  currentPathname: string;
  isRouteCacheEnabled?: boolean;
  previousPathname?: string;
};

const FALLBACK_ORIGIN = "http://tanstack-router-cache.local";

function parseHref(href: string) {
  try {
    const url = new URL(href, FALLBACK_ORIGIN);

    return {
      hasHash: url.hash.length > 0,
      hasSearch: url.search.length > 0,
      pathname: url.pathname,
    };
  } catch {
    return null;
  }
}

export function isBareRouteHref(
  href: string | undefined,
  currentPathname: string
) {
  const candidateHref = href ?? currentPathname;
  const parsedHref = parseHref(candidateHref);

  if (!parsedHref) {
    return candidateHref === currentPathname;
  }

  return (
    parsedHref.pathname === currentPathname &&
    !parsedHref.hasSearch &&
    !parsedHref.hasHash
  );
}

export function shouldRestoreCachedHref({
  cachedHref,
  currentHref,
  currentPathname,
  isRouteCacheEnabled,
  previousPathname,
}: RestoreCachedHrefInput): boolean {
  if (!(isRouteCacheEnabled && cachedHref)) {
    return false;
  }

  if (!previousPathname || previousPathname === currentPathname) {
    return false;
  }

  if (!isBareRouteHref(currentHref, currentPathname)) {
    return false;
  }

  return cachedHref !== (currentHref ?? currentPathname);
}
