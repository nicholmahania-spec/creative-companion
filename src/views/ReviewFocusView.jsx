/**
 * 06 // Review — Focus Mode (Tactile Minimalist rework, opt-in preview).
 *
 * The blueprint's spec for this stage assumed structured client
 * comments and an AI call to translate vague feedback into checkbox
 * tasks. Neither exists here: the real Review view stores feedback as
 * one free-text blob (feedbackNotes, bullet-appended), not discrete
 * comment objects, and there's no LLM wired up — that needs a
 * provider/key decision that hasn't been made (flagged separately,
 * not built speculatively with a fake call).
 *
 * What's real and buildable: feedbackNotes' bullet lines ARE discrete
 * items once split on newline, and packReadiness's gap list already
 * IS a concrete, actionable checklist (not vague text needing
 * translation) — "Tagline", "★ Starred pictures", etc, each already
 * wired to jump straight to where it's fixed. So this stage keeps the
 * blueprint's "one item at a time, strike it off" momentum, applied to
 * those two real, already-structured lists — notes first, then gaps —
 * instead of building a fake AI call.
 */
import { useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import { packReadiness } from '../lib/exportFiles'

const REVIEW_GAP_SKIP = new Set(['handoff', 'learnings'])

export default function ReviewFocusView({
  activeProject,
  buildCurrentBrandPack,
  setActiveView,
  goSystemSection,
}) {
  const updateBrandField = useAppStore((s) => s.updateBrandField)

  const noteLines = String(activeProject?.feedbackNotes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const [clearedNotes, setClearedNotes] = useState(0)
  const [strike, setStrike] = useState(false)
  const [skippedGaps, setSkippedGaps] = useState(() => new Set())

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
    }, 180)
  }

  const currentNote = noteLines[0]

  if (currentNote) {
    return (
      <FocusShell
        stepLabel="06 // Review"
        stepIndex={clearedNotes}
        stepCount={clearedNotes + noteLines.length}
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
      <FocusShell stepLabel="06 // Review" stepIndex={ready.checks.length - gaps.length} stepCount={ready.checks.length}>
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
    <FocusShell stepLabel="06 // Review" stepIndex={1} stepCount={1}>
      <div className="focus-card" style={{ textAlign: 'center' }}>
        <p className="focus-prompt">All caught up</p>
        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => setActiveView?.('finish')}>
            Next · Deliver
          </button>
        </div>
      </div>
    </FocusShell>
  )
}
