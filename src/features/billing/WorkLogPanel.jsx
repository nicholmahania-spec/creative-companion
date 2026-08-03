/**
 * Your hours — the work clock's own record.
 *
 * Primary reading is relative (which stages got attention, how many
 * sessions) — not raw clock numbers. The owner is time-blind; "1.25h"
 * does not register. Exact minutes stay behind a toggle for export/curiosity.
 *
 * Nothing here is billable. `timeLog` and the invoice are hand-entered.
 */
import { useCallback, useMemo, useState } from 'react'
import { JOURNEY_STEPS } from '../../lib/journey/journey'
import { useModalFocus } from '../../lib/useModalFocus'
import '../../styles/lazy-worklog.css'

/** Labels for both journey view ids (`studio`) and step ids (`research`). */
const STAGE_TO_LABEL = Object.fromEntries([
  ...JOURNEY_STEPS.map((s) => [s.view, s.label]),
  ...JOURNEY_STEPS.map((s) => [s.id, s.label]),
])

function stageLabel(stage) {
  /* 'Work', not a stage name. This read 'Touchpoints' because a bulk rename
     swept the old generic default ('Work') along with the stop it renamed —
     turning a neutral fallback into a specific stop, which would misattribute
     unlabelled hours in the one panel meant to be a trustworthy record. */
  if (!stage) return 'Work'
  return STAGE_TO_LABEL[stage] || stage
}

export function WorkLogPanel({ open, onClose, workLog = [], onRemoveEntry }) {
  const [showNumbers, setShowNumbers] = useState(false)

  const { byStage, sessionCount, dominant, sorted } = useMemo(() => {
    const list = Array.isArray(workLog) ? workLog : []
    const byStageMap = {}
    let totalH = 0
    list.forEach((e) => {
      const h = Number(e.hours) || 0
      totalH += h
      const key = String(e.stage || e.note || 'work')
      byStageMap[key] = (byStageMap[key] || 0) + h
    })
    const stages = Object.entries(byStageMap).sort((a, b) => b[1] - a[1])
    const max = stages[0]?.[1] || 0
    const dominant = stages[0] ? stageLabel(stages[0][0]) : null
    const sorted = [...list].sort((a, b) =>
      String(b.date).localeCompare(String(a.date))
    )
    return {
      byStage: stages,
      sessionCount: list.length,
      totalH,
      dominant,
      sorted,
      max,
    }
  }, [workLog])
  /* Focus trap, focus restore and Escape.

     This declared aria-modal="true" while implementing none of it — which is
     the worst available combination, not a missing nicety: assistive tech is
     told the rest of the page is unavailable while Tab walks straight out into
     it. Focus also never entered the dialog on open and was never returned to
     the opener on close.

     useModalFocus is the same hook ProjectOverviewShare and ClientInbox
     already use; passing onClose is what wires Escape, so one call covers all
     three. */
  const getRoot = useCallback(() => document.querySelector('.work-log-panel'), [])
  useModalFocus(open, getRoot, {
    initialSelector: '.running-todo-panel-head button, button',
    onClose,
  })


  if (!open) return null

  const maxH = byStage[0]?.[1] || 0

  return (
    <>
      <div
        className="running-todo-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="running-todo-panel work-log-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your work record"
      >
        <div className="running-todo-panel-head">
          <span className="journey-projects-heading">Your work</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="work-log-empty">
            The clock fills this in while you work. Just for you — nothing here
            goes on an invoice.
          </p>
        ) : (
          <>
            <p className="work-log-summary" role="status">
              {sessionCount === 1
                ? '1 stretch logged'
                : `${sessionCount} stretches logged`}
              {dominant ? (
                <>
                  {' '}
                  · mostly <strong>{dominant}</strong>
                </>
              ) : null}
            </p>

            <ul className="work-log-stage-bars" aria-label="Attention by stage">
              {byStage.map(([stage, hours]) => {
                const pct = maxH > 0 ? Math.round((hours / maxH) * 100) : 0
                return (
                  <li key={stage} className="work-log-stage-row">
                    <span className="work-log-stage-name">{stageLabel(stage)}</span>
                    <span className="work-log-stage-track" aria-hidden="true">
                      <span
                        className="work-log-stage-fill"
                        style={{ width: `${Math.max(8, pct)}%` }}
                      />
                    </span>
                    {showNumbers ? (
                      <span className="work-log-hours">{hours.toFixed(2)}h</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              className="btn btn-ghost btn-sm work-log-numbers-toggle"
              onClick={() => setShowNumbers((v) => !v)}
              aria-pressed={showNumbers}
            >
              {showNumbers ? 'Hide numbers' : 'Show numbers'}
            </button>

            {showNumbers ? (
              <>
                <ul className="work-log-list">
                  {sorted.map((e) => (
                    <li key={e.id} className="work-log-row">
                      <span className="work-log-date">{e.date}</span>
                      <span className="work-log-stage">
                        {stageLabel(e.stage || e.note)}
                      </span>
                      <span className="work-log-hours">
                        {Number(e.hours).toFixed(2)}h
                      </span>
                      {onRemoveEntry && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onRemoveEntry(e.id)}
                          aria-label={`Remove ${stageLabel(e.stage)} on ${e.date}`}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="work-log-total">
                  {sorted
                    .reduce((s, e) => s + (Number(e.hours) || 0), 0)
                    .toFixed(2)}
                  h total
                </p>
              </>
            ) : (
              <ul className="work-log-list work-log-list-quiet">
                {sorted.slice(0, 8).map((e) => (
                  <li key={e.id} className="work-log-row">
                    <span className="work-log-date">{e.date}</span>
                    <span className="work-log-stage">
                      {stageLabel(e.stage || e.note)}
                    </span>
                    {onRemoveEntry && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onRemoveEntry(e.id)}
                        aria-label={`Remove ${stageLabel(e.stage)} on ${e.date}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </aside>
    </>
  )
}

export default WorkLogPanel
