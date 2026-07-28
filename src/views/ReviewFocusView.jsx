/**
 * 06 // Review — Focus Mode (opt-in).
 * Notes → gaps → done. Preview via FocusShell drawer (no fixed side panel).
 */
import { useState, Suspense, lazy } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import { packReadiness } from '../lib/exportFiles'
import { isFeedbackAiConfigured, translateFeedback } from '../lib/feedbackAi'

const ReviewPreview = lazy(() => import('../components/ReviewPreview'))

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
  /** Soft archive of last addressed line — undo restores it. */
  const [lastRemoved, setLastRemoved] = useState(null)
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
      const idx = noteLines.indexOf(line)
      const remaining =
        idx >= 0
          ? noteLines.filter((_, i) => i !== idx)
          : noteLines.filter((l) => l !== line)
      setLastRemoved(line)
      updateBrandField('feedbackNotes', remaining.join('\n'))
      setClearedNotes((n) => n + 1)
      setStrike(false)
      setTranslation(null)
    }, 180)
  }

  const undoLastRemoved = () => {
    if (!lastRemoved) return
    const next = [lastRemoved, ...noteLines].join('\n')
    updateBrandField('feedbackNotes', next)
    setLastRemoved(null)
    setClearedNotes((n) => Math.max(0, n - 1))
  }

  const currentNote = noteLines[0]
  const exitFocus = () => setActiveView?.('review')

  const drawerContent = (
    <Suspense
      fallback={
        <p className="focus-hint" style={{ padding: 'var(--space-4)' }}>
          Loading preview…
        </p>
      }
    >
      <ReviewPreview
        activeProject={activeProject}
        buildCurrentBrandPack={buildCurrentBrandPack}
        clearedNotes={clearedNotes}
        noteLines={noteLines}
        skippedGaps={skippedGaps}
        translating={translating}
        translation={translation}
        aiReady={aiReady}
        runTranslate={runTranslate}
        packSnap={packSnap}
        ready={ready}
        goSystemSection={goSystemSection}
        setSkippedGaps={setSkippedGaps}
        setTranslating={setTranslating}
        setTranslation={setTranslation}
        updateBrandField={updateBrandField}
        setClearedNotes={setClearedNotes}
        setStrike={setStrike}
      />
    </Suspense>
  )

  if (currentNote) {
    return (
      <FocusShell
        stepLabel="06 // Review"
        stepIndex={1 + clearedNotes}
        stepCount={3}
        showPreviewDrawer
        drawerContent={drawerContent}
        onExit={exitFocus}
      >
        <FocusCard cardKey={currentNote}>
          <p className="focus-hint">
            Note {clearedNotes + 1} of {clearedNotes + noteLines.length}
          </p>
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
                <p className="focus-hint">
                  Ambiguous feedback — consider asking for clarification
                </p>
              )}
              {translation?.ok && translation.tasks.length > 0 && (
                <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none' }}>
                  {translation.tasks.map((t) => (
                    <li key={t} className="focus-hint">
                      ☐ {t}
                    </li>
                  ))}
                </ul>
              )}
              {translation && !translation.ok && (
                <p className="focus-hint">
                  Couldn&apos;t translate that one — address it as-is.
                </p>
              )}
            </>
          ) : (
            <p className="focus-hint">
              AI translation isn&apos;t set up yet — this line is just the raw note.
            </p>
          )}

          <div className="focus-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => clearNote(currentNote)}
            >
              Addressed
            </button>
          </div>
          {lastRemoved ? (
            <p className="focus-hint" style={{ marginTop: '0.75rem' }} role="status">
              Moved aside ·{' '}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={undoLastRemoved}
              >
                Undo
              </button>
            </p>
          ) : null}
        </FocusCard>
      </FocusShell>
    )
  }

  const currentGap = gaps[0]

  if (currentGap) {
    return (
      <FocusShell
        stepLabel="06 // Review"
        stepIndex={2}
        stepCount={3}
        showPreviewDrawer
        drawerContent={drawerContent}
        onExit={exitFocus}
      >
        <FocusCard cardKey={currentGap.id}>
          <p className="focus-hint">Gap</p>
          <p className="focus-prompt">{currentGap.label}</p>
          <div className="focus-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => jumpGap(currentGap)}
            >
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
    <FocusShell
      stepLabel="06 // Review"
      stepIndex={3}
      stepCount={3}
      showPreviewDrawer
      drawerContent={drawerContent}
      onExit={exitFocus}
    >
      <div className="focus-card" style={{ textAlign: 'center' }}>
        <p className="focus-prompt">All caught up</p>
        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView?.('finish')}
          >
            Next · Deliver
          </button>
        </div>
      </div>
    </FocusShell>
  )
}
