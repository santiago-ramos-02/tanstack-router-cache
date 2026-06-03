import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function BasicRegularFormPage() {
  const [notes, setNotes] = useState("");

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Normal route</p>
          <h2>Regular form</h2>
          <p>
            This route has no cache flag, so local state starts fresh after
            navigation.
          </p>
        </div>
        <span className="active-badge muted">Resets</span>
      </header>

      <section aria-label="Regular form" className="form-panel compact-form">
        <label>
          <span>Notes</span>
          <textarea
            onChange={(event) => setNotes(event.target.value)}
            placeholder="This text resets after navigation."
            rows={8}
            value={notes}
          />
        </label>
        <div className="button-row">
          <Link className="primary-button" to="/basic/saved-form">
            Return to saved form
          </Link>
          <Link className="secondary-button" to="/power/regular">
            Compare power route
          </Link>
        </div>
      </section>
    </section>
  );
}
