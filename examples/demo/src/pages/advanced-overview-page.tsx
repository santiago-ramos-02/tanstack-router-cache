import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function AdvancedOverviewPage() {
  return (
    <section className="page-stack">
      <div className="advanced-hero">
        <div className="hero-copy">
          <p className="eyebrow">Advanced examples</p>
          <h2>Use cached pages with larger state.</h2>
          <p>
            Use these pages when an example has timers, filters, marked rows, long
            notes, and a scroll position worth keeping.
          </p>
          <div className="button-row">
            <Link className="primary-button" to="/advanced/draft">
              Open saved draft
            </Link>
            <Link className="secondary-button" to="/advanced/reset">
              Open reset page
            </Link>
          </div>
        </div>
        <div className="lab-strip">
          <span>Draft state</span>
          <span>List filters</span>
          <span>Scroll return</span>
          <span>Manual close</span>
        </div>
      </div>

      <div className="feature-grid">
        <ValueCard
          heading="Saved draft"
          text="Long notes, selected priority, visible time, and return history."
          to="/advanced/draft"
        />
        <ValueCard
          heading="Saved list"
          text="Search terms, category filters, marked rows, and scroll."
          to="/advanced/list"
        />
        <ValueCard
          heading="Reset page"
          text="A clean reset point for comparing heavy pages against normal ones."
          to="/advanced/reset"
        />
      </div>

      <section className="demo-script">
        <div>
          <p className="eyebrow">Advanced checks</p>
          <h3>Use saved page controls while you move around.</h3>
        </div>
        <p>
          Open the saved draft and saved list, then use the controls at the
          bottom to close one saved page or close every saved page at once.
        </p>
      </section>
    </section>
  );
}
