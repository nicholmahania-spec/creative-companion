/**
 * Home / Studio dashboard — return wall for multi-project pickup.
 * Extracted from App.jsx so the shell is not also the Home page.
 */
import { JOURNEY_STEPS } from "../lib/journey/journey";
import {
  hoursForRange,
  workLogsFromProjects,
  HOURS_RANGES,
} from "../lib/billing/workWeek";
import { relativeDeadlineLabel, formatShortDate } from "../lib/dates";
import { isStarterProject } from "../store/useAppStore";

function exactHours(total) {
  const minutes = Math.max(0, Math.round((Number(total) || 0) * 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function HomeView({
  activeProjects,
  homeOrderedSummaries,
  homeSelectedProjectId,
  setHomeSelectedProjectId,
  homeHoursRange,
  setHomeHoursRange,
  setActiveView,
  setCurrentProject,
  openProjectWhereLeftOff,
  setClientInboxOpen,
  listRowNext,
  upcomingDeadlines = [],
}) {
  const n = activeProjects.length;
  const orderedFlat = homeOrderedSummaries;
  const focus =
    n === 0
      ? null
      : orderedFlat.find((s) => s.project.id === homeSelectedProjectId) ||
        orderedFlat[0];
  const needsYouList = orderedFlat.filter((s) => s.hasUnreadClient);
  const visibleProjects = orderedFlat.slice(0, 4);
  const studioHours = hoursForRange(
    workLogsFromProjects(activeProjects),
    homeHoursRange,
  );

  if (n === 0) {
    return (
      <section className="home-dash" aria-label="Home dashboard">
        <header className="home-dash-head">
          <h1 className="home-dash-title">Dashboard</h1>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView("create")}
          >
            + New project
          </button>
        </header>
        <ol className="home-dash-path-promise" aria-label="The path">
          {JOURNEY_STEPS.map((s) => (
            <li key={s.id}>
              <strong>{s.label}</strong>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  if (!focus) return null;
  return (
    <section className="home-dash" aria-label="Home dashboard">
      <header className="home-dash-head">
        <div>
          <h1 className="home-dash-title">Dashboard</h1>
        </div>
      </header>

      {/* Client communication comes first: unread feedback is time-sensitive,
          while an empty inbox stays quiet. */}
      <section
        className="home-dash-panel home-dash-client-priority"
        aria-label="Notifications"
      >
        <div className="home-dash-panel-head">
          <h2 className="home-dash-panel-title">Notifications</h2>
        </div>
        {needsYouList.length === 0 ? (
          <p className="home-dash-panel-empty">
            No activity.
          </p>
        ) : (
          <ul className="home-dash-client-list">
            {needsYouList.map((s) => (
              <li key={s.project.id}>
                <button
                  type="button"
                  className="home-dash-client-row"
                  onClick={() => {
                    setHomeSelectedProjectId(s.project.id);
                    setCurrentProject(s.project.id);
                    setClientInboxOpen(true);
                  }}
                >
                  <span className="home-dash-client-name">{s.project.name}</span>
                  <span className="home-dash-client-action">Open client inbox</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-sm home-dash-panel-cta"
          onClick={() => setClientInboxOpen(true)}
        >
          View notifications
        </button>
      </section>

      <div className="home-dash-grid">
        {/* Projects */}
        <section
          className="home-dash-panel home-dash-projects"
          aria-label="Projects"
        >
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Projects</h2>
          </div>
          <ul className="home-dash-project-list">
            {visibleProjects.map((summary) => {
              const p = summary.project;
              const isFocus = p.id === focus.project.id;
              const unread = !!summary.hasUnreadClient;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`home-dash-project-card${
                      isFocus ? " is-focus" : ""
                    }${unread ? " has-unread" : ""}`}
                    onClick={() => {
                      setHomeSelectedProjectId(p.id);
                      openProjectWhereLeftOff(p.id);
                    }}
                  >
                    {/* Specimen edge — the project's own palette, on the card
                        that represents it. With more than one project open,
                        the dashboard is otherwise five identical grey cards
                        distinguished only by reading the name; this makes each
                        one recognisable by its brand before it is read, which
                        is the whole premise of "your brand lives here".
                        Costs 4px of height and no new reading. */}
                    {Array.isArray(p.palette) && p.palette.length > 0 ? (
                      <span
                        className="home-dash-project-spectrum"
                        aria-hidden="true"
                      >
                        {p.palette.slice(0, 5).map((hex, i) => (
                          <i key={`${p.id}-sw-${i}`} style={{ background: hex }} />
                        ))}
                      </span>
                    ) : null}
                    <span className="home-dash-project-card-top">
                      <span className="home-dash-project-name">{p.name}</span>
                      {/* Says whose project this is. A blank workspace opens
                          on one the app made, named and styled exactly like
                          one you made — so a newcomer cannot tell whether it
                          is theirs, a sample, or somebody else's, and the real
                          "+ New project" competes with something that looks
                          already underway. The tag disappears the moment the
                          project is renamed or written in, so it costs a
                          returning user nothing. */}
                      {isStarterProject(p) ? (
                        <span className="home-dash-project-starter">
                          Starter — rename it or start your own
                        </span>
                      ) : null}
                      {unread ? (
                        <span
                          className="home-md-row-badge"
                          aria-label="Client activity waiting"
                        />
                      ) : null}
                    </span>
                    <span
                      className={`home-dash-project-next${
                        summary.pathFull ? " is-done" : ""
                      }`}
                    >
                      {listRowNext(summary)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="home-dash-project-actions">
            {orderedFlat.length > visibleProjects.length && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveView("clients")}
              >
                View all projects
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm home-dash-new-project"
              onClick={() => setActiveView("create")}
            >
              + New project
            </button>
          </div>
        </section>

        {/* The "Up next" panel used to sit here and it said nothing new. It
            read the same focus.project.name, the same focus.nextGap.label and
            navigated to the same focus.nextGap.view as the pick-up card above
            — so Home stated "Strategy is next" three times over: once in the
            hero, once in the Projects row's "Next: …", and once here. Its
            "Open desk" duplicated the hero's "Desk" button too, so nothing was
            lost by removing it.

            A previous pass already deleted a dual *map* of the path from this
            screen (see the Projects panel comment); this was the dual
            *statement* of the same fact, which costs the same reading and
            offers the same nothing. G3 bans both. */}

        {/* Due soon — deadlines only, not a full month (ADHD: no second map). */}
        <section
          className="home-dash-panel home-dash-due"
          aria-label="Due soon"
        >
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Due soon</h2>
          </div>
          {(upcomingDeadlines || []).length === 0 ? (
            <p className="home-dash-panel-empty">
              Nothing due in the next 30 days.
            </p>
          ) : (
            <ul className="home-dash-due-list">
              {(upcomingDeadlines || []).slice(0, 5).map((row) => (
                <li key={`${row.kind}-${row.id}`}>
                  <button
                    type="button"
                    className={`home-dash-due-row urgency-${row.urgency || "later"}`}
                    onClick={() => {
                      if (row.kind === "project") {
                        setCurrentProject(row.id);
                        setActiveView("project");
                      } else if (row.projectId != null) {
                        setCurrentProject(row.projectId);
                        setActiveView("desk");
                      } else {
                        setActiveView("calendar");
                      }
                    }}
                  >
                    <span className="home-dash-due-name">
                      {row.kind === "project" ? "Project" : "Task"}
                      {": "}
                      {row.name}
                    </span>
                    <span className="home-dash-due-when">
                      {relativeDeadlineLabel(row.date) ||
                        formatShortDate(row.date)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm home-dash-panel-cta"
            onClick={() => setActiveView("calendar")}
          >
            Full calendar <span aria-hidden="true">&gt;</span>
          </button>
        </section>

        {/* Hours worked — private workLog only */}
        <section
          className="home-dash-panel home-dash-hours"
          aria-label="Hours worked"
        >
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Hours worked</h2>
            <label className="home-dash-hours-menu">
              <span className="sr-only">Hours range</span>
              <select
                value={homeHoursRange}
                onChange={(event) => setHomeHoursRange(event.target.value)}
              >
                {HOURS_RANGES.map((range) => (
                  <option key={range.id} value={range.id}>
                    {range.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {studioHours.total <= 0 ? (
            <p className="home-dash-hours-total" aria-live="polite">
              <strong>0h</strong>
              <span className="home-dash-hours-range-note">
                {" "}· {studioHours.rangeLabel}
              </span>
            </p>
          ) : (
            <>
              <p className="home-dash-hours-total" aria-live="polite">
                <strong>{exactHours(studioHours.total)}</strong>
                <span className="home-dash-hours-range-note">
                  {" "}
                  · {studioHours.rangeLabel}
                </span>
              </p>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
