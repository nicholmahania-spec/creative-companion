/**
 * The brief's answers, carried into the step that uses them — plus one
 * quiet line when something is still missing so the user can jump back
 * to Project overview without a permanent nag wall.
 *
 * Filled deps → context strip (read-only).
 * Missing deps → single dismissible “still needs…” with a jump to Define.
 * Never re-embeds the brief form on other steps (CLAUDE: toll prompts).
 */
import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import {
  STEP_DEPENDENCIES,
  fieldLabel,
  missingDependencies,
} from '../lib/stepDependencies'

export default function StepDependencyReminder({ stepId, setActiveView }) {
  const detective = useAppStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.detective
  )
  const [dismissedMissing, setDismissedMissing] = useState(false)

  const depIds = STEP_DEPENDENCIES[stepId] || []
  if (!depIds.length) return null

  const fieldValue = (id) => {
    const v = detective?.[id]
    if (Array.isArray(v)) return v.length ? v.join(', ') : ''
    return String(v || '').trim()
  }

  const answered = depIds
    .map((id) => ({
      id,
      label: fieldLabel(id),
      value: fieldValue(id),
    }))
    .filter((f) => f.value)

  const missing = missingDependencies(stepId, detective || {})

  // Prefer showing context when we have answers
  if (answered.length > 0) {
    return (
      <div className="step-context-strip" role="note">
        {answered.map((f) => (
          <p
            key={f.id}
            className="step-context-item"
            title={`${f.label} — ${f.value}`}
          >
            <span className="step-context-label">{f.label}</span>
            <span className="step-context-value">{f.value}</span>
          </p>
        ))}
        {missing.length > 0 && !dismissedMissing ? (
          <p className="step-context-missing">
            <span>
              Project overview still needs:{' '}
              {missing.map((id) => fieldLabel(id)).join(' · ')}
            </span>
            <span className="step-context-missing-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActiveView?.('project')}
              >
                Open overview
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setDismissedMissing(true)}
                aria-label="Dismiss missing reminder"
              >
                Not now
              </button>
            </span>
          </p>
        ) : null}
      </div>
    )
  }

  // Nothing answered yet — one quiet line only
  if (!missing.length || dismissedMissing) return null

  return (
    <div className="step-context-strip is-missing-only" role="note">
      <p className="step-context-missing">
        <span>
          Project overview still needs:{' '}
          {missing.map((id) => fieldLabel(id)).join(' · ')}
        </span>
        <span className="step-context-missing-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setActiveView?.('project')}
          >
            Open overview
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDismissedMissing(true)}
            aria-label="Dismiss missing reminder"
          >
            Not now
          </button>
        </span>
      </p>
    </div>
  )
}
