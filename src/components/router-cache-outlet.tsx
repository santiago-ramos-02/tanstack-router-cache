import RouteCacheManager from "./route-cache-manager";

export type RouterCacheOutletProps = {
  children?: React.ReactNode;
};

export function RouterCacheOutlet(props: Readonly<RouterCacheOutletProps>) {
  const { children } = props;

  return (
    <>
      <RouteCacheManager />
      {children}
    </>
  );
}
