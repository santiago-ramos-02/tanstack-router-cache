import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/");

export function HomePage() {
  const claimFile = routeApi.useLoaderData();
  const [adjuster, setAdjuster] = useState(claimFile.adjuster);
  const [status, setStatus] = useState(claimFile.status);
  const [claimNote, setClaimNote] = useState(claimFile.claimNote);
  const [sendCopy, setSendCopy] = useState(true);

  return (
    <section className="page-stack live-case-page">
      <div className="case-hero">
        <section aria-label="Claim file" className="form-panel case-editor">
          <header className="case-title">
            <div>
              <p className="eyebrow">Claim {claimFile.claimNumber}</p>
              <h2>The claim file stays exactly where you left it.</h2>
            </div>
            <span className="active-badge">Live case</span>
          </header>

          <div className="field-grid">
            <label>
              <span>Adjuster</span>
              <input
                onChange={(event) => setAdjuster(event.target.value)}
                value={adjuster}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                onChange={(event) => setStatus(event.target.value)}
                value={status}
              >
                <option>Reviewing estimate</option>
                <option>Waiting on photos</option>
                <option>Repair scheduled</option>
                <option>Payment ready</option>
              </select>
            </label>
          </div>

          <label>
            <span>Customer note</span>
            <textarea
              onChange={(event) => setClaimNote(event.target.value)}
              rows={4}
              value={claimNote}
            />
          </label>

          <label className="checkbox-row">
            <input
              checked={sendCopy}
              onChange={(event) => setSendCopy(event.target.checked)}
              type="checkbox"
            />
            <span>Send the repair shop a copy</span>
          </label>

          <div className="button-row">
            <Link className="primary-button" to="/basic/regular-form">
              Open the inbox
            </Link>
            <Link className="secondary-button" to="/basic">
              Show the comparison
            </Link>
          </div>
        </section>

        <aside aria-label="Demo checklist" className="case-brief">
          <p className="eyebrow">Try this</p>
          <ol className="step-list">
            <li>Change the customer note.</li>
            <li>Open the inbox.</li>
            <li>Come back to the live case.</li>
          </ol>
          <div className="metric-grid">
            <StatusMetric label="Prepared" value={claimFile.preparedAt} />
            <StatusMetric label="First wait" value={`${claimFile.delayMs}ms`} />
            <StatusMetric label="Desk id" value={claimFile.deskId} />
            <StatusMetric
              label="Note size"
              value={`${claimNote.length} chars`}
            />
          </div>
          <p>
            The inbox starts fresh. This claim keeps the note, selected status,
            checkbox, and scroll position ready for the customer call.
          </p>
          <Link className="text-link" to="/power">
            Open advanced workbench
          </Link>
        </aside>
      </div>

      <div className="feature-grid">
        <Link className="value-card value-card-accent" to="/basic/saved-form">
          <span>Saved claim file</span>
          <p>Leave mid-sentence and return with the same work in place.</p>
        </Link>
        <Link className="value-card" to="/basic/regular-form">
          <span>Scratch note</span>
          <p>Use the reset page to see how a regular screen behaves.</p>
        </Link>
        <Link className="value-card" to="/power/catalog">
          <span>Repair network</span>
          <p>
            Filter and shortlist vendors, then leave without losing context.
          </p>
        </Link>
      </div>
    </section>
  );
}
