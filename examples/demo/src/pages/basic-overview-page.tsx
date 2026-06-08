import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function BasicOverviewPage() {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Guided demo</p>
          <h2>A cached form beside a reset form.</h2>
          <p>
            Use this pair when you want to show the difference in a few clicks:
            one page keeps local state, the other starts clean.
          </p>
        </div>
      </header>

      <div className="comparison-grid">
        <ValueCard
          heading="Cached form"
          text="Type a note, leave the page, and return to the same value."
          to="/basic/cached-form"
        />
        <ValueCard
          heading="Reset form"
          text="Add text, leave the page, and watch the value reset."
          to="/basic/reset-form"
        />
        <ValueCard
          heading="Advanced examples"
          text="Move on when you want timers, filters, marked rows, and cleanup."
          to="/advanced"
        />
      </div>

      <div className="demo-script">
        <div>
          <p className="eyebrow">Fast path</p>
          <h3>Three clicks make the behavior obvious.</h3>
        </div>
        <ol className="step-list">
          <li>Open the cached form and change the text.</li>
          <li>Open the reset form and add different text.</li>
          <li>Return to both pages and compare what stayed available.</li>
        </ol>
        <div className="button-row">
          <Link className="primary-button" to="/basic/cached-form">
            Open cached form
          </Link>
          <Link className="secondary-button" to="/basic/reset-form">
            Open reset form
          </Link>
        </div>
      </div>
    </section>
  );
}
