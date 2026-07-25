/**
 * Inline, non-dismissible reminder shown at the top of a step when Define
 * fields it depends on are still empty. No hard gate — the step stays fully
 * usable either way. It disappears only by being filled in, never by a
 * close button (per ADHD advisor: dismissal is how reminders become noise).
 */
import useAppStore from '../store/useAppStore'
import { missingDependencies, fieldLabel, fieldPlaceholder } from '../lib/stepDependencies'

export default function StepDependencyReminder({ stepId, stepLabel }) {
  const detective = useAppStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.detective
  )
  const updateDetective = useAppStore((s) => s.updateDetective)
  const missing = missingDependencies(stepId, detective)

  if (!missing.length) return null

  return (
    <div className="step-dependency-reminder" role="note">
      <p className="step-dependency-reminder-text">
        {stepLabel} works better with: {missing.map(fieldLabel).join(', ')}
      </p>
      <div className="step-dependency-reminder-fields">
        {missing.map((id) => (
          <input
            key={id}
            className="field-input"
            aria-label={fieldLabel(id)}
            placeholder={fieldPlaceholder(id)}
            value={detective?.[id] || ''}
            onChange={(e) => updateDetective(id, e.target.value)}
          />
        ))}
      </div>
    </div>
  )
}
