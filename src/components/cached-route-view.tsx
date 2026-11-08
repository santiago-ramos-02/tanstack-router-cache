import { memo, useMemo } from "react";
import type { ComponentProps } from "react";

import type { ActivityMode, RouteCacheEffectMode } from "../types";
import CachedOutlet from "./cached-outlet";
import OffScreen from "./off-screen";

type CachedRouteViewProps = {
  effectMode: RouteCacheEffectMode;
  mode: ActivityMode;
  pathname: string;
  rootRouteId: string;
  routerSnapshot: ComponentProps<typeof CachedOutlet>["routerSnapshot"];
};

/**
 * One retained route view. It is a memo boundary so a navigation renders only
 * the views whose mode changes; the others keep their element and are never
 * reconciled. The outlet element is kept too, so a mode change does not hand
 * the retained subtree new children.
 */
function CachedRouteViewIn(props: Readonly<CachedRouteViewProps>) {
  const { effectMode, mode, pathname, rootRouteId, routerSnapshot } = props;
  const outlet = useMemo(
    () => (
      <CachedOutlet routeId={rootRouteId} routerSnapshot={routerSnapshot} />
    ),
    [rootRouteId, routerSnapshot]
  );

  return (
    <OffScreen effectMode={effectMode} mode={mode} pathname={pathname}>
      {outlet}
    </OffScreen>
  );
}

const CachedRouteView = memo(CachedRouteViewIn);

export default CachedRouteView;
