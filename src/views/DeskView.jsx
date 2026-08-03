/**
 * Project desk — the per-project hub from the 2026 design handoff (build 4).
 *
 * Layout hierarchy (adhd-executive-function-advisor, 2026-08-03):
 * - **Action column** = What's next (resume, gap card, queue). Sole launchpad.
 * - **Ambient column** = identity artboard, starred pack, client, brief —
 *   skim + one outbound each. Not five peer decisions.
 *
 * Deliberately NOT the mockup's version of:
 * - week-hours chart (deferred time feature / numbers don't register)
 * - 56px icon rail (owner keeps labelled sidebar)
 * - n/10 counters
 * - per-approval clock times (nothing writes them — fake feature)
 * - "v4 · 2h ago" identity stamp (words only via identityStamp)
 *
 * Mark done is real (`setStepDone` / `pathDone`) but tertiary under the gap
 * card — never a peer of Open. Open stays the only primary so the desk
 * launches work instead of grading it.
 */
import { labelForView, labelForStepId } from '../lib/journey'
import { getProcessPhase } from '../lib/processGuide'
import { relativeDeadlineLabel } from '../lib/dates'
import { identityStamp } from '../lib/identityStamp'
import { messageDayLabel } from '../lib/messageDayLabel'
import { pinFaceStyle, pinVisualKind } from '../lib/moodPins'
import BrandArtboard from '../components/BrandArtboard'
import '../styles/lazy-desk.css'

/** Three-letter stop tag, from the stop's own label — never a hand-typed map. */
const stopTag = (label = '') => label.slice(0, 3).toUpperCase()

/**
 * Brief fields shown when filled. Labels match detectiveBrief; order is the
 * glance order (who → why → for whom → feel → words).
 */
const BRIEF_FIELDS = [
  { id: 'clientName', label: 'Business name' },
  { id: 'goal', label: 'What this should change' },
  { id: 'audience', label: 'Who it is for' },
  { id: 'usp', label: 'What the business does' },
  { id: 'feel', label: 'How it should feel' },
  { id: 'brandWords', label: 'What matters most' },
]

function briefValue(detective, id) {
  const raw = detective?.[id]
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v || '').trim()).filter(Boolean).join(', ')
  }
  return String(raw || '').trim()
}

function pinBorder(pin) {
  if (pin?.packHero) return '2px solid var(--text-primary)'
  if (pin?.inPack) return '1px solid var(--text-primary)'
  return '1px solid var(--border-subtle)'
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
    ...doneStops.map((r) => ({
      key: `s-${r.id}`,
      label: r.label,
      tag: stopTag(r.label),
    })),
  ].slice(0, 3)

  const deadline = relativeDeadlineLabel(project?.deadline)
  const stamp = identityStamp(project)

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
    .slice(0, 6)

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
            Client
          </button>
        </div>
      </div>

      <div className="desk-grid">
        {/* ── Action column (dominant) ── */}
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
              {/* Tertiary only — never a peer of Open (decision fatigue on
                  the one card that exists to end blank-page paralysis). */}
              {typeof onMarkStepDone === 'function' && (
                <button
                  type="button"
                  className="desk-mark-done"
                  onClick={() => onMarkStepDone(gapRow.id, true)}
                >
                  Mark {gapRow.label} done
                </button>
              )}
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
              <span className="desk-eyebrow desk-eyebrow-strong">Done</span>
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

        {/* ── Ambient column ── */}
        <div className="desk-ambient">
          <section
            className="desk-panel desk-artboard"
            aria-label="Live artboard"
          >
            <div className="desk-panel-head">
              <span className="desk-eyebrow">
                {labelForStepId('design')} · live artboard
              </span>
              {stamp.state !== 'none' && (
                <span
                  className={`desk-stamp is-${stamp.state}`}
                  role="status"
                >
                  {stamp.label}
                </span>
              )}
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
                      {(kind === 'empty' ||
                        pin.type === 'quote' ||
                        pin.type === 'note' ||
                        pin.type === 'spark') &&
                        pin.note && (
                          <p className="desk-pack-note">{pin.note}</p>
                        )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="desk-ambient-bottom">
            <section className="desk-panel desk-client" aria-label="Client">
              <div className="desk-panel-head">
                <span className="desk-eyebrow">Client</span>
              </div>
              {activity.length === 0 ? (
                <p className="desk-empty">
                  Nothing from the client yet. Send them the portal link and
                  their answers, uploads and approvals land here.
                </p>
              ) : (
                <ul className="desk-activity">
                  {activity.map((a) => {
                    /* Messages carry created_at; step approvals do not have
                       per-event times — omit a when rather than invent one. */
                    const when =
                      a.kind === 'message' && a.sortAt
                        ? messageDayLabel(a.sortAt)
                        : ''
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
                className="btn btn-secondary"
                onClick={onOpenClientInbox}
              >
                Client link &amp; approvals
              </button>
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
        </div>
      </div>
    </div>
  )
}
