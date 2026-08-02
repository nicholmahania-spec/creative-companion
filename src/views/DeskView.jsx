/**
 * Project desk — the per-project hub from the 2026 design handoff.
 *
 * Built on the owner's explicit instruction (it reverses an earlier
 * adhd-executive-function-advisor ruling; the advisor then ruled on HOW to
 * build it, and this file follows that second ruling):
 *
 * - It is the landing for opening a project, unconditionally. A conditional
 *   destination (desk sometimes, resume other times) is a working-memory tax
 *   on every open — the user has to predict where the app will put them. The
 *   resume target is not dropped: it is the first row of What's next, always
 *   in the same slot, so "the app remembered" is visible instead of inferred.
 * - The highlighted card is always the journey's first gap. One source, never
 *   empty — a card that can go blank reintroduces blank-page paralysis at the
 *   moment the screen exists to prevent it.
 * - Everything here is DERIVED from real project state. Nothing on this screen
 *   is a number the user must decode: no n/10, no hours, no percentages.
 *
 * Deliberately NOT the design's version: no 56px icon rail (the owner keeps
 * their labelled sidebar), no week-hours stat (the deferred time feature), no
 * counters. And the card's primary action opens the work rather than marking
 * it done — stop completion is derived from real content, so a manual
 * done-flag would let this screen claim work the journey bar shows as empty.
 */
import { labelForView } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import { relativeDeadlineLabel } from '../lib/dates'
import BrandArtboard from '../components/BrandArtboard'
import WorkStageStrip from '../components/WorkStageStrip'
import '../styles/lazy-desk.css'

/** Three-letter stop tag, from the stop's own label — never a hand-typed map. */
const stopTag = (label = '') => label.slice(0, 3).toUpperCase()

export default function DeskView({
  project,
  palette = [],
  pins = [],
  rows = [],
  nextGap,
  tasks = [],
  clientInbox,
  onOpenView,
  onOpenClientInbox,
  onToggleTask,
  onToggleNotNeeded,
  onEditIdentity,
}) {
  const notNeeded = Array.isArray(project?.stepsNotNeeded)
    ? project.stepsNotNeeded
    : []
  const skipped = (id) => notNeeded.includes(id)

  const gapRow = nextGap && !skipped(nextGap.id) ? nextGap : null
  const phase = gapRow ? getProcessPhase(gapRow.id) : null

  const upcoming = rows.filter(
    (r) => !r.done && !skipped(r.id) && r.id !== gapRow?.id
  )
  const openTasks = tasks.filter((t) => !t.completed)
  const doneStops = rows.filter((r) => r.done)
  const skippedStops = rows.filter((r) => !r.done && skipped(r.id))
  const doneTasks = tasks.filter((t) => t.completed)

  /* Last three finished things, newest first. Capped on purpose: an uncapped
     finished list grows until the one open thing is outnumbered by completed
     ones, which inverts the salience this screen is for. Never collapsed —
     hidden reads as "I have no idea what this is". */
  const finished = [
    ...doneTasks.map((t) => ({ key: `t-${t.id}`, label: t.title, tag: '' })),
    ...doneStops.map((r) => ({ key: `s-${r.id}`, label: r.label, tag: stopTag(r.label) })),
  ].slice(0, 3)

  const deadline = relativeDeadlineLabel(project?.deadline)
  const inboxRow = (clientInbox?.rows || []).find((r) => r.unread)

  return (
    <div className="desk-view view-enter">
      <div className="desk-head">
        <h1 className="page-title desk-title">{project?.name || 'Project'}</h1>
        <div className="desk-head-meta">
          {deadline && project?.deadline && (
            /* Relative word first, date kept: a bare date needs arithmetic
               against today before it feels like anything. */
            <span className="desk-due">{deadline}</span>
          )}
          <button
            type="button"
            className="desk-client-chip"
            onClick={onOpenClientInbox}
          >
            {inboxRow ? `Client · ${inboxRow.title}` : 'Client'}
          </button>
        </div>
      </div>

      {/* Directly under the project name — the fixed spot that is on screen
          the moment the project opens. Not the bottom, not behind a toggle:
          both are invisible to this user. Read-only and never clickable; the
          clock itself stays where it already lives. */}
      <WorkStageStrip workLog={project?.workLog} />

      <div className="desk-grid">
        <section className="desk-panel desk-artboard" aria-label="Live artboard">
          <div className="desk-panel-head">
            <span className="desk-eyebrow">
              {labelForView('brand')} · live artboard
            </span>
          </div>
          <BrandArtboard
            id="desk-artboard"
            project={project}
            palette={palette}
            pins={pins}
            compact
          />
          <div className="desk-artboard-foot">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onEditIdentity}
            >
              Edit identity
            </button>
          </div>
        </section>

        <section className="desk-panel desk-next" aria-label="What's next">
          <div className="desk-panel-head">
            <span className="desk-eyebrow">What&rsquo;s next</span>
          </div>

          {/* Where you left off — the resume the landing no longer performs
              silently. Same slot every time, so it is a landmark. */}
          {project?.lastView && (
            <button
              type="button"
              className="desk-resume"
              onClick={() => onOpenView(project.lastView)}
            >
              Back to {labelForView(project.lastView)}
              <span className="desk-resume-sub">where you left off</span>
            </button>
          )}

          {gapRow && (
            <div className="desk-card">
              <span className="desk-card-tag">{gapRow.label}</span>
              <p className="desk-card-title">
                {phase?.plain || `Pick this up in ${gapRow.label}.`}
              </p>
              <div className="desk-card-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onOpenView(gapRow.view)}
                >
                  Open {gapRow.label}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onToggleNotNeeded(gapRow.id)}
                >
                  Not needed
                </button>
              </div>
            </div>
          )}

          <ul className="desk-list">
            {upcoming.map((r) => (
              <li key={r.id} className="desk-row">
                <button
                  type="button"
                  className="desk-row-open"
                  onClick={() => onOpenView(r.view)}
                >
                  {r.label}
                </button>
                <span className="desk-row-tag">{stopTag(r.label)}</span>
              </li>
            ))}
            {openTasks.map((t) => (
              <li key={t.id} className="desk-row">
                <button
                  type="button"
                  className="desk-row-check"
                  aria-label={`Mark done: ${t.title}`}
                  onClick={() => onToggleTask(t.id)}
                />
                <span className="desk-row-task">{t.title}</span>
              </li>
            ))}
          </ul>

          {(finished.length > 0 || skippedStops.length > 0) && (
            <div className="desk-done">
              <span className="desk-eyebrow">Finished</span>
              <ul className="desk-list">
                {finished.map((f) => (
                  <li key={f.key} className="desk-row is-done">
                    <span className="desk-row-task">{f.label}</span>
                    {f.tag && <span className="desk-row-tag">{f.tag}</span>}
                  </li>
                ))}
                {/* Greyed, not struck: declining a step is not a failed step,
                    and one click puts it back. */}
                {skippedStops.map((r) => (
                  <li key={r.id} className="desk-row is-skipped">
                    <button
                      type="button"
                      className="desk-row-open"
                      onClick={() => onToggleNotNeeded(r.id)}
                    >
                      {r.label}
                    </button>
                    <span className="desk-row-tag">Not needed</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
