import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusMetric } from "../components/status-metric";
import { SECOND_MS } from "../data";

const routeApi = getRouteApi("/power/regular");

export function RegularWorkspace() {
  const freshWorkspace = routeApi.useLoaderData();
  const [headline, setHeadline] = useState(freshWorkspace.headline);
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
          <p className="eyebrow">Fresh page</p>
          <h2>This room starts over each time.</h2>
          <p>
            Use this page as the control check when you want to compare a saved
            workspace with a normal reset.
          </p>
        </div>
        <span className="active-badge muted">Starts fresh</span>
      </header>

      <section aria-label="Fresh page form" className="form-panel compact-form">
        <div className="metric-grid">
          <StatusMetric label="Prepared" value={freshWorkspace.preparedAt} />
          <StatusMetric
            label="First wait"
            value={`${freshWorkspace.delayMs}ms`}
          />
          <StatusMetric label="Desk id" value={freshWorkspace.deskId} />
          <StatusMetric label="Open time" value={`${seconds}s`} />
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
            placeholder="Add a temporary note, leave, then return."
            rows={8}
            value={detail}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/power/draft">
            Open case plan
          </Link>
          <Link className="secondary-button" to="/power/catalog">
            Open repair network
          </Link>
        </div>
      </section>
    </section>
  );
}
