/**
 * 04 // Sketch — Focus Mode (Tactile Minimalist rework, opt-in preview).
 *
 * The blueprint's original spec for this stage was a dual intake (QR
 * phone-photo scan vs. a structural-block spawner) — neither exists in
 * this app (no camera/upload pipeline scoped to Sketch, no layout-block
 * canvas), so building either would be new infrastructure, not a UI
 * pass. What Sketch actually is here is a task list (rough-draft
 * steps), and the standard SketchView already does single-task focus
 * ("Now") reasonably well — the one real gap versus the blueprint is
 * the "1-2-3 keyboard priority ranking," which didn't exist anywhere
 * in the store, so this stage adds it for real (reorderOpenTasks)
 * rather than faking it in local component state.
 */
import { useEffect, useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'

export default function SketchFocusView({ deskTasks = [], projectId, setActiveView }) {
  const toggleTask = useAppStore((s) => s.toggleTask)
  const addTask = useAppStore((s) => s.addTask)
  const reorderOpenTasks = useAppStore((s) => s.reorderOpenTasks)

  const [draft, setDraft] = useState('')
  const [ranked, setRanked] = useState(false)

  const open = deskTasks.filter((t) => !t.completed)
  const now = open[0]
  const upNext = open.slice(1, 4)

  useEffect(() => {
    const onKey = (e) => {
      if (!['1', '2', '3'].includes(e.key)) return
      const idx = Number(e.key) - 1
      const target = upNext[idx]
      if (!target) return
      const orderedIds = [target.id, ...open.filter((t) => t.id !== target.id).map((t) => t.id)]
      reorderOpenTasks(orderedIds)
      setRanked(true)
      window.setTimeout(() => setRanked(false), 400)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upNext, open])

  const promote = (target) => {
    const orderedIds = [target.id, ...open.filter((t) => t.id !== target.id).map((t) => t.id)]
    reorderOpenTasks(orderedIds)
    setRanked(true)
    window.setTimeout(() => setRanked(false), 400)
  }

  if (!now) {
    return (
      <FocusShell stepLabel="04 // Sketch" stepIndex={0} stepCount={1}>
        <FocusCard cardKey="add-first">
          <p className="focus-prompt">What's the first sketch step?</p>
          <input
            className="focus-input-inline"
            style={{ display: 'block', width: '100%' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Draft cover option A"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                addTask({
                  id: Date.now() + Math.random(),
                  title: draft.trim(),
                  energy: 'med',
                  meta: '',
                  completed: false,
                  seeded: false,
                  projectId: projectId || null,
                  dueDate: '',
                })
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
                addTask({
                  id: Date.now() + Math.random(),
                  title: draft.trim(),
                  energy: 'med',
                  meta: '',
                  completed: false,
                  seeded: false,
                  projectId: projectId || null,
                  dueDate: '',
                })
                setDraft('')
              }}
            >
              Add
            </button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  return (
    <FocusShell stepLabel="04 // Sketch" stepIndex={0} stepCount={1}>
      <div style={{ width: '100%', maxWidth: '30rem' }}>
        <p className="focus-hint" style={{ textAlign: 'center' }}>Now</p>
        <FocusCard cardKey={now.id}>
          <p className="focus-prompt" style={{ textAlign: 'center' }}>{now.title}</p>
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={() => toggleTask(now.id)}>
              Done
            </button>
            {open.length === 1 && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView?.('brand')}
              >
                Next · Design
              </button>
            )}
          </div>
        </FocusCard>

        {upNext.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <p className="focus-hint" style={{ textAlign: 'center', opacity: ranked ? 1 : 0.7 }}>
              Up next — press 1 / 2 / 3 to bump one to Now
            </p>
            <div className="focus-chip-row" style={{ justifyContent: 'center' }}>
              {upNext.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  className="focus-chip"
                  onClick={() => promote(t)}
                >
                  {i + 1} · {t.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </FocusShell>
  )
}
