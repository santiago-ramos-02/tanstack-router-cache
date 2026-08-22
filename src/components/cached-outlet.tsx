import { Match, RouterContextProvider } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type CachedOutletProps = {
  routeId: string;
  routerSnapshot: ComponentProps<typeof RouterContextProvider>["router"];
};

export default function CachedOutlet(props: Readonly<CachedOutletProps>) {
  const { routeId, routerSnapshot } = props;
  return (
    <RouterContextProvider router={routerSnapshot}>
      <Match routeId={routeId} />
    </RouterContextProvider>
  );
}
