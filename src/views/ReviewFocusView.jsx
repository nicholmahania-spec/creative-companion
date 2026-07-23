/**
 * 06 // Review — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Added: Intent-setting step at start (phase 4 UX consistency).
 * Then proceeds to feedback notes review and gap review as before.
 */
import { useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import { packReadiness } from '../lib/exportFiles'
import { isFeedbackAiConfigured, translateFeedback } from '../lib/feedbackAi'
import Button from '../components/ui/Button'

const REVIEW_GAP_SKIP = new Set(['handoff', 'learnings'])

export default function ReviewFocusView({
  activeProject,
  buildCurrentBrandPack,
  setActiveView,
  goSystemSection,
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)

  // Intent setting state
  const [intent, setIntent] = useState('')
  const [intentSet, setIntentSet] = useState(false)

  // Original ReviewView state (moved inside intentSet conditional)
  const noteLines = String(activeProject?.feedbackNotes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const [clearedNotes, setClearedNotes] = useState(0)
  const [strike, setStrike] = useState(false)
  const [skippedGaps, setSkippedGaps] = useState(() => new Set())
  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState(null)
  const aiReady = isFeedbackAiConfigured()

  const runTranslate = async (line) => {
    setTranslating(true)
    setTranslation(null)
    const result = await translateFeedback(line)
    setTranslating(false)
    setTranslation(result)
  }

  const packSnap = buildCurrentBrandPack?.()
  const ready = packReadiness(packSnap)
  const gaps = ready.checks.filter(
    (c) => !REVIEW_GAP_SKIP.has(c.id) && !c.ok && !skippedGaps.has(c.id)
  )

  const jumpGap = (c) => {
    if (c.view === 'studio') setActiveView('studio')
    else if (c.view === 'brand') goSystemSection?.(c.section || 'essentials')
    else if (c.view === 'project') {
      setActiveView('project')
      window.setTimeout(() => document.getElementById('detective-goal')?.focus(), 100)
    } else if (c.view === 'finish') setActiveView('finish')
    else if (c.view) setActiveView(c.view)
  }

  const clearNote = (line) => {
    setStrike(true)
    window.setTimeout(() => {
      const remaining = noteLines.filter((l) => l !== line)
      updateBrandField('feedbackNotes', remaining.join('\n'))
      setClearedNotes((n) => n + 1)
      setStrike(false)
      setTranslation(null)
    }, 180)
  }

  const currentNote = noteLines[0]

  // If intent not set, show intent input first
  if (!intentSet) {
    return (
      <FocusShell stepLabel="06 // Review" stepIndex={0} stepCount={3}>
        <FocusShell
          stepLabel="06 // Review"
          stepIndex={0}
          stepCount={3}
          showPreviewDrawer={false}
        >
          <div className="focus-card">
            <p className="focus-prompt">What do you want to accomplish in your review session?</p>
            <input
              className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Address all client feedback and prepare for delivery"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && intent.trim()) {
                  setIntentSet(true)
                }
              }}
            />
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (intent.trim()) {
                    setIntentSet(true)
                  }
                }}
                disabled={!intent.trim()}
              >
                Start Reviewing
              </Button>
            </div>
          </div>
        </FocusShell>
      </FocusShell>
    )
  }

  // Main ReviewView logic (only shown after intent is set)
  if (currentNote) {
    return (
      <FocusShell
        stepLabel="06 // Review"
        stepIndex={1 + clearedNotes}
        stepCount={3}
      >
        <FocusCard cardKey={currentNote}>
          <p className="focus-hint">Note {clearedNotes + 1} of {clearedNotes + noteLines.length}</p>
          <p
            className="focus-prompt"
            style={{
              textDecoration: strike ? 'line-through' : 'none',
              color: strike ? 'var(--text-muted)' : 'var(--text-primary)',
              transition: 'color 180ms, text-decoration-color 180ms',
            }}
          >
            {currentNote.replace(/^•\s*/, '')}
          </p>

          {aiReady ? (
            <>
              <div className="focus-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={translating}
                  onClick={() => runTranslate(currentNote.replace(/^•\s*/, ''))}
                >
                  {translating ? 'Translating…' : 'Translate to checklist'}
                </button>
              </div>
              {translation?.ok && translation.ambiguous && (
                <p className="focus-hint" style={{ color: 'var(--dopamine, #3D5AFE)' }}>
                  ⚠ Ambiguous feedback — consider asking for clarification
                </p>
              )}
              {translation?.ok && translation.tasks.length > 0 && (
                <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none' }}>
                  {translation.tasks.map((t) => (
                    <li key={t} className="focus-hint" style={{ color: 'var(--text-primary)' }}>
                      ☐ {t}
                    </li>
                  ))}
                </ul>
              )}
              {translation && !translation.ok && (
                <p className="focus-hint">Couldn't translate that one — address it as-is.</p>
              )}
            </>
          ) : (
            <p className="focus-hint">
              AI translation isn't set up yet — this line is just the raw note.
            </p>
          )}

          <div className="focus-actions">
            <button type="button" className="btn btn-primary" onClick={() => clearNote(currentNote)}>
              Addressed
            </button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  const currentGap = gaps[0]

  if (currentGap) {
    return (
      <FocusShell stepLabel="06 // Review" stepIndex={2} stepCount={3}>
        <FocusCard cardKey={currentGap.id}>
          <p className="focus-hint">Gap</p>
          <p className="focus-prompt">{currentGap.label}</p>
          <div className="focus-actions">
            <button type="button" className="btn btn-primary" onClick={() => jumpGap(currentGap)}>
              Fix now
            </button>
            <button
              type="button"
              className="focus-skip-btn"
              onClick={() => setSkippedGaps((s) => new Set(s).add(currentGap.id))}
            >
              Skip
            </button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  return (
    <FocusShell stepLabel="06 // Review" stepIndex={3} stepCount={3}>
      <div className="focus-card" style={{ textAlign: 'center' }}>
        <p className="focus-prompt">All caught up</p>
        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView?.('finish')}
          >
            Next · Deliver
          </Button>
        </div>
      </div>
    </FocusShell>
  )
}