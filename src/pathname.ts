const TRAILING_SLASHES_REGEX = /\/+$/u;

export function normalizeCachedRoutePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(TRAILING_SLASHES_REGEX, "");
}
