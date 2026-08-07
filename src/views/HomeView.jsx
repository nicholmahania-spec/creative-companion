/**
 * Home / Studio dashboard — return wall for multi-project pickup.
 * Extracted from App.jsx so the shell is not also the Home page.
 */
import { JOURNEY_STEPS, labelForStepId } from "../lib/journey/journey";
import {
  hoursForRange,
  workLogsFromProjects,
  formatHoursWorked,
  hoursLoggedWords,
  HOURS_RANGES,
} from "../lib/billing/workWeek";
import { relativeDeadlineLabel, formatShortDate } from "../lib/dates";
import { isStarterProject } from "../store/useAppStore";

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
  switchProjectAndContinue,
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
  const clientOf = (s) => (s.project?.detective?.clientName || "").trim();
  const needsYouList = orderedFlat.filter((s) => s.hasUnreadClient);
  const readyList = orderedFlat.filter((s) => s.packReady);
  const studioHours = hoursForRange(
    workLogsFromProjects(activeProjects),
    homeHoursRange,
  );

  if (n === 0) {
    return (
      <section className="home-dash" aria-label="Home dashboard">
        <header className="home-dash-head">
          <h1 className="home-dash-title">Home</h1>
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
  const pathFull = !!focus.pathFull;
  const packReady = !!focus.packReady;
  const nextLabel = packReady
    ? "Brand book ready"
    : pathFull
      ? "Path full — shortlist still thin"
      : focus.nextGap
        ? focus.nextGap.label
        : "All caught up";
  return (
    <section className="home-dash" aria-label="Home dashboard">
      <header className="home-dash-head">
        <div>
          <h1 className="home-dash-title">Studio</h1>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setActiveView("create")}
        >
          + New project
        </button>
      </header>

      {/* Pick-up — one primary action */}
      <div className="home-dash-pickup">
        <div className="home-dash-pickup-copy">
          <p className="home-dash-pickup-project">
            {clientOf(focus)
              ? `${clientOf(focus)} · ${focus.project.name}`
              : focus.project.name}
            {focus.hasUnreadClient ? (
              <span className="home-dash-pill">Client waiting</span>
            ) : null}
          </p>
          <p className="home-dash-pickup-kicker">
            {focus.hasUnreadClient ? "Needs you" : packReady ? "Ready" : "Next"}
          </p>
          <h2 className="home-dash-pickup-title">
            {focus.hasUnreadClient ? "Client inbox" : nextLabel}
          </h2>
        </div>
        <div className="home-dash-pickup-actions">
          <button
            type="button"
            className="btn btn-primary home-dash-primary"
            onClick={() => {
              if (focus.hasUnreadClient) {
                setCurrentProject(focus.project.id);
                setClientInboxOpen(true);
                return;
              }
              if (pathFull) {
                setCurrentProject(focus.project.id);
                setActiveView("finish");
                return;
              }
              switchProjectAndContinue(focus.project.id);
            }}
          >
            {focus.hasUnreadClient
              ? "Open client inbox"
              : pathFull
                ? `Open ${labelForStepId("deliver")}`
                : `Continue · ${focus.nextGap?.label || "work"}`}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => openProjectWhereLeftOff(focus.project.id)}
          >
            Desk
          </button>
        </div>
      </div>

      <div className="home-dash-grid">
        {/* Projects */}
        <section
          className="home-dash-panel home-dash-projects"
          aria-label="Projects"
        >
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Projects</h2>
            <span className="home-dash-panel-meta">
              {n === 1 ? "1 open" : `${n} open`}
            </span>
          </div>
          <ul className="home-dash-project-list">
            {orderedFlat.map((summary) => {
              const p = summary.project;
              const isFocus = p.id === focus.project.id;
              const unread = !!summary.hasUnreadClient;
              const client = clientOf(summary);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`home-dash-project-card${
                      isFocus ? " is-focus" : ""
                    }${unread ? " has-unread" : ""}`}
                    onClick={() => {
                      setHomeSelectedProjectId(p.id);
                      if (n === 1) {
                        openProjectWhereLeftOff(p.id);
                      }
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
                    {client ? (
                      <span className="home-dash-project-client">{client}</span>
                    ) : null}
                    <span
                      className={`home-dash-project-next${
                        summary.pathFull ? " is-done" : ""
                      }`}
                    >
                      {listRowNext(summary)}
                    </span>
                    <span className="home-dash-mini-path" aria-hidden="true">
                      {summary.rows.map((r) => (
                        <i
                          key={r.id}
                          className={
                            r.done
                              ? "is-done"
                              : summary.nextGap?.id === r.id
                                ? "is-current"
                                : ""
                          }
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
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
            <span className="home-dash-panel-meta">
              {(upcomingDeadlines || []).length
                ? `${Math.min(5, upcomingDeadlines.length)} coming`
                : "None"}
            </span>
          </div>
          {(upcomingDeadlines || []).length === 0 ? (
            <p className="home-dash-panel-empty">
              No project or task dues yet. Set one on Deadlines when a date
              matters.
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
            className="btn btn-ghost btn-sm home-dash-panel-cta"
            onClick={() => setActiveView("calendar")}
          >
            Full deadlines
          </button>
        </section>

        {/* Client needs you */}
        <section className="home-dash-panel" aria-label="Client activity">
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Client</h2>
            <span className="home-dash-panel-meta">
              {needsYouList.length ? "Waiting on you" : "Quiet"}
            </span>
          </div>
          {needsYouList.length === 0 ? (
            <p className="home-dash-panel-empty">
              No unread client activity across open projects.
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
                    <span className="home-dash-client-name">
                      {s.project.name}
                    </span>
                    <span className="home-dash-client-action">Open inbox</span>
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
            Client inbox
          </button>
        </section>

        {/* Ready to ship */}
        <section className="home-dash-panel" aria-label="Ready to ship">
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Ready to ship</h2>
            <span className="home-dash-panel-meta">
              {readyList.length
                ? `${readyList.length} pack${readyList.length === 1 ? "" : "s"}`
                : "None yet"}
            </span>
          </div>
          {readyList.length === 0 ? (
            <p className="home-dash-panel-empty">
              When a pack is ready for handoff, it shows up here.
            </p>
          ) : (
            <ul className="home-dash-client-list">
              {readyList.map((s) => (
                <li key={s.project.id}>
                  <button
                    type="button"
                    className="home-dash-client-row"
                    onClick={() => {
                      setCurrentProject(s.project.id);
                      setActiveView("finish");
                    }}
                  >
                    <span className="home-dash-client-name">
                      {s.project.name}
                    </span>
                    <span className="home-dash-client-action">
                      Open {labelForStepId("deliver")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Hours worked — private workLog only */}
        <section
          className="home-dash-panel home-dash-hours"
          aria-label="Hours worked"
        >
          <div className="home-dash-panel-head">
            <h2 className="home-dash-panel-title">Hours worked</h2>
            <span className="home-dash-panel-meta">
              {studioHours.rangeLabel}
            </span>
          </div>
          <div
            className="home-dash-hours-ranges"
            role="tablist"
            aria-label="Hours range"
          >
            {HOURS_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={homeHoursRange === r.id}
                className={`home-dash-hours-range${
                  homeHoursRange === r.id ? " is-active" : ""
                }`}
                onClick={() => setHomeHoursRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {studioHours.total <= 0 ? (
            <p className="home-dash-panel-empty">
              No clocked hours in this range. Time on the work clock shows up
              here (private — not the invoice).
            </p>
          ) : (
            <>
              <p className="home-dash-hours-total">
                {hoursLoggedWords(studioHours.total)}
                <span className="home-dash-hours-range-note">
                  {" "}
                  · {studioHours.rangeLabel}
                </span>
              </p>
              <div
                className={`home-dash-hours-bars${
                  homeHoursRange === "month" ? " is-dense" : ""
                }`}
                role="img"
                aria-label={`${hoursLoggedWords(studioHours.total)} · ${studioHours.rangeLabel}`}
              >
                {studioHours.buckets.map((b) => (
                  <div key={b.key} className="home-dash-hours-col">
                    <div
                      className={`home-dash-hours-bar${
                        b.fill ? " is-filled" : ""
                      }`}
                      style={{ height: `${b.hPx}px` }}
                      title={
                        b.fill
                          ? `${b.label}: ${formatHoursWorked(b.hours)}h`
                          : undefined
                      }
                    />
                    <span className="home-dash-hours-label">{b.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
