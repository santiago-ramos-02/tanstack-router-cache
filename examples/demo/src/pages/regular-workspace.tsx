import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusMetric } from "../components/status-metric";
import { createSessionStamp, SECOND_MS } from "../data";

export function RegularWorkspace() {
  const [stamp] = useState(() => createSessionStamp());
  const [headline, setHeadline] = useState("Temporary note");
  const [detail, setDetail] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setSeconds((current) => current + 1);
    }, SECOND_MS);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Normal route</p>
          <h2>Default reset behavior</h2>
          <p>
            This route is not retained, so local state starts fresh after route
            changes.
          </p>
        </div>
        <span className="active-badge muted">Resets</span>
      </header>

      <section
        aria-label="Normal route form"
        className="form-panel compact-form"
      >
        <div className="metric-grid">
          <StatusMetric label="Workspace" value={stamp} />
          <StatusMetric label="Mounted time" value={`${seconds}s`} />
        </div>
        <label>
          <span>Headline</span>
          <input
            onChange={(event) => setHeadline(event.target.value)}
            value={headline}
          />
        </label>
        <label>
          <span>Details</span>
          <textarea
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Add text, leave the page, then return."
            rows={8}
            value={detail}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/power/draft">
            Open retained draft
          </Link>
          <Link className="secondary-button" to="/power/catalog">
            Open retained catalog
          </Link>
        </div>
      </section>
    </section>
  );
}
