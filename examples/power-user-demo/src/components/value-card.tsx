import { Link } from "@tanstack/react-router";

export function ValueCard({
  heading,
  text,
  to,
}: Readonly<{
  heading: string;
  text: string;
  to: "/draft" | "/catalog" | "/regular";
}>) {
  return (
    <Link className="value-card" to={to}>
      <span>{heading}</span>
      <p>{text}</p>
    </Link>
  );
}
