import { Match, RouterContextProvider } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type CachedOutletProps = {
  matchId: string;
  routerSnapshot: ComponentProps<typeof RouterContextProvider>["router"];
};

export default function CachedOutlet(props: Readonly<CachedOutletProps>) {
  const { matchId, routerSnapshot } = props;
  return (
    <RouterContextProvider router={routerSnapshot}>
      <Match matchId={matchId} />
    </RouterContextProvider>
  );
}
