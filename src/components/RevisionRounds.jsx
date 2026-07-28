/**
 * Revision rounds, and the feedback that happens inside them.
 *
 * Review was a stage you passed through. It is now also the place that counts
 * what was agreed: how many rounds, which one you are on, and what each
 * reviewer actually asked for.
 *
 * Two rules from CLAUDE.md shape this:
 *
 *  - It never blocks. Going past the agreed count changes the wording and
 *    offers to bill for it. It does not gate the button.
 *  - It never bills silently. Charging is a tick you make, not something the
 *    app infers from a counter going up.
 */
import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  revisionSummary,
  revisionLine,
  roundCharge,
  FEEDBACK_STATUS,
} from '../lib/revisions'

export default function RevisionRounds({ activeProject, flashToast }) {
  const startRevisionRound = useAppStore((s) => s.startRevisionRound)
  const closeRevisionRound = useAppStore((s) => s.closeRevisionRound)
  const addFeedbackEntry = useAppStore((s) => s.addFeedbackEntry)
  const updateFeedbackEntry = useAppStore((s) => s.updateFeedbackEntry)
  const removeFeedbackEntry = useAppStore((s) => s.removeFeedbackEntry)

  const [reviewer, setReviewer] = useState('')
  const [issue, setIssue] = useState('')
  const [decision, setDecision] = useState('')
  const [billIt, setBillIt] = useState(false)
  const [hours, setHours] = useState('')

  if (!activeProject) return null

  const rounds = Array.isArray(activeProject.revisionRounds)
    ? activeProject.revisionRounds
    : []
  const included = activeProject.scopeRevisionsIncluded ?? 2
  const summary = revisionSummary(rounds, included)
  const log = Array.isArray(activeProject.feedbackLog)
    ? activeProject.feedbackLog
    : []

  const billing = activeProject.scopeRevisionBilling || 'perRound'
  const wouldCharge = roundCharge({
    billing,
    rate: activeProject.scopeRevisionRate,
    hours: Number(hours) || 0,
    isBeyond: summary.isBeyond,
  })

  const submitFeedback = () => {
    if (!issue.trim()) return
    addFeedbackEntry({ reviewer, issue, decision, status: 'open' })
    setIssue('')
    setDecision('')
  }

  const close = () => {
    closeRevisionRound({ bill: billIt, hours: Number(hours) || 0 })
    if (billIt && wouldCharge) {
      flashToast?.(`Round billed — $${wouldCharge.toFixed(2)} added to the invoice`)
    }
    setBillIt(false)
    setHours('')
  }

  return (
    <section className="panel brand-section revision-panel">
      <div className="brand-section-label">Rounds</div>

      <p className="revision-line" aria-live="polite">
        {revisionLine(rounds, included)}
      </p>

      {summary.open ? (
        <div className="revision-actions">
          {/* The offer to bill appears only when the round is actually past
              what was agreed, and it is unticked. Reaching the limit is not
              consent to charge for it. */}
          {summary.isBeyond ? (
            <div className="revision-bill-block">
              <label className="revision-bill-check">
                <input
                  type="checkbox"
                  checked={billIt}
                  onChange={(e) => setBillIt(e.target.checked)}
                />
                <span>Bill this round</span>
              </label>
              {billIt && billing === 'hourly' ? (
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  className="field-input revision-hours-input"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Hours"
                  aria-label="Hours on this round"
                />
              ) : null}
              {billIt ? (
                <span className="revision-bill-amount">
                  {wouldCharge
                    ? `$${wouldCharge.toFixed(2)} → invoice`
                    : 'Set a rate in Scope first'}
                </span>
              ) : null}
            </div>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm" onClick={close}>
            Finish round {summary.number}
          </button>
        </div>
      ) : (
        <div className="revision-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => startRevisionRound('')}
          >
            {summary.nextIsBeyond ? 'Start an extra round' : 'Start a round'}
          </button>
        </div>
      )}

      {/* Feedback log — Reviewer / Issue / Decision / Status. The free-text
          notes box above it stays: this is for the things that need a
          decision recorded against them, not for every thought. */}
      <div className="feedback-log">
        <span className="define-field-label">Feedback</span>
        {log.length === 0 ? (
          <p className="panel-hint">Nothing logged yet.</p>
        ) : (
          <ul className="feedback-log-list">
            {log.map((f) => (
              <li key={f.id} className={`feedback-row is-${f.status}`}>
                <div className="feedback-row-main">
                  <span className="feedback-issue">{f.issue}</span>
                  {f.reviewer ? (
                    <span className="feedback-reviewer">{f.reviewer}</span>
                  ) : null}
                </div>
                {f.decision ? (
                  <span className="feedback-decision">{f.decision}</span>
                ) : null}
                <div className="feedback-row-actions">
                  <select
                    className="field-input feedback-status-select"
                    value={f.status}
                    aria-label={`Status of “${f.issue}”`}
                    onChange={(e) =>
                      updateFeedbackEntry(f.id, { status: e.target.value })
                    }
                  >
                    {FEEDBACK_STATUS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="running-todo-remove"
                    aria-label={`Remove “${f.issue}”`}
                    onClick={() => removeFeedbackEntry(f.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="feedback-entry">
          <input
            className="field-input"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="Who said it"
            aria-label="Reviewer"
          />
          <input
            className="field-input"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="What they said"
            aria-label="Issue"
          />
          <input
            className="field-input"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="What you decided (optional)"
            aria-label="Decision"
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={submitFeedback}
            disabled={!issue.trim()}
          >
            Log it
          </button>
        </div>
      </div>
    </section>
  )
}
