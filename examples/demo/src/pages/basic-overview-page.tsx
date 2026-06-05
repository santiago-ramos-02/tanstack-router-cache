import { Link } from "@tanstack/react-router";
import { ValueCard } from "../components/value-card";

export function BasicOverviewPage() {
  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Guided demo</p>
          <h2>A saved claim beside a scratch note.</h2>
          <p>
            Use this pair when you want to show the difference in a few clicks:
            one page keeps the customer work open, the other starts clean.
          </p>
        </div>
      </header>

      <div className="comparison-grid">
        <ValueCard
          heading="Saved claim"
          text="Type a note, leave the page, and return to the same draft."
          to="/basic/saved-form"
        />
        <ValueCard
          heading="Scratch note"
          text="Add text, leave the page, and watch the note reset."
          to="/basic/regular-form"
        />
        <ValueCard
          heading="Advanced workbench"
          text="Move on when you want timers, filters, marked rows, and cleanup."
          to="/power"
        />
      </div>

      <div className="demo-script">
        <div>
          <p className="eyebrow">Fast path</p>
          <h3>Three clicks make the behavior obvious.</h3>
        </div>
        <ol className="step-list">
          <li>Open the saved claim and change the customer note.</li>
          <li>Open the scratch note and add different text.</li>
          <li>Return to both pages and compare what stayed open.</li>
        </ol>
        <div className="button-row">
          <Link className="primary-button" to="/basic/saved-form">
            Open saved claim
          </Link>
          <Link className="secondary-button" to="/basic/regular-form">
            Open scratch note
          </Link>
        </div>
      </div>
    </section>
  );
}
