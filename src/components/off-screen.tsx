import type { OffScreenInProps } from "./off-screen-in";
import OffScreenIn from "./off-screen-in";

export default function OffScreen(
  props: Readonly<OffScreenInProps & { pathname: string }>
) {
  return <OffScreenIn {...props} />;
}
