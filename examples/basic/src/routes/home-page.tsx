import { Link } from "@tanstack/react-router";

export function HomePage() {
  return (
    <section className="panel">
      <p className="eyebrow">Basic example</p>
      <h2>Keep local page state through route changes.</h2>
      <p>
        Type in the saved form, open the regular form, then return. The saved
        form keeps its local state because its route has `routeCache: true`.
      </p>
      <div className="actions">
        <Link className="primary" to="/saved-form">
          Open saved form
        </Link>
        <Link to="/regular-form">Compare reset</Link>
      </div>
    </section>
  );
}
