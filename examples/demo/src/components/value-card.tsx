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
    | "/basic/saved-form"
    | "/basic/regular-form"
    | "/power"
    | "/power/draft"
    | "/power/catalog"
    | "/power/regular";
}>) {
  return (
    <Link className="value-card" to={to}>
      <span>{heading}</span>
      <p>{text}</p>
    </Link>
  );
}
