import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/basic/reset-form");

export function BasicResetFormPage() {
  const resetForm = routeApi.useLoaderData();
  const [notes, setNotes] = useState("");

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Reset form</p>
          <h2>This page resets after you leave.</h2>
          <p>
            Use it as the control page. Add text, visit the cached form, then
            come back and this page has a new load id.
          </p>
        </div>
        <span className="active-badge muted">Resets</span>
      </header>

      <section aria-label="Reset form" className="form-panel compact-form">
        <div className="metric-grid">
          <StatusMetric label="Prepared" value={resetForm.preparedAt} />
          <StatusMetric label="Load id" value={resetForm.loadId} />
          <StatusMetric label="Saved text" value={`${notes.length} chars`} />
        </div>
        <label>
          <span>Notes</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add text, leave, then return."
            rows={8}
            value={notes}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/basic/cached-form">
            Return to cached form
          </Link>
          <Link className="secondary-button" to="/advanced/reset">
            Open reset page
          </Link>
        </div>
      </section>
    </section>
  );
}
