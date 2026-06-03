import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function BasicOverviewPage() {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Basic flow</p>
          <h2>The setup most apps need.</h2>
          <p>
            Enable route caching on one route, leave a normal route alone, then
            compare the behavior side by side.
          </p>
        </div>
      </header>

      <div className="feature-grid">
        <ValueCard
          heading="Saved form"
          text="This route uses staticData.routeCache and keeps local input state."
          to="/basic/saved-form"
        />
        <ValueCard
          heading="Regular form"
          text="This route has no cache flag, so its local state resets normally."
          to="/basic/regular-form"
        />
        <ValueCard
          heading="Power flow"
          text="Open the larger scenario when you want to inspect edge cases."
          to="/power"
        />
      </div>

      <div className="form-panel compact-form">
        <p className="eyebrow">Route setup</p>
        <h3>Mark only the routes that should stay mounted.</h3>
        <pre className="code-panel">
          <code>{`staticData: {
  routeCache: true,
}`}</code>
        </pre>
        <div className="button-row">
          <Link className="primary-button" to="/basic/saved-form">
            Open saved form
          </Link>
          <Link className="secondary-button" to="/basic/regular-form">
            Compare reset
          </Link>
        </div>
      </div>
    </section>
  );
}
