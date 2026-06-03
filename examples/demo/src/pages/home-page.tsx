import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function HomePage() {
  return (
    <section className="page-stack">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Demo app</p>
          <h2>Two ways to inspect retained routes.</h2>
          <p>
            Start with the basic flow if you only need the normal setup. Use the
            power flow when you want forms, filters, cache controls, and scroll
            restoration in one place.
          </p>
          <div className="button-row">
            <Link className="primary-button" to="/basic">
              Open basic flow
            </Link>
            <Link className="secondary-button" to="/power">
              Open power flow
            </Link>
          </div>
        </div>
        <figure aria-label="Route retention map" className="route-map">
          <div className="route-node route-node-active">
            <span>Basic</span>
            <strong>minimal</strong>
          </div>
          <div className="route-line" />
          <div className="route-node">
            <span>Power</span>
            <strong>edge cases</strong>
          </div>
          <div className="route-line route-line-muted" />
          <div className="route-node route-node-muted">
            <span>Vercel</span>
            <strong>ready</strong>
          </div>
        </figure>
      </div>

      <div className="feature-grid">
        <ValueCard
          heading="Basic setup"
          text="One retained form, one normal form, and the smallest useful route-cache pattern."
          to="/basic"
        />
        <ValueCard
          heading="Power workflow"
          text="Retained forms, filtered lists, cache controls, lifecycle state, and window scroll."
          to="/power"
        />
        <ValueCard
          heading="Compare reset"
          text="Open a normal route beside retained routes to see the default behavior."
          to="/basic/regular-form"
        />
      </div>
    </section>
  );
}
