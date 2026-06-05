import { Link } from "@tanstack/react-router";

type DemoRoute =
  | "/"
  | "/basic"
  | "/basic/saved-form"
  | "/basic/regular-form"
  | "/power"
  | "/power/draft"
  | "/power/catalog"
  | "/power/regular";

export function NavigationLink({
  label,
  to,
}: Readonly<{ label: string; to: DemoRoute }>) {
  return (
    <Link
      activeOptions={{ exact: true }}
      activeProps={{ "data-active": "true" }}
      className="nav-link"
      to={to}
    >
      {label}
    </Link>
  );
}
