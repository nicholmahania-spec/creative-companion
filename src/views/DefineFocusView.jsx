/**
 * 01 // Define — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Four single-question micro-steps replacing the open multi-field form.
 * Writes into the same detective fields the existing Define view uses
 * (updateDetective), so switching back and forth doesn't lose data.
 */
import { useMemo, useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'

const WHO_PRIMARY = ['Business', 'Consumer', 'Both']
const WHO_SECONDARY = {
  Business: ['B2B', 'B2C', 'Internal team'],
  Consumer: ['Everyday shopper', 'Enthusiast', 'Gift buyer'],
  Both: ['Mixed audience'],
}
const FEEL_WORDS = [
  'Bold', 'Calm', 'Playful', 'Trustworthy', 'Premium', 'Warm',
  'Minimal', 'Energetic', 'Timeless', 'Approachable', 'Confident',
  'Refined', 'Honest', 'Modern', 'Grounded', 'Optimistic',
]

const STEPS = ['goal', 'who', 'feel', 'avoid']

export default function DefineFocusView({
  activeProject,
  updateDetective,
  setActiveView,
}) {
  const detective = activeProject?.detective || {}
  const [stepIdx, setStepIdx] = useState(0)
  const [goalDraft, setGoalDraft] = useState(detective.goal || '')
  const [whoPrimary, setWhoPrimary] = useState('')
  const [feelPicks, setFeelPicks] = useState(
    (detective.feel || '').split(',').map((s) => s.trim()).filter(Boolean)
  )
  const [avoidDraft, setAvoidDraft] = useState(detective.avoid || '')

  const stepId = STEPS[stepIdx]
  const cardKey = `${stepId}-${whoPrimary}`

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1)
    else setActiveView?.('studio')
  }
  const goBack = () => {
    if (whoPrimary && stepId === 'who') {
      setWhoPrimary('')
      return
    }
    if (stepIdx > 0) setStepIdx((i) => i - 1)
  }

  const secondaryChips = useMemo(
    () => (whoPrimary ? WHO_SECONDARY[whoPrimary] || [] : []),
    [whoPrimary]
  )

  return (
    <FocusShell
      stepLabel="01 // Define"
      stepIndex={stepIdx}
      stepCount={STEPS.length}
      onBack={stepIdx > 0 || whoPrimary ? goBack : undefined}
    >
      <FocusCard cardKey={cardKey}>
        {stepId === 'goal' && (
          <div>
            <p className="focus-prompt">
              In one sentence, this project needs to{' '}
              <input
                className="focus-input-inline"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="do what?"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && goalDraft.trim()) {
                    updateDetective('goal', goalDraft.trim())
                    goNext()
                  }
                }}
              />
              .
            </p>
            <div className="focus-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!goalDraft.trim()}
                onClick={() => {
                  updateDetective('goal', goalDraft.trim())
                  goNext()
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {stepId === 'who' && !whoPrimary && (
          <div>
            <p className="focus-prompt">Who&rsquo;s this for?</p>
            <div className="focus-chip-row">
              {WHO_PRIMARY.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="focus-chip"
                  onClick={() => setWhoPrimary(w)}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepId === 'who' && whoPrimary && (
          <div>
            <p className="focus-prompt">Narrow it down:</p>
            <div className="focus-chip-row">
              {secondaryChips.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="focus-chip"
                  onClick={() => {
                    updateDetective('audience', `${whoPrimary} — ${w}`)
                    goNext()
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        {stepId === 'feel' && (
          <div>
            <p className="focus-prompt">
              Pick up to 3 words this should feel like:
            </p>
            <div className="focus-chip-row">
              {FEEL_WORDS.map((w) => {
                const selected = feelPicks.includes(w)
                return (
                  <button
                    key={w}
                    type="button"
                    className={`focus-chip${selected ? ' is-selected' : ''}`}
                    onClick={() => {
                      let next
                      if (selected) {
                        next = feelPicks.filter((x) => x !== w)
                      } else if (feelPicks.length >= 3) {
                        return
                      } else {
                        next = [...feelPicks, w]
                      }
                      setFeelPicks(next)
                      updateDetective('feel', next.join(', '))
                      if (next.length === 3) goNext()
                    }}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
            <p className="focus-hint">{feelPicks.length}/3 selected</p>
          </div>
        )}

        {stepId === 'avoid' && (
          <div>
            <p className="focus-prompt">
              One word this brand should <em>never</em> feel like?
            </p>
            <input
              className="focus-input-inline"
              value={avoidDraft}
              onChange={(e) => setAvoidDraft(e.target.value)}
              placeholder="optional"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateDetective('avoid', avoidDraft.trim())
                  goNext()
                }
              }}
            />
            <div className="focus-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateDetective('avoid', avoidDraft.trim())
                  goNext()
                }}
              >
                Done
              </button>
              <button
                type="button"
                className="focus-skip-btn"
                onClick={goNext}
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </FocusCard>
    </FocusShell>
  )
}
