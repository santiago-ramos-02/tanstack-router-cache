import type { ReactNode } from "react";
import { createContext, use, useMemo } from "react";

import type { ActivityMode } from "../types";

type RouteCacheActivity = {
  mode: ActivityMode;
  pathname: string;
};

const RouteCacheActivityContext = createContext<RouteCacheActivity | null>(
  null
);

export function RouteCacheActivityProvider({
  children,
  mode,
  pathname,
}: Readonly<RouteCacheActivity & { children: ReactNode }>) {
  const value = useMemo(() => ({ mode, pathname }), [mode, pathname]);

  return (
    <RouteCacheActivityContext.Provider value={value}>
      {children}
    </RouteCacheActivityContext.Provider>
  );
}

export function useOptionalRouteCacheActivity() {
  return use(RouteCacheActivityContext);
}
