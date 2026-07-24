/**
 * 04 // Sketch — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Task capture and prioritization: capture tasks, then set priority via
 * now/upnext lanes with keyboard shortcuts (1/2/3 to promote).
 *
 * Added: Intent-setting step at start (phase 4 UX consistency).
 */
import { useEffect, useState, Suspense, lazy } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import Button from '../components/ui/Button'
const SketchPreview = lazy(() => import('../components/SketchPreview'))

export default function SketchFocusView({ setActiveView }) {
  const [draft, setDraft] = useState('')
  const [tasks, setTasks] = useState([])
  const [nowId, setNowId] = useState(null)
  const [ranked, setRanked] = useState(false)

  // Intent setting state
  const [intent, setIntent] = useState('')
  const [intentSet, setIntentSet] = useState(false)

  // Helper to get current "now" task
  const now = tasks.find(t => t.id === nowId) || null
  // Get ranked (numbered) upnext tasks
  const upNext = tasks
    .filter(t => t.id !== nowId && t.meta && !isNaN(parseInt(t.meta)))
    .sort((a, b) => (parseInt(a.meta) || 0) - (parseInt(b.meta) || 0))
  // Get unranked upnext tasks
  const unrankedUpNext = tasks.filter(
    t => t.id !== nowId && (!t.meta || isNaN(parseInt(t.meta)))
  )

  const exitFocus = () => setActiveView?.('flow')

  // Intent setting step
  if (!intentSet) {
    return (
      <FocusShell
        stepLabel="04 // Sketch"
        stepIndex={0}
        stepCount={2}
        showPreviewDrawer={true}
        onExit={exitFocus}
        drawerContent={
          <Suspense fallback={
            <div className="animate-pulse bg-muted/50 rounded p-4 h-full flex items-center justify-center">
              <div className="space-y-4">
                <div className="h-4 w-32 bg-border rounded"></div>
                <div className="h-4 w-24 bg-border rounded"></div>
                <div className="h-4 w-40 bg-border rounded"></div>
              </div>
            </div>
          }>
            <SketchPreview
              tasks={tasks}
              nowId={nowId}
              ranked={ranked}
            />
          </Suspense>
        }
      >
        <div className="focus-card">
          <p id="sketch-intent-prompt" className="focus-prompt">What do you want to accomplish in your sketching session?</p>
          <input
            id="sketch-intent-input"
            className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Explore 3 layout options for the homepage"
            autoFocus
            aria-labelledby="sketch-intent-prompt"
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
              Start Sketching
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  // Helper functions
  const addTask = (task) => {
    setTasks([...tasks, task])
    setDraft('')
  }

  const toggleTask = (id) => {
    setTasks(
      tasks.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    )
    // If completing the current now task, advance to next
    if (id === nowId) {
      const next = upNext[0] || unrankedUpNext[0]
      setNowId(next ? next.id : null)
    }
  }

  const promote = (task) => {
    // Remove any existing ranking
    const updated = tasks.map(t =>
      t.id === task.id
        ? { ...t, meta: '' }
        : t.meta && !isNaN(parseInt(t.meta))
          ? { ...t, meta: `${parseInt(t.meta) + 1}` }
          : t
    )
    setTasks(updated)
    // If promoted to position 1, make it the now task
    if (parseInt(task.meta || '0') === 1) {
      setNowId(task.id)
    }
  }

  // Main sketch interface
  return (
    <FocusShell stepLabel="04 // Sketch" stepIndex={1} stepCount={2} onExit={exitFocus}>
      {/* Task input when no active task */}
      {!now && tasks.length === 0 && (
        <FocusShell
          stepLabel="04 // Sketch"
          stepIndex={1}
          stepCount={2}
          showPreviewDrawer={true}
          onExit={exitFocus}
          drawerContent={
            <Suspense fallback={
              <div className="animate-pulse bg-muted/50 rounded p-4 h-full flex items-center justify-center">
                <div className="space-y-4">
                  <div className="h-4 w-32 bg-border rounded"></div>
                  <div className="h-4 w-24 bg-border rounded"></div>
                  <div className="h-4 w-40 bg-border rounded"></div>
                </div>
              </div>
            }>
              <SketchPreview
                tasks={tasks}
                nowId={nowId}
                ranked={ranked}
              />
            </Suspense>
          }
        >
          <FocusCard cardKey="empty">
            <p className="focus-prompt">What's on your mind?</p>
            <input
              className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
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
                    projectId: activeProject?.id || useAppStore.getState().currentProjectId,
                    dueDate: '',
                  })
                  setDraft('')
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
                      projectId: activeProject?.id || useAppStore.getState().currentProjectId,
                      dueDate: '',
                    })
                    setDraft('')
                  }
                }}
              >
                Add
              </Button>
            </div>
          </FocusCard>
        </FocusShell>
      )}

      /* Now/upnext view when there is an active task */
      {now && (
        <FocusShell stepLabel="04 // Sketch" stepIndex={1} stepCount={2} showPreviewDrawer={true} onExit={exitFocus} drawerContent={<SketchPreview tasks={tasks} nowId={nowId} ranked={ranked} />}>
          <>
            <FocusCard cardKey={`now-${now.id}`}>
              <p className="focus-prompt" style={{ textAlign: 'center' }}>
                {now.title}
              </p>
              <div className="focus-actions" style={{ justifyContent: 'center' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleTask(now.id)}
                >
                  {now.completed ? 'Undo' : 'Done'}
                </Button>
                {unrankedUpNext.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => promote(now)}
                    className="ml-2"
                  >
                    Next · Design
                  </Button>
                )}
              </div>
            </FocusCard>

            {(upNext.length + unrankedUpNext.length) > 0 && (
              <div style={{ marginTop: '2.5rem' }}>
                <p className="focus-hint" style={{ textAlign: 'center', opacity: ranked ? 1 : 0.7 }}>
                  Up next — press 1 / 2 / 3 to bump one to Now
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
          </>
        </FocusShell>
      )}

      /* Completion state */
      {!now && tasks.length > 0 && (
        <FocusShell stepLabel="04 // Sketch" stepIndex={2} stepCount={2} showPreviewDrawer={true} onExit={exitFocus} drawerContent={<SketchPreview tasks={tasks} nowId={nowId} ranked={ranked} />}>
          <FocusCard cardKey="complete">
            <p className="focus-prompt">All tasks captured</p>
            <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
              {tasks.length} task{tasks.length === 1 ? '' : 's'} ready to sketch
            </p>
            <div className="focus-actions" style={{ justifyContent: 'center' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView?.('studio')}
              >
                Next · Studio
              </Button>
            </div>
          </FocusCard>
        </FocusShell>
      )}
    </FocusShell>
  )
}
