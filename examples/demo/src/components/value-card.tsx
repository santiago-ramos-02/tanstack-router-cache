import { Link } from "@tanstack/react-router";

export function ValueCard({
  heading,
  text,
  to,
}: Readonly<{
  heading: string;
  text: string;
  to:
    | "/basic"
    | "/basic/cached-form"
    | "/basic/reset-form"
    | "/advanced"
    | "/advanced/draft"
    | "/advanced/list"
    | "/advanced/reset";
}>) {
  return (
    <Link className="value-card" to={to}>
      <span>{heading}</span>
      <p>{text}</p>
    </Link>
  );
}
