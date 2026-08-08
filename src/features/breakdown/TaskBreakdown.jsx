import { useRef, useState } from 'react'
import { BREAKDOWN_DEPTHS, generateProjectMicrosteps } from '../../lib/microsteps'
import { labelForStepId } from '../../lib/journey/journey'
import { useModalFocus } from '../../lib/useModalFocus'

/**
 * "Break down" wizard — a big job turned into micro-steps, five screens deep.
 *
 * Lifted out of App.jsx, which held its seven pieces of state, its seven
 * handlers and its 228 lines of markup among ~70 other useStates. Nothing here
 * was ever App's business: the whole wizard is reachable only from one button,
 * writes nothing anyone else reads, and its state is dead the moment it
 * closes. It sat in App because that is where it was first written.
 *
 * MOUNTED FRESH PER RUN, NOT RESET BY EFFECT. The parent renders this behind a
 * `key` that changes each time the wizard is opened, so every run starts from
 * useState initialisers. The obvious alternative — an effect watching `open`
 * that clears the fields — is the `set-state-in-effect` shape this codebase
 * already carries 22 of, and it would have added seven more. A remount is both
 * cheaper to read and free of that class of bug.
 *
 * The parent still owns what outlives the wizard: committing the steps,
 * switching views, the toast and the award. This owns only the five screens.
 */
export default function TaskBreakdown({
  projectName,
  projectBrief,
  onClose,
  onCommit,
  onFinish,
  onRestart,
}) {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(projectName || '')
  const [done, setDone] = useState(projectBrief?.slice(0, 120) || '')
  const [depth, setDepth] = useState('standard')
  const [energy, setEnergy] = useState('low')
  const [steps, setSteps] = useState([])
  const [added, setAdded] = useState(0)

  const overlayRef = useRef(null)
  useModalFocus(true, () => overlayRef.current, {
    initialSelector: '.export-panel-header button, button',
    onClose,
  })

  const buildPreview = () => {
    setSteps(
      generateProjectMicrosteps({
        goal: goal || projectName || 'this project',
        doneLooksLike: done,
        depth,
      })
    )
    setStep(3)
  }

  const updateLine = (index, value) =>
    setSteps((rows) => rows.map((r, i) => (i === index ? value : r)))
  const removeLine = (index) =>
    setSteps((rows) => rows.filter((_, i) => i !== index))
  const addLine = () => setSteps((rows) => [...rows, 'New micro-step…'])

  const commit = () => {
    const n = onCommit({
      steps,
      energy,
      goalLabel: goal || projectName || 'Project',
    })
    setAdded(n)
    setStep(4)
  }

  return (
    <div
      ref={overlayRef}
      className="export-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Break project into micro-steps"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="export-panel breakdown-panel breakdown-studio">
        <div className="export-panel-header">
          <div>
            <h3 style={{ margin: 0 }}>
              Break down · {projectName || 'Project'}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Close step breakdown"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="breakdown-progress" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`breakdown-dot${step >= i ? ' is-on' : ''}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="breakdown-step">
            <p className="breakdown-lead">Big job → small steps.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(1)}
            >
              Start
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="breakdown-step">
            <label className="field-label" htmlFor="bd-goal">
              Goal
            </label>
            <input
              id="bd-goal"
              className="field-input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What we’re making"
            />
            <label
              className="field-label"
              htmlFor="bd-done"
              style={{ marginTop: '0.65rem' }}
            >
              Done enough
            </label>
            <textarea
              id="bd-done"
              className="field-textarea"
              rows={2}
              value={done}
              onChange={(e) => setDone(e.target.value)}
              placeholder={'What “done” looks like'}
            />
            <div className="breakdown-nav">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep(0)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!goal.trim()}
                onClick={() => setStep(2)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="breakdown-step">
            <p className="field-label">Depth</p>
            <div className="breakdown-depth-list">
              {BREAKDOWN_DEPTHS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`breakdown-depth${
                    depth === d.id ? ' is-active' : ''
                  }`}
                  onClick={() => setDepth(d.id)}
                >
                  <strong>{d.label}</strong>
                </button>
              ))}
            </div>
            <label className="field-label" htmlFor="bd-energy">
              Energy
            </label>
            <select
              id="bd-energy"
              className="palette-bg-select"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="med">Medium</option>
              <option value="high">High</option>
            </select>
            <div className="breakdown-nav">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={buildPreview}
              >
              Build step list
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="breakdown-step">
            <p className="field-label">Edit steps</p>
            <ul className="breakdown-edit-list">
              {steps.map((line, i) => (
                <li key={i}>
                  <span className="breakdown-edit-num">{i + 1}</span>
                  <input
                    className="field-input"
                    value={line}
                    onChange={(e) => updateLine(i, e.target.value)}
                    aria-label={`Micro-step ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeLine(i)}
                    aria-label={`Remove step ${i + 1}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={addLine}
            >
              Add step
            </button>
            <div className="breakdown-nav">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!steps.some((s) => s.trim())}
                onClick={commit}
              >
            Add {steps.filter((s) => s.trim()).length} to{' '}
            {labelForStepId('sketch')}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="breakdown-step">
            <p className="session-done" style={{ marginTop: 0 }}>
              +{added} steps · do #1 only
            </p>
            <div className="breakdown-nav">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onRestart}
              >
            Break down another task
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onFinish}
              >
            Start first step
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
