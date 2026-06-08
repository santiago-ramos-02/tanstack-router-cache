import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRouteCacheEffect } from "tanstack-router-cache";
import { StatusMetric } from "../components/status-metric";
import { PROGRESS_MAX, SECOND_MS } from "../data";

const routeApi = getRouteApi("/advanced/list");

const demoCategories = ["All", "Form", "List", "Detail"] as const;

type DemoCategoryFilter = (typeof demoCategories)[number];

function isDemoCategoryFilter(value: string): value is DemoCategoryFilter {
  return demoCategories.some((filter) => filter === value);
}

export function SavedListPage() {
  const savedList = routeApi.useLoaderData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DemoCategoryFilter>("All");
  const [markedIds, setMarkedIds] = useState<string[]>([]);
  const [visibleSeconds, setVisibleSeconds] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRecords = savedList.records.filter((record) => {
    const matchesCategory =
      category === "All" || record.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      record.name.toLowerCase().includes(normalizedQuery) ||
      record.group.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  useRouteCacheEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setVisibleSeconds((current) => current + 1);
    }, SECOND_MS);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  const toggleMarked = (recordId: string) => {
    setMarkedIds((current) =>
      current.includes(recordId)
        ? current.filter((markedId) => markedId !== recordId)
        : [...current, recordId]
    );
  };

  const handleCategoryChange = (value: string) => {
    if (isDemoCategoryFilter(value)) {
      setCategory(value);
    }
  };

  return (
    <section className="page-stack catalog-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Saved list</p>
          <h2>The filtered list stays ready.</h2>
          <p>
            Search, filter, mark a row, scroll down, and return to the
            same working view.
          </p>
        </div>
        <span className="active-badge">Saved list</span>
      </header>

      <section aria-label="Saved list filters" className="toolbar">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try item or group"
            value={query}
          />
        </label>
        <label>
          <span>Category</span>
          <select
            onChange={(event) => handleCategoryChange(event.target.value)}
            value={category}
          >
            {demoCategories.map((filter) => (
              <option key={filter}>{filter}</option>
            ))}
          </select>
        </label>
        <StatusMetric label="Prepared" value={savedList.preparedAt} />
        <StatusMetric label="First wait" value={`${savedList.delayMs}ms`} />
        <StatusMetric label="On-screen time" value={`${visibleSeconds}s`} />
        <StatusMetric label="Marked" value={String(markedIds.length)} />
      </section>

      <div className="record-grid">
        {filteredRecords.length === 0 ? (
          <div className="empty-results">
            No records match this search. Try a different category or group.
          </div>
        ) : (
          filteredRecords.map((record) => (
            <article className="record-card" key={record.id}>
              <div>
                <p>{record.category}</p>
                <h3>{record.name}</h3>
              </div>
              <dl>
                <div>
                  <dt>Group</dt>
                  <dd>{record.group}</dd>
                </div>
                <div>
                  <dt>Metric</dt>
                  <dd>{record.metric}</dd>
                </div>
              </dl>
              <meter
                aria-label={`${record.progress}% complete`}
                className="health-meter"
                max={PROGRESS_MAX}
                min={0}
                value={record.progress}
              />
              <button
                className={
                  markedIds.includes(record.id)
                    ? "mark-button mark-button-active"
                    : "mark-button"
                }
                onClick={() => toggleMarked(record.id)}
                type="button"
              >
                {markedIds.includes(record.id) ? "Marked" : "Mark"}
              </button>
            </article>
          ))
        )}
      </div>

      <div className="scroll-marker">
        <p className="eyebrow">Scroll checkpoint</p>
        <h3>Return here after visiting another page.</h3>
        <div className="button-row">
          <Link className="primary-button" to="/advanced/draft">
            Open saved draft
          </Link>
          <Link className="secondary-button" to="/advanced/reset">
            Open reset page
          </Link>
        </div>
      </div>
    </section>
  );
}
