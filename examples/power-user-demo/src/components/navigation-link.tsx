import { Link } from "@tanstack/react-router";

type DemoRoute = "/" | "/draft" | "/catalog" | "/regular";

export function NavigationLink({
  label,
  to,
}: Readonly<{ label: string; to: DemoRoute }>) {
  return (
    <Link
      activeProps={{ "data-active": "true" }}
      className="nav-link"
      preload="intent"
      to={to}
    >
      {label}
    </Link>
  );
}
