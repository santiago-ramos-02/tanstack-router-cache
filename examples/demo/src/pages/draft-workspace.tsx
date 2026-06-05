import { getRouteApi, Link } from "@tanstack/react-router";
import { useReducer } from "react";
import {
  useRouteCacheActivity,
  useRouteCacheEffect,
} from "tanstack-router-cache";
import { StatusMetric } from "../components/status-metric";
import {
  ACTIVITY_LOG_LIMIT,
  createActivityEntry,
  formatClock,
  SECOND_MS,
} from "../data";

const routeApi = getRouteApi("/power/draft");

type DraftState = ReturnType<typeof createInitialDraftState>;

type DraftAction =
  | { type: "activity"; label: string }
  | { type: "owner"; value: string }
  | { type: "priority"; value: string }
  | { type: "tick" }
  | { type: "title"; value: string }
  | { type: "notes"; value: string };

function createInitialDraftState(
  casePlan: ReturnType<(typeof routeApi)["useLoaderData"]>
) {
  return {
    activity: [createActivityEntry("Plan opened")],
    delayMs: casePlan.delayMs,
    deskId: casePlan.deskId,
    notes: casePlan.notes,
    owner: casePlan.owner,
    preparedAt: casePlan.preparedAt,
    priority: casePlan.priority,
    title: casePlan.title,
    visibleSeconds: 0,
  };
}

function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case "activity":
      return {
        ...state,
        activity: [createActivityEntry(action.label), ...state.activity].slice(
          0,
          ACTIVITY_LOG_LIMIT
        ),
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
  const casePlan = routeApi.useLoaderData();
  const [state, dispatch] = useReducer(
    draftReducer,
    casePlan,
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
      label: `${formatClock()} ${active ? "back on screen" : "waiting nearby"}`,
      type: "activity",
    });
  });

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Case plan</p>
          <h2>The working plan keeps its place.</h2>
          <p>
            Leave with an unfinished action list, then come back to the same
            notes, priority, timer, and activity trail.
          </p>
        </div>
        <span className="active-badge">Saved plan</span>
      </header>

      <div className="split-layout">
        <section aria-label="Case plan form" className="form-panel">
          <label>
            <span>Plan</span>
            <input
              onChange={(event) =>
                dispatch({ type: "title", value: event.target.value })
              }
              value={state.title}
            />
          </label>

          <div className="field-grid">
            <label>
              <span>Adjuster</span>
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
                <option>Today</option>
                <option>Tomorrow</option>
                <option>Next review</option>
              </select>
            </label>
          </div>

          <label>
            <span>Action list</span>
            <textarea
              onChange={(event) =>
                dispatch({ type: "notes", value: event.target.value })
              }
              rows={12}
              value={state.notes}
            />
          </label>
        </section>

        <aside aria-label="Case plan summary" className="summary-panel">
          <StatusMetric label="Prepared" value={state.preparedAt} />
          <StatusMetric label="First wait" value={`${state.delayMs}ms`} />
          <StatusMetric label="Desk id" value={state.deskId} />
          <StatusMetric
            label="On-screen time"
            value={`${state.visibleSeconds}s`}
          />
          <StatusMetric
            label="Note size"
            value={`${state.notes.length} chars`}
          />
          <div className="activity-list">
            {state.activity.map((item) => (
              <span key={item.id}>{item.label}</span>
            ))}
          </div>
          <div className="button-row">
            <Link className="primary-button" to="/power/catalog">
              Open repair network
            </Link>
            <Link className="secondary-button" to="/power/regular">
              Open fresh page
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
