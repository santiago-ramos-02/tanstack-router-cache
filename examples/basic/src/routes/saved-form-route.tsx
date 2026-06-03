import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRouteCacheActive } from "tanstack-router-cache";

export function SavedFormRoute() {
  const isActive = useRouteCacheActive();
  const [name, setName] = useState("Renewal notes");
  const [notes, setNotes] = useState("");

  return (
    <section className="panel">
      <p className="eyebrow">Retained route</p>
      <h2>Saved form</h2>
      <p className={isActive ? "status" : "status muted"}>
        {isActive ? "Visible" : "Parked"}
      </p>
      <label>
        Name
        <input
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </label>
      <label>
        Notes
        <textarea
          onChange={(event) => setNotes(event.target.value)}
          placeholder="This text stays here after navigation."
          rows={8}
          value={notes}
        />
      </label>
      <Link to="/regular-form">Open regular form</Link>
    </section>
  );
}
