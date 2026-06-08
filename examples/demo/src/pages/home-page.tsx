import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/");

export function HomePage() {
  const savedPage = routeApi.useLoaderData();
  const [label, setLabel] = useState(savedPage.label);
  const [status, setStatus] = useState(savedPage.status);
  const [note, setNote] = useState(savedPage.note);
  const [keepChecked, setKeepChecked] = useState(true);

  return (
    <section className="page-stack">
      <div className="demo-hero">
        <section
          aria-label="Saved page example"
          className="form-panel demo-editor"
        >
          <header className="demo-title">
            <div>
              <p className="eyebrow">{savedPage.sampleId}</p>
              <h2>Edit. Leave. Return.</h2>
            </div>
            <span className="active-badge">Cached page</span>
          </header>

          <div className="field-grid">
            <label>
              <span>Label</span>
              <input
                onChange={(event) => setLabel(event.target.value)}
                value={label}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                <option>Ready</option>
                <option>In review</option>
                <option>Complete</option>
                <option>Blocked</option>
              </select>
            </label>
          </div>

          <label>
            <span>Note</span>
            <textarea
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              value={note}
            />
          </label>

          <label className="checkbox-row">
            <input
              checked={keepChecked}
              onChange={(event) => setKeepChecked(event.target.checked)}
              type="checkbox"
            />
            <span>Keep this checkbox selected</span>
          </label>

          <div className="button-row">
            <Link className="primary-button" to="/basic/reset-form">
              Open reset form
            </Link>
            <Link className="secondary-button" to="/basic">
              Show comparison
            </Link>
          </div>
        </section>

        <aside aria-label="Demo steps" className="demo-brief">
          <p className="eyebrow">Demo steps</p>
          <h3>State stays available.</h3>
          <ol className="step-list">
            <li>Edit a field.</li>
            <li>Open the reset form.</li>
            <li>Return here.</li>
          </ol>
          <StatusMetric label="Text length" value={`${note.length} chars`} />
          <Link className="text-link" to="/advanced">
            Advanced examples
          </Link>
        </aside>
      </div>
    </section>
  );
}
