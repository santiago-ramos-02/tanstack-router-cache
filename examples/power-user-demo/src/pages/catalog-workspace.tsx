import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useRouteCacheActive,
  useRouteCacheEffect,
} from "tanstack-router-cache";
import { ActiveBadge } from "../components/active-badge";
import { StatusMetric } from "../components/status-metric";
import { HEALTH_MAX, PRODUCTS, type Product, SECOND_MS } from "../data";

export function CatalogWorkspace() {
  const isActive = useRouteCacheActive();
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<Product["segment"] | "All">("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [visibleSeconds, setVisibleSeconds] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesSegment = segment === "All" || product.segment === segment;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.owner.toLowerCase().includes(normalizedQuery);

    return matchesSegment && matchesQuery;
  });

  useRouteCacheEffect(() => {
    const timerId = globalThis.setInterval(() => {
      setVisibleSeconds((current) => current + 1);
    }, SECOND_MS);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  const toggleFavorite = (productId: string) => {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((favoriteId) => favoriteId !== productId)
        : [...current, productId]
    );
  };

  return (
    <section className="page-stack catalog-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Retained route</p>
          <h2>Catalog</h2>
          <p>
            Filters, marked rows, and window position stay in place after route
            changes.
          </p>
        </div>
        <ActiveBadge active={isActive} />
      </header>

      <section aria-label="Catalog filters" className="toolbar">
        <label>
          <span>Search</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try owner or product"
            value={query}
          />
        </label>
        <label>
          <span>Segment</span>
          <select
            onChange={(event) =>
              setSegment(event.target.value as Product["segment"] | "All")
            }
            value={segment}
          >
            <option>All</option>
            <option>Growth</option>
            <option>Retention</option>
            <option>Launch</option>
          </select>
        </label>
        <StatusMetric label="Visible time" value={`${visibleSeconds}s`} />
        <StatusMetric label="Marked" value={String(favorites.length)} />
      </section>

      <div className="product-grid">
        {filteredProducts.map((product) => (
          <article className="product-card" key={product.id}>
            <div>
              <p>{product.segment}</p>
              <h3>{product.name}</h3>
            </div>
            <dl>
              <div>
                <dt>Owner</dt>
                <dd>{product.owner}</dd>
              </div>
              <div>
                <dt>Pipeline</dt>
                <dd>{product.revenue}</dd>
              </div>
            </dl>
            <meter
              aria-label={`Health ${product.health}%`}
              className="health-meter"
              max={HEALTH_MAX}
              min={0}
              value={product.health}
            />
            <button
              className={
                favorites.includes(product.id)
                  ? "mark-button mark-button-active"
                  : "mark-button"
              }
              onClick={() => toggleFavorite(product.id)}
              type="button"
            >
              {favorites.includes(product.id) ? "Marked" : "Mark"}
            </button>
          </article>
        ))}
      </div>

      <div className="scroll-marker">
        <p className="eyebrow">Scroll checkpoint</p>
        <h3>Return here after visiting another route.</h3>
        <div className="button-row">
          <Link className="primary-button" to="/draft">
            Open draft
          </Link>
          <Link className="secondary-button" to="/regular">
            Open normal route
          </Link>
        </div>
      </div>
    </section>
  );
}
