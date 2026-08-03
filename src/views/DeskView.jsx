/**
 * Project desk — Studio mockup layout (option B: literal columns).
 *
 * Grid matches Studio.dc.html:
 *   main (1fr): artboard → starred pack → brief
 *   right (340px): What's next → queue → Done → Client → This week
 *
 * Owner chose literal mock (2026-08-03 option B), including counts,
 * relative times, Mark done as primary, and a week strip driven by real
 * workLog data (never invented hours). Shell chrome (icon rail, top bar)
 * stays the app's — not duplicated here.
 */
import { labelForView, labelForStepId } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import { relativeDeadlineLabel } from '../lib/dates'
import { pinFaceStyle, pinVisualKind } from '../lib/moodPins'
import { DELIVERABLE_OPTIONS } from '../lib/detectiveBrief'
import BrandArtboard from '../components/BrandArtboard'
import '../styles/lazy-desk.css'

const stopTag = (label = '') => label.slice(0, 3).toUpperCase()

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

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

/** Hours per weekday for the current local week (Sun–Sat), from workLog. */
function weekFromWorkLog(workLog = [], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - start.getDay())
  const hours = Array(7).fill(0)
  for (const row of workLog) {
    if (!row?.date || !(Number(row.hours) > 0)) continue
    const d = new Date(`${row.date}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    if (d < start) continue
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    if (d >= end) continue
    hours[d.getDay()] += Number(row.hours) || 0
  }
  const total = hours.reduce((a, b) => a + b, 0)
  const max = Math.max(...hours, 0.01)
  return {
    total,
    days: hours.map((h, i) => ({
      day: WEEKDAYS[i],
      hours: h,
      // 4–64px bar height from real hours only
      hPx: h > 0 ? Math.max(4, Math.round((h / max) * 56)) : 2,
      fill: h > 0,
    })),
  }
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

  const deadline = relativeDeadlineLabel(project?.deadline)

  const version = String(project?.designVersion || '').trim() || 'v1'
  const editedAge = relativeAgeLabel(project?.identityEditedAt)
  const versionLabel = editedAge
    ? `${version} · edited ${editedAge}`
    : version

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
    .slice(0, 8)

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
              <span className="desk-stamp" role="status">
                {versionLabel}
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
        <aside className="desk-rail" aria-label="What's next and client">
          <section className="desk-panel desk-next" aria-label="What's next">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">What&rsquo;s next</span>
              {progressLabel && (
                <span className="desk-progress">{progressLabel}</span>
              )}
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

          <section className="desk-panel desk-client" aria-label="Client">
            <div className="desk-panel-head">
              <span className="desk-eyebrow">Client</span>
              {deadline && project?.deadline && (
                <span className="desk-due">{deadline}</span>
              )}
            </div>
            {activity.length === 0 ? (
              <p className="desk-empty">
                Nothing from the client yet. Send them the portal link and
                their answers, uploads and approvals land here.
              </p>
            ) : (
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
                      <span className="desk-activity-text">
                        {a.title}
                        {a.preview ? (
                          <span className="desk-activity-preview">
                            {a.preview}
                          </span>
                        ) : null}
                      </span>
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
