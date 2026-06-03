import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function HomePage() {
  return (
    <section className="page-stack">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Interactive demo</p>
          <h2>Keep route views warm without moving page state globally.</h2>
          <p>
            Work in a draft, tune catalog filters, jump away, then return to the
            exact page you left.
          </p>
          <div className="button-row">
            <Link className="primary-button" to="/draft">
              Open draft
            </Link>
            <Link className="secondary-button" to="/regular">
              Compare reset
            </Link>
          </div>
        </div>
        <figure aria-label="Route retention map" className="route-map">
          <div className="route-node route-node-active">
            <span>Draft</span>
            <strong>retained</strong>
          </div>
          <div className="route-line" />
          <div className="route-node">
            <span>Catalog</span>
            <strong>retained</strong>
          </div>
          <div className="route-line route-line-muted" />
          <div className="route-node route-node-muted">
            <span>Normal</span>
            <strong>reset</strong>
          </div>
        </figure>
      </div>

      <div className="feature-grid">
        <ValueCard
          heading="Long forms"
          text="Draft text, choices, and timers remain in place after route changes."
          to="/draft"
        />
        <ValueCard
          heading="Filtered lists"
          text="Search terms, selected rows, and scroll position survive navigation."
          to="/catalog"
        />
        <ValueCard
          heading="Control route"
          text="A regular route shows the default reset behavior side by side."
          to="/regular"
        />
      </div>
    </section>
  );
}
