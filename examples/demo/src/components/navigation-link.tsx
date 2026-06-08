import { Link } from "@tanstack/react-router";

type DemoRoute =
  | "/"
  | "/advanced"
  | "/advanced/draft"
  | "/advanced/list"
  | "/advanced/reset"
  | "/basic"
  | "/basic/cached-form"
  | "/basic/reset-form";

const parentRoutes = new Set<DemoRoute>(["/advanced", "/basic"]);

export function NavigationLink({
  label,
  to,
}: Readonly<{ label: string; to: DemoRoute }>) {
  return (
    <Link
      activeOptions={{ exact: !parentRoutes.has(to) }}
      activeProps={{ "data-active": "true" }}
      className="nav-link"
      to={to}
    >
      {label}
    </Link>
  );
}
