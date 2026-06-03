import { Link } from "@tanstack/react-router";
import { useReducer } from "react";
import {
  useRouteCacheActive,
  useRouteCacheActivity,
  useRouteCacheEffect,
} from "tanstack-router-cache";
import { ActiveBadge } from "../components/active-badge";
import { StatusMetric } from "../components/status-metric";
import {
  ACTIVITY_LOG_LIMIT,
  createActivityEntry,
  createSessionStamp,
  CUSTOMER_NOTES,
  formatClock,
  SECOND_MS,
} from "../data";

type DraftState = ReturnType<typeof createInitialDraftState>;

type DraftAction =
  | { type: "activity"; label: string }
  | { type: "owner"; value: string }
  | { type: "priority"; value: string }
  | { type: "tick" }
  | { type: "title"; value: string }
  | { type: "notes"; value: string };

function createInitialDraftState() {
  return {
    activity: [createActivityEntry("Workspace opened")],
    notes: CUSTOMER_NOTES.join("\n"),
    owner: "Santiago",
    priority: "This week",
    stamp: createSessionStamp(),
    title: "Renewal plan",
    visibleSeconds: 0,
  };
}

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "activity":
      return {
        ...state,
        activity: [
          createActivityEntry(action.label),
          ...state.activity,
        ].slice(0, ACTIVITY_LOG_LIMIT),
      };
    case "notes":
      return { ...state, notes: action.value };
    case "owner":
      return { ...state, owner: action.value };
    case "priority":
      return { ...state, priority: action.value };
    case "tick":
      return { ...state, visibleSeconds: state.visibleSeconds + 1 };
    case "title":
      return { ...state, title: action.value };
    default:
      return state;
  }
}

export function DraftWorkspace() {
  const isActive = useRouteCacheActive();
  const [state, dispatch] = useReducer(
    draftReducer,
    undefined,
    createInitialDraftState
  );

  useRouteCacheEffect(() => {
    const timerId = globalThis.setInterval(() => {
      dispatch({ type: "tick" });
    }, SECOND_MS);

    return () => {
      globalThis.clearInterval(timerId);
    };
  }, []);

  useRouteCacheActivity((active) => {
    dispatch({
      label: `${formatClock()} ${active ? "restored" : "parked"}`,
      type: "activity",
    });
  });

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Retained route</p>
          <h2>Draft workspace</h2>
          <p>
            Leave this page with unfinished work, then come back to the same
            form state.
          </p>
        </div>
        <ActiveBadge active={isActive} />
      </header>

      <div className="split-layout">
        <section aria-label="Draft form" className="form-panel">
          <label>
            <span>Plan name</span>
            <input
              onChange={(event) =>
                dispatch({ type: "title", value: event.target.value })
              }
              value={state.title}
            />
          </label>

          <div className="field-grid">
            <label>
              <span>Owner</span>
              <input
                onChange={(event) =>
                  dispatch({ type: "owner", value: event.target.value })
                }
                value={state.owner}
              />
            </label>
            <label>
              <span>Priority</span>
              <select
                onChange={(event) =>
                  dispatch({ type: "priority", value: event.target.value })
                }
                value={state.priority}
              >
                <option>This week</option>
                <option>Next sprint</option>
                <option>Quarter plan</option>
              </select>
            </label>
          </div>

          <label>
            <span>Working notes</span>
            <textarea
              onChange={(event) =>
                dispatch({ type: "notes", value: event.target.value })
              }
              rows={12}
              value={state.notes}
            />
          </label>
        </section>

        <aside aria-label="Draft summary" className="summary-panel">
          <StatusMetric label="Workspace" value={state.stamp} />
          <StatusMetric
            label="Visible time"
            value={`${state.visibleSeconds}s`}
          />
          <StatusMetric label="Characters" value={String(state.notes.length)} />
          <div className="activity-list">
            {state.activity.map((item) => (
              <span key={item.id}>{item.label}</span>
            ))}
          </div>
          <div className="button-row">
            <Link className="primary-button" to="/power/catalog">
              Open catalog
            </Link>
            <Link className="secondary-button" to="/power/regular">
              Open normal route
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
