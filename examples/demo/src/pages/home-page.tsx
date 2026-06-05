import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/");

const routeCacheSnippet = [
  "const liveCase = createRoute({",
  '  path: "/",',
  "  staticData: { routeCache: true },",
  "  staleTime: Number.POSITIVE_INFINITY,",
  "});",
  "",
  "const scratchNote = createRoute({",
  '  path: "/basic/regular-form",',
  "  gcTime: 0,",
  '  loader: { staleReloadMode: "blocking" },',
  "});",
].join("\n");

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
              <h2>Edit. Leave. Return.</h2>
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
          <p className="eyebrow">Clip path</p>
          <h3>Saved stays. Fresh resets.</h3>
          <ol className="step-list">
            <li>Edit the note.</li>
            <li>Open the inbox.</li>
            <li>Return here.</li>
          </ol>
          <StatusMetric label="Note size" value={`${claimNote.length} chars`} />
          <details className="code-panel">
            <summary>Code</summary>
            <pre>
              <code>{routeCacheSnippet}</code>
            </pre>
          </details>
          <Link className="text-link" to="/advanced">
            Advanced workbench
          </Link>
        </aside>
      </div>
    </section>
  );
}
