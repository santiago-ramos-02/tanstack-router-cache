export function ActiveBadge({ active }: Readonly<{ active: boolean }>) {
  return (
    <span className={active ? "active-badge" : "active-badge muted"}>
      {active ? "Visible" : "Parked"}
    </span>
  );
}
