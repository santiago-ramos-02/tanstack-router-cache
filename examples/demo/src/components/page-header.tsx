import type { ReactNode } from "react";

/** How each demo page opens: what it is, what to try, and whether it keeps state. */
export function PageHeader({
  badge,
  children,
  eyebrow,
  muted = false,
  title,
}: Readonly<{
  badge?: string;
  children: ReactNode;
  eyebrow: string;
  muted?: boolean;
  title: string;
}>) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
      {badge ? (
        <span className={muted ? "active-badge muted" : "active-badge"}>
          {badge}
        </span>
      ) : null}
    </header>
  );
}
