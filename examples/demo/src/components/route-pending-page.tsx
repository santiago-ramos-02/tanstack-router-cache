export function RoutePendingPage({
  detail,
  heading,
}: Readonly<{
  detail: string;
  heading: string;
}>) {
  return (
    <section aria-live="polite" className="pending-page">
      <div className="pending-card">
        <span className="loading-bar" />
        <p className="eyebrow">Loading page</p>
        <h2>{heading}</h2>
        <p>{detail}</p>
      </div>
    </section>
  );
}
