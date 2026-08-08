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
import { DELIVERABLE_OPTIONS } from '../lib/brief/detectiveBrief'
import {
  buildBrandPackSnapshot,
  packReadiness,
} from '../lib/book/exportFiles'
import { weekFromWorkLog, hoursLoggedWords } from '../lib/billing/workWeek'
import { paletteIsUntouched } from '../lib/color'
import { stopEstablished } from '../lib/journey/stopEstablished'
import DeskLiveArtboard from '../components/DeskLiveArtboard'
import BrandCheckPanel from '../components/BrandCheckPanel'
import YoursOnlyPanel from '../components/YoursOnlyPanel'
import '../styles/lazy-desk.css'

/**
 * Leave-behind ambient status for the artboard stamp slot.
 * Real signals only: packReadiness.thin + path-all-done (same formula as
 * pack readiness, which is not the same as the path being walked).
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

function briefValue(detective, id) {
  const raw = detective?.[id]
  if (Array.isArray(raw)) {
    if (id === 'deliverablesPicked') {
      const labels = DELIVERABLE_OPTIONS.reduce((m, o) => {
        m[o.id] = o.label
        return m
      }, {})
      return raw
        .map((v) => labels[v] || String(v || '').trim())
        .filter(Boolean)
        .join(', ')
    }
    return raw.map((v) => String(v || '').trim()).filter(Boolean).join(', ')
  }
  return String(raw || '').trim()
}

/** Mock brief grid order and short labels. */
const BRIEF_FIELDS = [
  { id: 'clientName', label: 'Client' },
  { id: 'goal', label: 'Goal' },
  { id: 'audience', label: 'Audience' },
  { id: 'feel', label: 'Feel' },
  { id: 'deliverablesPicked', label: 'Deliverables' },
  { id: 'avoid', label: 'Off the table' },
]

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
  onOpenSection,
  onOpenClientInbox,
  onMarkStepDone,
  onEditIdentity,
  onEditBrief,
  onOpenWall,
  onOpenAssets,
}) {
  const gapRow = nextGap || null

  /* ALL FIVE, ALWAYS, IN ORDER — navigation, not a to-do list.
     What each card says is what is ESTABLISHED at that stop ("6 starred,
     14 pins"), never whether it is finished. A fact about the work; a tick
     would be a verdict about the person. See `stopEstablished`. */
  const stopCards = rows.map((r) => ({
    ...r,
    ...stopEstablished(r.id, {
      project,
      moodItems: pins,
      /* The stock four are the factory setting, not a decision — showing
         them on this card would present colours nobody chose as the brand's
         own. Same guard `paletteIsUntouched` exists for. */
      palette: paletteIsUntouched(palette) ? [] : palette,
    }),
  }))

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

  const detective = project?.detective || {}
  const briefRows = BRIEF_FIELDS.map((f) => ({
    ...f,
    value: briefValue(detective, f.id),
  })).filter((f) => f.value)

  const projectId = project?.id != null ? String(project.id) : ''
  const activity = (clientInbox?.rows || [])
    .filter((r) => String(r.projectLocalId ?? '') === projectId)
    .slice(0, 3)
  const unreadClient = activity.some((a) => a.unread)

  const week = weekFromWorkLog(project?.workLog || [])

  const gapTitle = gapRow ? gapRow.label : ''

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
            </div>
          </section>

          <section
            className="desk-panel desk-pack"
            aria-label="Research pack"
          >
            <div className="desk-panel-head">
              <span className="desk-eyebrow">
                {labelForStepId('research')} · starred for the client shortlist
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
              <p className="desk-empty">Nothing starred yet.</p>
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

          <section className="desk-panel desk-brief" aria-label="Brief">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">
                {labelForStepId('define')} · the brief
              </span>
              <button
                type="button"
                className="desk-panel-link desk-panel-link-quiet"
                onClick={onEditBrief}
              >
                Edit
              </button>
            </div>
            {briefRows.length === 0 ? (
              <p className="desk-empty">Nothing in the brief yet.</p>
            ) : (
              <dl className="desk-brief-grid">
                {briefRows.map((row) => (
                  <div key={row.id} className="desk-brief-item">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {/* Under the brief on purpose: the check reads the brief's scope,
              and a gap only means something once you can see what was asked
              for. Collapsed until pressed — see BrandCheckPanel. */}
          <BrandCheckPanel
            project={project}
            moodItems={pins}
            palette={palette}
            tasks={tasks}
            clientRows={clientInbox?.rows || []}
            onOpenView={(view, section) => {
              if (view === 'brand' && section && typeof onOpenSection === 'function') {
                onOpenSection(section)
                return
              }
              onOpenView(view)
            }}
          />
        </div>

        {/* ── RIGHT COLUMN ── */}
        <aside className="desk-rail" aria-label="Client and what's next">
          {/* Compact Client strip — always first in the rail (not under Done). */}
          <section
            className={`desk-panel desk-client-strip${unreadClient ? ' has-unread' : ''}`}
            aria-label="Client"
          >
            <div className="desk-panel-head">
              <span className="desk-eyebrow">Client</span>
              <span className="desk-client-status">
                {activity.length === 0
                  ? 'No messages yet'
                  : unreadClient
                    ? 'Needs a look'
                    : 'Up to date'}
              </span>
            </div>
            {activity.length > 0 && (
              <ul className="desk-activity">
                {activity.map((a) => {
                  /* `at`, not `sortAt`. Only rows with a real per-event time
                     carry `at`; `sortAt` is portal-level ordering data that
                     clientInbox marks "never shown to the user". */
                  const when = a.at ? relativeAgeLabel(a.at) : ''
                  return (
                    <li
                      key={a.id}
                      className={`desk-activity-row${a.unread ? ' is-unread' : ''}`}
                    >
                      <span
                        className="desk-activity-dot"
                        aria-hidden="true"
                      />
                      <span className="desk-activity-text">{a.title}</span>
                      {a.kind === 'approval' && (
                        <span className="desk-activity-pill">Approved</span>
                      )}
                      {when ? (
                        <span className="desk-activity-when">{when}</span>
                      ) : null}
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
              Client link &amp; approvals
            </button>
          </section>

          <section className="desk-panel desk-next" aria-label="What's next">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">What&rsquo;s next</span>
              {deadline && project?.deadline && (
                <span className="desk-due">{deadline}</span>
              )}
            </div>

            {/* Above the card on purpose: it is context for the decision the
                card is about to ask for, so it has to be read first. */}
            {lastTouch && <p className="desk-last-touch">{lastTouch}</p>}

            {gapRow && (
              <div className="desk-card">
                <button
                  type="button"
                  className="desk-card-hit"
                  onClick={() => onOpenView(gapRow.view)}
                >
                  <span className="desk-card-tag">{gapRow.label}</span>
                  <span className="desk-card-title">{gapTitle}</span>
                </button>
                <div className="desk-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onOpenView(gapRow.view)}
                  >
                    {`Open ${gapRow.label}`}
                  </button>
                </div>
                {/* ONE quiet correction — a correction, not an
                    acknowledgement. Every condition behind "which stop is
                    next" is a proxy, so a mark drawn in Illustrator or a
                    stage agreed on the phone is invisible to the app and the
                    wrong stop would stay next forever. Its former partner
                    control, and the per-project field it maintained, are
                    retired: see `useAppStore` for why, and
                    `deskCardWeight.test.js` for the rule that keeps this card
                    at one button and one link. */}
                {typeof onMarkStepDone === 'function' && (
                  <button
                    type="button"
                    className="desk-card-aside-link"
                    onClick={() => onMarkStepDone(gapRow.id, true)}
                  >
                    {`Not next — ${gapRow.label} is handled`}
                  </button>
                )}
              </div>
            )}

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
              </button>
            ) : null}
          </section>

          {/* ── The five workspaces ──────────────────────────────────────
              Navigation with context, replacing a leftovers list.

              What was here: the stops you had not finished, minus the
              current gap, minus any you had skipped. Three problems — it
              was a second copy of the sidebar's map (G3), it was completion
              debt shaped like navigation (a stop vanished on completion, so
              the list was a to-do), and on a phone it was the ONLY route to
              a workspace from the Desk, because the horizontal step rail
              renders only on path views and the sidebar collapses to a
              dialog behind the menu button below 768px.

              All five, always, in order. Each says what is ESTABLISHED
              there, which is the answer to "what have I already decided" —
              not whether it is finished, which is a verdict with no action
              attached. */}
          <section className="desk-panel desk-stops" aria-label="Workspaces">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">Workspaces</span>
            </div>
            <ul className="desk-stop-list">
              {stopCards.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={`desk-stop${
                      gapRow?.id === r.id ? ' is-next' : ''
                    }`}
                    onClick={() => onOpenView(r.view)}
                  >
                    <span className="desk-stop-name">{r.label}</span>
                    <span className="desk-stop-line">{r.line}</span>
                    {/* The Identity row shows the brand rather than a
                        sentence about it — the palette and the mark are the
                        established thing. */}
                    {(r.swatches?.length || r.mark) && (
                      <span className="desk-stop-brand" aria-hidden="true">
                        {r.mark ? (
                          <img className="desk-stop-mark" src={r.mark} alt="" />
                        ) : null}
                        {(r.swatches || []).map((hex) => (
                          <span
                            key={hex}
                            className="desk-stop-swatch"
                            style={{ background: hex }}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
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
