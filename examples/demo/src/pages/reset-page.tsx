import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StatusMetric } from "../components/status-metric";
import { SECOND_MS } from "../data";

const routeApi = getRouteApi("/advanced/reset");

export function ResetPage() {
  const resetPage = routeApi.useLoaderData();
  const [title, setTitle] = useState(resetPage.title);
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
          <p className="eyebrow">Reset page</p>
          <h2>This page resets each time.</h2>
          <p>
            Use this page as the control check when you want to compare a
            cached page with a normal reset.
          </p>
        </div>
        <span className="active-badge muted">Resets</span>
      </header>

      <section aria-label="Reset page form" className="form-panel compact-form">
        <div className="metric-grid">
          <StatusMetric label="Prepared" value={resetPage.preparedAt} />
          <StatusMetric
            label="First wait"
            value={`${resetPage.delayMs}ms`}
          />
          <StatusMetric label="Load id" value={resetPage.loadId} />
          <StatusMetric label="Open time" value={`${seconds}s`} />
        </div>
        <label>
          <span>Title</span>
          <input
            onChange={(event) => setTitle(event.target.value)}
            value={title}
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
          <Link className="primary-button" to="/advanced/draft">
            Open saved draft
          </Link>
          <Link className="secondary-button" to="/advanced/list">
            Open saved list
          </Link>
        </div>
      </section>
    </section>
  );
}
