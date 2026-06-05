import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function PowerOverviewPage() {
  return (
    <section className="page-stack">
      <div className="advanced-hero">
        <div className="hero-copy">
          <p className="eyebrow">Advanced workbench</p>
          <h2>Stress-test a busy claim desk.</h2>
          <p>
            Use these rooms when a page has timers, filters, marked rows, long
            notes, and a scroll position worth keeping.
          </p>
          <div className="button-row">
            <Link className="primary-button" to="/power/draft">
              Open case plan
            </Link>
            <Link className="secondary-button" to="/power/regular">
              Open fresh page
            </Link>
          </div>
        </div>
        <div className="lab-strip">
          <span>Plan activity</span>
          <span>Vendor filters</span>
          <span>Scroll return</span>
          <span>Manual close</span>
        </div>
      </div>

      <div className="feature-grid">
        <ValueCard
          heading="Case plan"
          text="Long notes, selected priority, visible time, and return history."
          to="/power/draft"
        />
        <ValueCard
          heading="Repair network"
          text="Search terms, claim type filters, shortlisted shops, and scroll."
          to="/power/catalog"
        />
        <ValueCard
          heading="Fresh page"
          text="A clean reset point for comparing heavy pages against normal ones."
          to="/power/regular"
        />
      </div>

      <section className="demo-script">
        <div>
          <p className="eyebrow">Power checks</p>
          <h3>Use the workspace shelf while you move around.</h3>
        </div>
        <p>
          Open the case plan and repair network, then use the shelf at the
          bottom to close one saved page or close every saved page at once.
        </p>
      </section>
    </section>
  );
}
