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
 * Owner chose literal mock (option B) for counts, relative times, Mark done
 * primary, and a week strip from real workLog. Shell chrome stays the app's.
 */
import { labelForView, labelForStepId } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import { namedDeadlineLabel } from '../lib/dates'
import { pinFaceStyle, pinVisualKind } from '../lib/moodPins'
import { DELIVERABLE_OPTIONS } from '../lib/detectiveBrief'
import {
  buildBrandPackSnapshot,
  packReadiness,
} from '../lib/exportFiles'
import { weekFromWorkLog } from '../lib/workWeek'
import DeskLiveArtboard from '../components/DeskLiveArtboard'
import '../styles/lazy-desk.css'

/**
 * Leave-behind ambient status for the artboard stamp slot.
 * Real signals only: packReadiness.thin + path-all-done (same formula as
 * App brandBookReady = pathStepsFull && !leaveBehindThin).
 */
export function packHandoffStatus({ thin, pathFull }) {
  if (thin) return 'Pack still thin for handoff'
  if (pathFull) return 'Pack ready for handoff'
  return 'Pack has a core'
}

const stopTag = (label = '') => label.slice(0, 3).toUpperCase()

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
  onOpenClientInbox,
  onToggleTask,
  onToggleNotNeeded,
  onMarkStepDone,
  onEditIdentity,
  onEditBrief,
  onOpenWall,
  onOpenAssets,
}) {
  const notNeeded = Array.isArray(project?.stepsNotNeeded)
    ? project.stepsNotNeeded
    : []
  const skipped = (id) => notNeeded.includes(id)

  const gapRow = nextGap && !skipped(nextGap.id) ? nextGap : null
  const phase = gapRow ? getProcessPhase(gapRow.id) : null

  const openTasks = tasks.filter((t) => !t.completed)
  const doneTasks = tasks.filter((t) => t.completed)
  const taskTotal = openTasks.length + doneTasks.length
  const taskDone = doneTasks.length
  const progressLabel =
    taskTotal > 0 ? `${taskDone}/${taskTotal}` : null

  const upcomingStops = rows.filter(
    (r) => !r.done && !skipped(r.id) && r.id !== gapRow?.id
  )
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
      tag: stopTag(r.label),
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

  const gapTitle =
    phase?.plain ||
    (gapRow ? `Pick this up in ${gapRow.label}.` : '')

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
              <button
                type="button"
                className="btn btn-primary"
                onClick={onEditIdentity}
              >
                Edit identity
              </button>
              {typeof onOpenAssets === 'function' &&
                (packHandoffReady ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onOpenAssets}
                  >
                    Open {labelForStepId('deliver')} — pack ready
                  </button>
                ) : (
                  <button
                    type="button"
                    className="desk-panel-link desk-panel-link-quiet"
                    onClick={onOpenAssets}
                  >
                    Open {labelForStepId('deliver')}
                  </button>
                ))}
              <span className="desk-artboard-note">
                Brand colour lives here only — the desk stays out of the way.
              </span>
            </div>
          </section>

          <section
            className="desk-panel desk-pack"
            aria-label="Research pack"
          >
            <div className="desk-panel-head">
              <span className="desk-eyebrow">
                {labelForStepId('research')} · starred for the pack
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
                Nothing starred yet — open the wall and star up to 6 for the
                pack.
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
              <p className="desk-empty">
                Nothing in the brief yet. Open Strategy and fill what you
                can — blanks are fine.
              </p>
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
                  const when = a.sortAt ? relativeAgeLabel(a.sortAt) : ''
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
              <div className="desk-next-meta">
                {deadline && project?.deadline && (
                  <span className="desk-due">{deadline}</span>
                )}
                {progressLabel && (
                  <span className="desk-progress">{progressLabel}</span>
                )}
              </div>
            </div>

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
                <button
                  type="button"
                  className="desk-card-hit"
                  onClick={() => onOpenView(gapRow.view)}
                >
                  <span className="desk-card-tag">{gapRow.label}</span>
                  <span className="desk-card-title">{gapTitle}</span>
                </button>
                <div className="desk-card-actions">
                  {typeof onMarkStepDone === 'function' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onMarkStepDone(gapRow.id, true)}
                    >
                      Mark done
                    </button>
                  )}
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
              {upcomingStops.map((r) => (
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

          <section className="desk-panel desk-week" aria-label="This week">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">This week</span>
            </div>
            <div className="desk-week-bars" role="img" aria-label="Hours this week">
              {week.days.map((d, i) => (
                <div key={`${d.day}-${i}`} className="desk-week-col">
                  <div
                    className={`desk-week-bar${d.fill ? ' is-filled' : ''}`}
                    style={{ height: `${d.hPx}px` }}
                    title={d.fill ? `${d.hours}h` : undefined}
                  />
                  <span className="desk-week-day">{d.day}</span>
                </div>
              ))}
            </div>
            <p className="desk-week-total">
              {week.total > 0
                ? `${Math.round(week.total * 10) / 10} hours logged`
                : 'No hours logged this week'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
