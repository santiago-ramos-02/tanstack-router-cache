import { useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { normalizeCachedRoutePathname } from "../pathname";
import { useEventListener } from "./use-event-listener";

function useRoutePathname(pathname?: string) {
  const locationPathname = useLocation({
    select: (location) => (location as { pathname: string }).pathname,
  });

  return normalizeCachedRoutePathname(pathname ?? locationPathname);
}

export function useRouteCacheActive(pathname?: string) {
  const routePathname = useRoutePathname(pathname);
  const [isActive, setIsActive] = useState(true);

  useEventListener({
    on: {
      activeChange: ({ pathname: changedPathname, mode }) => {
        if (changedPathname === routePathname) {
          setIsActive(mode === "visible");
        }
      },
    },
  });

  return isActive;
}
