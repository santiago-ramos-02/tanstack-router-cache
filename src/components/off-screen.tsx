import { RouteCacheActivityProvider } from "../contexts/route-cache-activity";
import type { OffScreenInProps } from "./off-screen-in";
import OffScreenIn from "./off-screen-in";

export default function OffScreen(
  props: Readonly<OffScreenInProps & { pathname: string }>
) {
  return (
    <RouteCacheActivityProvider mode={props.mode} pathname={props.pathname}>
      <OffScreenIn {...props} />
    </RouteCacheActivityProvider>
  );
}
