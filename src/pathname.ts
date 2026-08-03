function trimTrailingSlashes(value: string) {
  let end = value.length;
  while (end > 0 && value[end - 1] === "/") {
    end -= 1;
  }
  return value.slice(0, end);
}

export function normalizeCachedRoutePathname(pathname: string) {
  if (pathname === "/") {
    return pathname;
  }

  return trimTrailingSlashes(pathname);
}
