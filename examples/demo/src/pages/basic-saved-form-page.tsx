import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/basic/saved-form");

export function BasicSavedFormPage() {
  const savedClaim = routeApi.useLoaderData();
  const [claim, setClaim] = useState(savedClaim.claim);
  const [notes, setNotes] = useState(savedClaim.notes);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Saved claim</p>
          <h2>This customer file stays open.</h2>
          <p>
            Type here, visit the scratch note, then return. The draft stays
            exactly as the adjuster left it.
          </p>
        </div>
        <span className="active-badge">Saved page</span>
      </header>

      <section
        aria-label="Saved claim form"
        className="form-panel compact-form"
      >
        <div className="metric-grid">
          <StatusMetric label="Prepared" value={savedClaim.preparedAt} />
          <StatusMetric label="Desk id" value={savedClaim.deskId} />
        </div>
        <label>
          <span>Claim</span>
          <input
            onChange={(event) => setClaim(event.target.value)}
            value={claim}
          />
        </label>
        <label>
          <span>Customer note</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add the next customer update."
            rows={8}
            value={notes}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/basic/regular-form">
            Open scratch note
          </Link>
          <Link className="secondary-button" to="/advanced">
            Open advanced workbench
          </Link>
        </div>
      </section>
    </section>
  );
}
