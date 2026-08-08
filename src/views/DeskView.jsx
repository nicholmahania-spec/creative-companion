/**
 * Project desk — Studio mockup layout (option B: literal columns).
 *
 * Grid matches Studio.dc.html:
 *   main (1fr): artboard → starred pack → brief
 *   right (340px): Client strip (top) → What's next → Done → This week
 *
 * Client strip sits above What's next (adhd-executive-function-advisor,
 * 2026-08-03): object permanence — under Done = invisible. Empty = short
 * status + CTA only, no essay. Due date lives on What's next, not Client.
 *
 * Artboard ambient (advisor): pack handoff status (real thin/core/ready) +
 * quiet Open Assets; Edit identity is the sole primary. No PDF on the desk.
 *
 * What's next (path-rebuild audit): path gap is the primary job; lastView
 * resume only when it opens a *different* place — secondary, never a second
 * equal Continue.
 *
 * The gap card carries ONE button, `Open {stop}`. Already done / Skip this one
 * are quiet links beside it, not buttons: they are administrative, and putting
 * them at equal weight made the reader classify the stage before they were
 * allowed to start it. They cannot move off this card — it is the only route
 * in the app to either action — so weight does the work deletion would have.
 * `deskCardWeight.test.js` holds both halves.
 */
import { labelForView, labelForStepId } from '../lib/journey/journey'

import { namedDeadlineLabel } from '../lib/dates'
import { pinFaceStyle, pinVisualKind } from '../lib/moodPins'
import {
  buildBrandPackSnapshot,
  packReadiness,
} from '../lib/book/exportFiles'
import { weekFromWorkLog, hoursLoggedWords } from '../lib/billing/workWeek'
import { DELIVERABLE_OPTIONS } from '../lib/brief/detectiveBrief'
import DeskLiveArtboard from '../components/DeskLiveArtboard'
import YoursOnlyPanel from '../components/YoursOnlyPanel'
import '../styles/lazy-desk.css'

/**
 * Leave-behind ambient status for the artboard stamp slot.
 * Real signals only: packReadiness.thin + path-all-done (same formula as
 * App brandBookReady = pathStepsFull && !leaveBehindThin).
 */
/* Plain words, because this is ambient — nobody clicks it to find out what it
   meant. "Pack still thin for handoff" put three pieces of studio jargon in
   five words ("pack", "thin", "handoff"), and a first-time reader cannot tell
   whether it is a warning, a status, or a thing they broke.

   The state names change; the discipline does not. No second person, no
   percentage, no version number, no "incomplete" — the same shame-free
   constraints the test below pins, which is why it still checks them. */
export function packHandoffStatus({ thin, pathFull }) {
  if (thin) return 'Not enough here to send yet'
  if (pathFull) return 'Ready to send to the client'
  return 'Has the basics, not ready to send'
}

/* `stopTag` used to render label.slice(0,3).toUpperCase() beside each stop in
   "What's next" — RES, IDE, TOU and, for Assets, ASS. It carried no
   information the full label on the same line did not already carry, it read
   as a code with a meaning to learn, and on mobile the narrower row made it
   more prominent rather than less.
   Showing the keyboard shortcut here instead was considered and rejected: the
   number keys address `stepsForProject(activeProject)`, which is renumbered
   per project, while these rows come from the full JOURNEY_STEPS — so on a
   reduced-scope project the hint would advertise a key that does nothing.
   `.desk-row-tag` survives for the skipped-stop "Not needed" label, which is
   a real word rather than an abbreviation of one. */

/**
 * Desk dual-resume: one initiation path for "What's next".
 * - Path gap (first incomplete stop) is the primary pickup.
 * - lastView resume only when it would open somewhere else (secondary).
 * - Same destination → one control only (no "Back to X" + "Open X").
 *
 * @param {{ lastView?: string|null, gapView?: string|null }} args
 * @returns {{ showResume: boolean, resumePrimary: boolean }}
 */
export function deskPickup({ lastView = null, gapView = null } = {}) {
  const resume =
    lastView && lastView !== 'desk' && String(lastView).trim()
      ? String(lastView)
      : null
  if (!resume) return { showResume: false, resumePrimary: false }
  if (gapView && resume === gapView) {
    return { showResume: false, resumePrimary: false }
  }
  /* No path gap left → resume is the only pickup (path full / all skipped). */
  if (!gapView) return { showResume: true, resumePrimary: true }
  return { showResume: true, resumePrimary: false }
}

/**
 * One sentence naming what you were in the middle of.
 *
 * The desk already had a "Back to Identity" control with the subtitle "where
 * you left off". That names a DESTINATION, and a destination reloads the room
 * without reloading the thought. Coming back days later, working memory has
 * nothing to reconstruct from, so the first minutes are spent re-reading your
 * own work to find the thread — and that re-read is where a session dies
 * before it starts.
 *
 * So this states the situation instead: the stage you were on, and whether the
 * client owes you anything. Text, never a button — a second clickable pickup
 * would fork the one initiation path `deskPickup` exists to keep single.
 *
 * TONE IS PART OF THE CONTRACT. It never counts elapsed time and never says
 * how long something has been waiting. "It's been 12 days" is information the
 * user cannot act on and will read as an accusation; the audience most likely
 * to have left it 12 days is the audience most likely to close the tab rather
 * than face the sentence. Name the state, not the gap.
 *
 * @param {{ stopLabel?: string, unreadClient?: boolean, waitingOnClient?: boolean }} a
 * @returns {string} '' when there is nothing worth saying
 */
export function lastTouchSentence({
  stopLabel = '',
  unreadClient = false,
  waitingOnClient = false,
} = {}) {
  const stop = String(stopLabel || '').trim()
  // A fresh project has no history to recall; silence beats a sentence that
  // says nothing, which would just be one more thing on the screen.
  if (!stop && !unreadClient && !waitingOnClient) return ''

  const where = stop ? `Last time you were in ${stop}.` : ''
  const client = unreadClient
    ? 'The client has sent something since.'
    : waitingOnClient
      ? 'Nothing from the client since.'
      : ''
  return [where, client].filter(Boolean).join(' ')
}

/** Relative age for mock timestamps — 2h / Yesterday / 2 days / 1 week. */
export function relativeAgeLabel(iso, now = new Date()) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const ms = now.getTime() - t
  if (ms < 0) return ''
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(ms / 86400000)
  if (hours < 1) return 'now'
  if (hours < 24) return `${hours}h`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days`
  if (days < 14) return '1 week'
  return `${Math.floor(days / 7)} weeks`
}

function pinBorder(pin) {
  if (pin?.packHero) return '2px solid var(--text-primary)'
  if (pin?.inPack) return '1px solid var(--border-subtle)'
  return '1px dashed var(--border-strong)'
}

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
  onMarkStepDone,
  onEditIdentity,
  onOpenWall,
  onOpenAssets,
}) {
  const notNeeded = Array.isArray(project?.stepsNotNeeded)
    ? project.stepsNotNeeded
    : []
  const skipped = (id) => notNeeded.includes(id)

  const gapRow = nextGap && !skipped(nextGap.id) ? nextGap : null

  const openTasks = tasks.filter((t) => !t.completed)
  const doneTasks = tasks.filter((t) => t.completed)
  const taskTotal = openTasks.length + doneTasks.length
  const taskDone = doneTasks.length
  const progressLabel =
    taskTotal > 0 ? `${taskDone}/${taskTotal}` : null

  const doneStops = rows.filter((r) => r.done)
  const skippedStops = rows.filter((r) => !r.done && skipped(r.id))

  const finished = [
    ...doneTasks.map((t) => ({
      key: `t-${t.id}`,
      label: t.title,
      tag: '',
      taskId: t.id,
      isTask: true,
    })),
    ...doneStops.map((r) => ({
      key: `s-${r.id}`,
      label: r.label,
      tag: '',
      isTask: false,
    })),
  ].slice(0, 8)

  /* First brief deliverable label — names the due (working memory). */
  const primaryDeliverableId = Array.isArray(project?.detective?.deliverablesPicked)
    ? project.detective.deliverablesPicked.find((id) => String(id || '').trim())
    : null
  const primaryDeliverableLabel =
    DELIVERABLE_OPTIONS.find((o) => o.id === primaryDeliverableId)?.label ||
    String(project?.detective?.deliverables || '').trim().split(/[,\n]/)[0] ||
    ''
  const deadline = namedDeadlineLabel(
    project?.deadline,
    primaryDeliverableLabel
  )

  /* Pack ambient (advisor A): replace number stamp with leave-behind state. */
  const packSnap = buildBrandPackSnapshot({
    project,
    tasks,
    moodItems: pins,
    palette,
  })
  const packReady = packReadiness(packSnap)
  const pathFull = rows.length > 0 && rows.every((r) => r.done)
  const packStatus = packHandoffStatus({
    thin: !!packReady.thin,
    pathFull,
  })
  const packHandoffReady = packStatus === 'Pack ready for handoff'

  const packPins = (pins || [])
    .filter((p) => p.inPack)
    .sort((a, b) => {
      if (a.packHero && !b.packHero) return -1
      if (!a.packHero && b.packHero) return 1
      return (a.packOrder ?? 999) - (b.packOrder ?? 999)
    })
    .slice(0, 6)

  const projectId = project?.id != null ? String(project.id) : ''
  const activity = (clientInbox?.rows || [])
    .filter((r) => String(r.projectLocalId ?? '') === projectId)
    .slice(0, 3)
  const unreadClient = activity.some((a) => a.unread)

  const week = weekFromWorkLog(project?.workLog || [])

  const pickup = deskPickup({
    lastView: project?.lastView,
    gapView: gapRow?.view || null,
  })
  const resumeLabel = pickup.showResume
    ? labelForView(project.lastView)
    : ''

  /* Built only from what is already stored — no new field, no new write.
     `lastView` is set on navigation; the client rows are already loaded for
     the activity list below. */
  const lastTouch = lastTouchSentence({
    stopLabel: project?.lastView ? labelForView(project.lastView) : '',
    unreadClient,
    /* "Nothing since" is only true if there IS a client thread and nothing
       new arrived in it. With no thread at all the honest answer is silence,
       not a claim about a conversation that never started. */
    waitingOnClient: activity.length > 0 && !unreadClient,
  })

  return (
    <div className="desk-view view-enter">
      <section
        className={`desk-panel desk-client-strip desk-client-priority${unreadClient ? ' has-unread' : ''}`}
        aria-label="Client communication"
      >
        <div className="desk-panel-head">
          <span className="desk-eyebrow">Client communication</span>
          <span className="desk-client-status">
            {activity.length === 0
              ? 'No client activity yet'
              : unreadClient
                ? 'Needs a look'
                : 'Up to date'}
          </span>
        </div>
        {activity.length > 0 && (
          <ul className="desk-activity">
            {activity.map((a) => {
              const when = a.at ? relativeAgeLabel(a.at) : ''
              return (
                <li
                  key={a.id}
                  className={`desk-activity-row${a.unread ? ' is-unread' : ''}`}
                >
                  <span className="desk-activity-dot" aria-hidden="true" />
                  <span className="desk-activity-text">{a.title}</span>
                  {a.kind === 'approval' && (
                    <span className="desk-activity-pill">Approved</span>
                  )}
                  {when ? <span className="desk-activity-when">{when}</span> : null}
                </li>
              )
            })}
          </ul>
        )}
        <button
          type="button"
          className="btn btn-secondary desk-client-cta"
          onClick={onOpenClientInbox}
        >
          Open client inbox
        </button>
      </section>
      <div className="desk-grid">
        {/* ── MAIN COLUMN ── */}
        <div className="desk-main">
          <section
            className="desk-panel desk-artboard"
            aria-label="Live artboard"
          >
            <div className="desk-panel-head">
              <span className="desk-eyebrow">
                {labelForStepId('design')} · live artboard
              </span>
              <span
                className={`desk-stamp desk-pack-status is-${
                  packReady.thin ? 'thin' : pathFull ? 'ready' : 'core'
                }`}
                role="status"
              >
                {packStatus}
              </span>
            </div>
            <DeskLiveArtboard
              id="desk-artboard"
              project={project}
              palette={palette}
            />
            <div className="desk-artboard-foot">
              {/* One desk primary = path gap (audit P0). Identity is secondary. */}
              {gapRow ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onOpenView(gapRow.view)}
                >
                  {`Open ${gapRow.label}`}
                </button>
              ) : packHandoffReady && typeof onOpenAssets === 'function' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onOpenAssets}
                >
                  {`Open ${labelForStepId('deliver')} — pack ready`}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onEditIdentity}
                >
                  Edit identity
                </button>
              )}
              {gapRow ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onEditIdentity}
                >
                  Edit identity
                </button>
              ) : null}
              {typeof onOpenAssets === 'function' &&
                !(packHandoffReady && !gapRow) && (
                  <button
                    type="button"
                    className="desk-panel-link desk-panel-link-quiet"
                    onClick={onOpenAssets}
                  >
                    Open {labelForStepId('deliver')}
                  </button>
                )}
              {gapRow && (
                <details className="desk-path-options">
                  <summary>Path options</summary>
                  <div className="desk-path-options-menu">
                    {typeof onMarkStepDone === 'function' && (
                      <button
                        type="button"
                        onClick={() => onMarkStepDone(gapRow.id, true)}
                      >
                        Mark as already done
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleNotNeeded(gapRow.id)}
                    >
                      Mark as not needed
                    </button>
                  </div>
                </details>
              )}
            </div>
          </section>

          <section
            className="desk-panel desk-pack"
            aria-label="Research shortlist"
          >
            <div className="desk-panel-head">
              <span className="desk-eyebrow">
                {labelForStepId('research')} · selected for the client shortlist
              </span>
              <button
                type="button"
                className="desk-panel-link"
                onClick={onOpenWall}
              >
                Open the wall
              </button>
            </div>
            {packPins.length === 0 ? (
              <p className="desk-empty">
                Nothing shortlisted yet. Add references from Research.
              </p>
            ) : (
              <div className="desk-pack-grid">
                {packPins.map((pin) => {
                  const kind = pinVisualKind(pin)
                  const face = pinFaceStyle(pin)
                  return (
                    <div
                      key={pin.id}
                      className="desk-pack-pin"
                      style={{ ...face, border: pinBorder(pin) }}
                      title={pin.note || pin.link || ''}
                    >
                      {kind === 'color' && (
                        <span className="desk-pack-hex">
                          {String(pin.hex || pin.visual || '').slice(0, 7)}
                        </span>
                      )}
                      {(pin.type === 'quote' ||
                        pin.type === 'note' ||
                        pin.type === 'spark' ||
                        kind === 'empty') &&
                        pin.note && (
                          <p className="desk-pack-note">{pin.note}</p>
                        )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <aside className="desk-rail" aria-label="Client and what's next">
          <section className="desk-panel desk-next" aria-label="What's next">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">What&rsquo;s next</span>
              <div className="desk-next-meta">
                {deadline && project?.deadline && (
                  <span className="desk-due">{deadline}</span>
                )}
                {progressLabel && (
                  <span className="desk-progress">{progressLabel}</span>
                )}
              </div>
            </div>

            {lastTouch && <p className="desk-last-touch">{lastTouch}</p>}

            {pickup.showResume && resumeLabel ? (
              <button
                type="button"
                className={
                  pickup.resumePrimary
                    ? 'desk-resume'
                    : 'desk-resume desk-resume-secondary'
                }
                onClick={() => onOpenView(project.lastView)}
              >
                {pickup.resumePrimary
                  ? `Back to ${resumeLabel}`
                  : `Or back to ${resumeLabel}`}
                {/* The "where you left off" subtitle used to sit here. The
                    sentence above the card now says that, and better — it
                    names what you were doing rather than only where. Two
                    surfaces telling the reader the same thing is a cost with
                    no matching benefit. */}
              </button>
            ) : null}

            <ul className="desk-list">
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
                <div className="desk-panel-head">
                  <span className="desk-eyebrow desk-eyebrow-strong">Done</span>
                  {progressLabel && (
                    <span className="desk-progress desk-progress-strong">
                      {progressLabel}
                    </span>
                  )}
                </div>
                <ul className="desk-list">
                  {finished.map((f) => (
                    <li key={f.key} className="desk-row is-done">
                      {f.isTask ? (
                        <button
                          type="button"
                          className="desk-row-check is-checked"
                          aria-label={`Undo: ${f.label}`}
                          onClick={() => onToggleTask(f.taskId)}
                        >
                          <span aria-hidden="true">✓</span>
                        </button>
                      ) : (
                        <span
                          className="desk-row-check is-checked"
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                      )}
                      <span className="desk-row-task">{f.label}</span>
                      {f.tag && (
                        <span className="desk-row-tag">{f.tag}</span>
                      )}
                    </li>
                  ))}
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

          {/* Somewhere for what is not work. In the rail, under what's next,
              because it must be reachable without being in the way. */}
          <YoursOnlyPanel project={project} />

          <section className="desk-panel desk-week" aria-label="This week">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">This week</span>
            </div>
            <div className="desk-week-bars" role="img" aria-label="Hours this week">
              {week.days.map((d, i) => (
                <div
                  key={`${d.day}-${i}`}
                  className={`desk-week-col${d.isToday ? ' is-today' : ''}`}
                >
                  <div
                    className={`desk-week-bar${d.fill ? ' is-filled' : ''}`}
                    style={{ height: `${d.hPx}px` }}
                    title={d.fill ? `${d.hours}h` : undefined}
                  />
                  <span className="desk-week-day">{d.day}</span>
                  {/* Which week, and which column is now. Seven bare letters
                      with two repeated pairs identified neither. */}
                  <span className="desk-week-date">{d.date}</span>
                </div>
              ))}
            </div>
            <p className="desk-week-total">
              {hoursLoggedWords(week.total)}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
