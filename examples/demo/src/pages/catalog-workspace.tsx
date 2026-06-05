import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useRouteCacheEffect } from "tanstack-router-cache";
import { StatusMetric } from "../components/status-metric";
import { READINESS_MAX, SECOND_MS } from "../data";

const routeApi = getRouteApi("/advanced/catalog");

const claimTypeFilters = ["All", "Auto", "Home", "Injury"] as const;

type ClaimTypeFilter = (typeof claimTypeFilters)[number];

function isClaimTypeFilter(value: string): value is ClaimTypeFilter {
  return claimTypeFilters.some((filter) => filter === value);
}

export function CatalogWorkspace() {
  const repairNetwork = routeApi.useLoaderData();
  const [query, setQuery] = useState("");
  const [claimType, setClaimType] = useState<ClaimTypeFilter>("All");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [visibleSeconds, setVisibleSeconds] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredPartners = repairNetwork.partners.filter((partner) => {
    const matchesClaimType =
      claimType === "All" || partner.claimType === claimType;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      partner.name.toLowerCase().includes(normalizedQuery) ||
      partner.city.toLowerCase().includes(normalizedQuery);

    return matchesClaimType && matchesQuery;
  });

  useRouteCacheEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setVisibleSeconds((current) => current + 1);
    }, SECOND_MS);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  const toggleShortlist = (partnerId: string) => {
    setShortlist((current) =>
      current.includes(partnerId)
        ? current.filter((shortlistedId) => shortlistedId !== partnerId)
        : [...current, partnerId]
    );
  };

  const handleClaimTypeChange = (value: string) => {
    if (isClaimTypeFilter(value)) {
      setClaimType(value);
    }
  };

  return (
    <section className="page-stack catalog-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Repair network</p>
          <h2>The vendor shortlist stays ready.</h2>
          <p>
            Search, filter, shortlist a shop, scroll down, and return to the
            same working view.
          </p>
        </div>
        <span className="active-badge">Saved list</span>
      </header>

      <section aria-label="Repair network filters" className="toolbar">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try city or shop"
            value={query}
          />
        </label>
        <label>
          <span>Claim type</span>
          <select
            onChange={(event) => handleClaimTypeChange(event.target.value)}
            value={claimType}
          >
            {claimTypeFilters.map((filter) => (
              <option key={filter}>{filter}</option>
            ))}
          </select>
        </label>
        <StatusMetric label="Prepared" value={repairNetwork.preparedAt} />
        <StatusMetric label="First wait" value={`${repairNetwork.delayMs}ms`} />
        <StatusMetric label="On-screen time" value={`${visibleSeconds}s`} />
        <StatusMetric label="Shortlist" value={String(shortlist.length)} />
      </section>

      <div className="product-grid">
        {filteredPartners.length === 0 ? (
          <div className="empty-results">
            No shops match this search. Try a nearby city or a different claim
            type.
          </div>
        ) : (
          filteredPartners.map((partner) => (
            <article className="product-card" key={partner.id}>
              <div>
                <p>{partner.claimType}</p>
                <h3>{partner.name}</h3>
              </div>
              <dl>
                <div>
                  <dt>City</dt>
                  <dd>{partner.city}</dd>
                </div>
                <div>
                  <dt>Estimate</dt>
                  <dd>{partner.estimate}</dd>
                </div>
              </dl>
              <meter
                aria-label={`${partner.readiness}% ready`}
                className="health-meter"
                max={READINESS_MAX}
                min={0}
                value={partner.readiness}
              />
              <button
                className={
                  shortlist.includes(partner.id)
                    ? "mark-button mark-button-active"
                    : "mark-button"
                }
                onClick={() => toggleShortlist(partner.id)}
                type="button"
              >
                {shortlist.includes(partner.id) ? "Shortlisted" : "Shortlist"}
              </button>
            </article>
          ))
        )}
      </div>

      <div className="scroll-marker">
        <p className="eyebrow">Scroll checkpoint</p>
        <h3>Return here after visiting another room.</h3>
        <div className="button-row">
          <Link className="primary-button" to="/advanced/draft">
            Open case plan
          </Link>
          <Link className="secondary-button" to="/advanced/regular">
            Open fresh page
          </Link>
        </div>
      </div>
    </section>
  );
}
