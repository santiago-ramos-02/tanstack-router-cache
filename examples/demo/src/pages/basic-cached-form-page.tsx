import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "../components/page-header";
import { StatusMetric } from "../components/status-metric";

const routeApi = getRouteApi("/basic/cached-form");

export function BasicCachedFormPage() {
  const cachedForm = routeApi.useLoaderData();
  const [title, setTitle] = useState(cachedForm.title);
  const [notes, setNotes] = useState(cachedForm.notes);

  return (
    <section className="page-stack">
      <PageHeader
        badge="Saved page"
        eyebrow="Cached form"
        title="This form stays available."
      >
        Type here, visit the reset form, then return. The values stay in place
        while the page is cached.
      </PageHeader>

      <section aria-label="Cached form" className="form-panel compact-form">
        <div className="metric-grid">
          <StatusMetric label="Prepared" value={cachedForm.preparedAt} />
          <StatusMetric label="Load id" value={cachedForm.loadId} />
        </div>
        <label>
          <span>Title</span>
          <input
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
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
          <Link className="primary-button" to="/basic/reset-form">
            Open reset form
          </Link>
          <Link className="secondary-button" to="/advanced">
            Open advanced examples
          </Link>
        </div>
      </section>
    </section>
  );
}
