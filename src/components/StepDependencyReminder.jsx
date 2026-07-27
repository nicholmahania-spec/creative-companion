/**
 * The brief's answers, carried into the step that uses them.
 *
 * This was the inverse: a nag. When a Define field a step depends on was
 * empty, it put that field's INPUT at the top of the step — on all six
 * post-Define pages — and was deliberately non-dismissible, so it only went
 * away by being filled in. Three problems with that shape:
 *
 * 1. It asked you to do Define work while standing on another page. The place
 *    to answer "who are your customers?" is the brief, and Define already
 *    names your unanswered required fields and jumps you to them.
 * 2. Un-dismissible plus never-actioned is the worst combination available:
 *    the owner's read was "I'll probably never use them", and a prompt whose
 *    answer is predictable is a toll, not a prompt. It held the most valuable
 *    position on six pages, permanently, for nothing.
 * 3. It solved the wrong half of the problem. The real gap is that the
 *    answers you HAVE never reach the pages that need them — Research
 *    receives only `brandWords`, so the audience and goal you already wrote
 *    stay one view away from the screen where you act on them.
 *
 * So it now shows what you have and asks for nothing. Missing fields render
 * nothing at all; the brief is where they get answered.
 */
import useAppStore from '../store/useAppStore'
import { STEP_DEPENDENCIES, fieldLabel } from '../lib/stepDependencies'

export default function StepDependencyReminder({ stepId }) {
  const detective = useAppStore(
    (s) => s.projects.find((p) => p.id === s.currentProjectId)?.detective
  )

  const answered = (STEP_DEPENDENCIES[stepId] || [])
    .map((id) => ({ id, label: fieldLabel(id), value: String(detective?.[id] || '').trim() }))
    .filter((f) => f.value)

  if (!answered.length) return null

  return (
    <div className="step-context-strip" role="note">
      {answered.map((f) => (
        <p key={f.id} className="step-context-item" title={`${f.label} — ${f.value}`}>
          <span className="step-context-label">{f.label}</span>
          <span className="step-context-value">{f.value}</span>
        </p>
      ))}
    </div>
  )
}
