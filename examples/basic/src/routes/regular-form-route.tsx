import { Link } from "@tanstack/react-router";
import { useState } from "react";

export function RegularFormRoute() {
  const [notes, setNotes] = useState("");

  return (
    <section className="panel">
      <p className="eyebrow">Normal route</p>
      <h2>Regular form</h2>
      <p>This route is not retained, so it starts fresh after navigation.</p>
      <label>
        Notes
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          placeholder="This text resets after navigation."
          rows={8}
          value={notes}
        />
      </label>
      <Link to="/saved-form">Return to saved form</Link>
    </section>
  );
}
