import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/basic/regular-form");

export function BasicRegularFormPage() {
  const scratchNote = routeApi.useLoaderData();
  const [notes, setNotes] = useState("");

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scratch note</p>
          <h2>This page starts fresh after you leave.</h2>
          <p>
            Use it as the control page. Add a note, visit the saved claim, then
            come back and this pad has a new desk id.
          </p>
        </div>
        <span className="active-badge muted">Starts fresh</span>
      </header>

      <section
        aria-label="Scratch note form"
        className="form-panel compact-form"
      >
        <div className="metric-grid">
          <StatusMetric label="Prepared" value={scratchNote.preparedAt} />
          <StatusMetric label="Desk id" value={scratchNote.deskId} />
          <StatusMetric label="Saved text" value={`${notes.length} chars`} />
        </div>
        <label>
          <span>Temporary note</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add a note, leave, then return."
            rows={8}
            value={notes}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/basic/saved-form">
            Return to saved claim
          </Link>
          <Link className="secondary-button" to="/power/regular">
            Open fresh page
          </Link>
        </div>
      </section>
    </section>
  );
}
