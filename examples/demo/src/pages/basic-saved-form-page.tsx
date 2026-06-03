import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRouteCacheActive } from "tanstack-router-cache";
import { ActiveBadge } from "../components/active-badge";

export function BasicSavedFormPage() {
  const isActive = useRouteCacheActive();
  const [name, setName] = useState("Renewal notes");
  const [notes, setNotes] = useState("");

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Retained route</p>
          <h2>Saved form</h2>
          <p>
            Type here, visit another route, then return. This page remains
            mounted while hidden.
          </p>
        </div>
        <ActiveBadge active={isActive} />
      </header>

      <section aria-label="Saved form" className="form-panel compact-form">
        <label>
          <span>Name</span>
          <input
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label>
          <span>Notes</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="This text stays here after navigation."
            rows={8}
            value={notes}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/basic/regular-form">
            Open regular form
          </Link>
          <Link className="secondary-button" to="/power">
            Open power flow
          </Link>
        </div>
      </section>
    </section>
  );
}
