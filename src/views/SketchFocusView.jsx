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
import Button from '../components/ui/Button'
import SketchPreview from '../components/SketchPreview'

export default function SketchFocusView({ setActiveView }) {
  const [draft, setDraft] = useState('')
  const [tasks, setTasks] = useState([])
  const [nowId, setNowId] = useState(null)
  const [ranked, setRanked] = useState(false)

  // Intent setting state
  const [intent, setIntent] = useState('')
  const [intentSet, setIntentSet] = useState(false)

  // Helper to get current "now" task
  const now = tasks.find((t) => t.id === nowId) || null
  // Get ranked (numbered) upnext tasks
  const upNext = tasks
    .filter((t) => t.id !== nowId && t.meta && !isNaN(parseInt(t.meta)))
    .sort((a, b) => (parseInt(a.meta) || 0) - (parseInt(b.meta) || 0))
  // Get unranked upnext tasks
  const unrankedUpNext = tasks.filter(
    (t) => t.id !== nowId && (!t.meta || isNaN(parseInt(t.meta)))
  )

  const preview = <SketchPreview tasks={tasks} nowId={nowId} ranked={ranked} />

  // Helper functions
  const addTask = (task) => {
    setTasks((prev) => {
      const next = [...prev, task]
      // First capture becomes the active "now" so the user lands on work
      if (!nowId) setNowId(task.id)
      return next
    })
    setDraft('')
  }

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
    // If completing the current now task, advance to next
    if (id === nowId) {
      const next = upNext[0] || unrankedUpNext[0]
      setNowId(next ? next.id : null)
    }
  }

  const promote = (task) => {
    setRanked(true)
    setNowId(task.id)
  }

  // Intent setting step
  if (!intentSet) {
    return (
      <FocusShell
        stepLabel="04 // Sketch"
        stepIndex={0}
        stepCount={2}
        showPreviewDrawer={true}
        drawerContent={preview}
      >
        <div className="focus-card">
          <p className="focus-prompt">What do you want to accomplish in your sketching session?</p>
          <input
            className="focus-input-inline"
            style={{ display: 'block', width: '100%' }}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Explore 3 layout options for the homepage"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && intent.trim()) setIntentSet(true)
            }}
          />
          <div className="focus-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => intent.trim() && setIntentSet(true)}
              disabled={!intent.trim()}
            >
              Start Sketching
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  // Empty — capture the first task
  if (!now && tasks.length === 0) {
    return (
      <FocusShell
        stepLabel="04 // Sketch"
        stepIndex={1}
        stepCount={2}
        showPreviewDrawer={true}
        drawerContent={preview}
      >
        <FocusCard cardKey="empty">
          <p className="focus-prompt">What's on your mind?</p>
          <input
            className="focus-input-inline"
            style={{ display: 'block', width: '100%' }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Capture a task or idea"
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
                  projectId: null,
                  dueDate: '',
                })
              }
            }}
          />
          <div className="focus-actions">
            <Button
              variant="outline"
              size="sm"
              disabled={!draft.trim()}
              onClick={() => {
                if (draft.trim()) {
                  addTask({
                    id: Date.now() + Math.random(),
                    title: draft.trim(),
                    energy: 'med',
                    meta: '',
                    completed: false,
                    seeded: false,
                    projectId: null,
                    dueDate: '',
                  })
                }
              }}
            >
              Add
            </Button>
          </div>
        </FocusCard>
      </FocusShell>
    )
  }

  // Active "now" task + up-next lane
  if (now) {
    return (
      <FocusShell
        stepLabel="04 // Sketch"
        stepIndex={1}
        stepCount={2}
        showPreviewDrawer={true}
        drawerContent={preview}
      >
        <FocusCard cardKey={`now-${now.id}`}>
          <p className="focus-prompt" style={{ textAlign: 'center' }}>
            {now.title}
          </p>
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <Button variant="outline" size="sm" onClick={() => toggleTask(now.id)}>
              {now.completed ? 'Undo' : 'Done'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView?.('brand')}
              className="ml-2"
            >
              Next · Design
            </Button>
          </div>
        </FocusCard>

        {upNext.length + unrankedUpNext.length > 0 && (
          <div style={{ marginTop: '2.5rem' }}>
            <p
              className="focus-hint"
              style={{ textAlign: 'center', opacity: ranked ? 1 : 0.7 }}
            >
              Up next — pick one to bump it to Now
            </p>
            <div className="focus-chip-row" style={{ justifyContent: 'center' }}>
              {[...upNext, ...unrankedUpNext].map((t, i) => (
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
      </FocusShell>
    )
  }

  // All captured / completed — move forward to Design (the next path step)
  return (
    <FocusShell
      stepLabel="04 // Sketch"
      stepIndex={2}
      stepCount={2}
      showPreviewDrawer={true}
      drawerContent={preview}
    >
      <FocusCard cardKey="complete">
        <p className="focus-prompt">All tasks captured</p>
        <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
          {tasks.length} task{tasks.length === 1 ? '' : 's'} ready to sketch
        </p>
        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <Button variant="outline" size="sm" onClick={() => setActiveView?.('brand')}>
            Next · Design
          </Button>
        </div>
      </FocusCard>
    </FocusShell>
  )
}
