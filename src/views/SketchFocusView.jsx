/**
 * 04 // Sketch — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Task capture and prioritization: capture tasks, then set priority via
 * now/upnext lanes with keyboard shortcuts (1/2/3 to promote).
 *
 * NOTE: styling uses the semantic `.focus-*` tokens in src/index.css —
 * this app ships no Tailwind. Each state renders a single FocusShell
 * (no nesting) so there is exactly one header + progress bar on screen.
 */
import { useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'

export default function SketchFocusView({ deskTasks, projectId, setActiveView }) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const reorderOpenTasks = useAppStore((s) => s.reorderOpenTasks)
  const addTask = useAppStore((s) => s.addTask)

  const openTasks = (deskTasks || []).filter((t) => !t.completed)
  const [draft, setDraft] = useState('')

  const nowTask = openTasks[0] || null
  const upNext = openTasks.slice(1, 4)

  const exitFocus = () => setActiveView?.('flow')

  // Empty state — capture a task first
  if (!nowTask && !draft && openTasks.length === 0) {
    return (
      <FocusShell
        stepLabel="04 // Sketch"
        stepIndex={0}
        stepCount={2}
        onBack={exitFocus}
      >
        <FocusCard cardKey="capture">
          <p className="focus-prompt">What's the one thing to sketch?</p>
          <input
            className="focus-input-inline"
            style={{ display: 'block', width: '100%' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Homepage layout exploration"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                addTask({ title: draft.trim(), projectId: projectId || null })
                setDraft('')
              }
            }}
          />
          <div className="focus-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!draft.trim()}
              onClick={() => {
                if (draft.trim()) {
                  addTask({ title: draft.trim(), projectId: projectId || null })
                  setDraft('')
                }
              }}
            >
              Add
            </button>
            <button type="button" className="focus-skip-btn" onClick={exitFocus}>
              Exit
            </button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  // Active now task
  if (nowTask) {
    return (
      <FocusShell
        stepLabel="04 // Sketch"
        stepIndex={1}
        stepCount={2}
        onBack={exitFocus}
      >
        <FocusCard cardKey={`now-${nowTask.id}`}>
          <p className="focus-hint">Now</p>
          <p className="focus-prompt" style={{ textAlign: 'center' }}>{nowTask.title}</p>
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => toggleTask(nowTask.id)}
            >
              {nowTask.completed ? 'Undo' : 'Done ✓'}
            </button>
          </div>
          {upNext.length > 0 && (
            <>
              <p className="focus-hint" style={{ marginTop: '2rem' }}>Up next — tap to promote</p>
              <div className="focus-chip-row">
                {upNext.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    className="focus-chip"
                    onClick={() => reorderOpenTasks([t.id, ...openTasks.filter((x) => x.id !== t.id).map((x) => x.id)])}
                  >
                    {i + 1} · {t.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </FocusCard>
      </FocusShell>
    )
  }

  // All done
  return (
    <FocusShell stepLabel="04 // Sketch" stepIndex={2} stepCount={2}>
      <div className="focus-card" style={{ textAlign: 'center' }}>
        <p className="focus-prompt">All tasks captured</p>
        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => setActiveView?.('brand')}>
            Next · Design
          </button>
        </div>
      </div>
    </FocusShell>
  )
}
