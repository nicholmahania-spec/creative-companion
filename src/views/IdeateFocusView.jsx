/**
 * 03 // Ideate — Focus Mode (opt-in).
 *
 * Phase A: fill each direction's title one at a time (skips ones already
 * titled). Phase B: head-to-head elimination — Left/Right arrow or tap —
 * down to one chosen direction, written via the same updateDirection /
 * addTask path SparkView's "Send · Sketch" uses.
 *
 * No free-text intent gate (ADHD initiation tax). Single FocusShell.
 * All hooks run before any conditional return (Rules of Hooks).
 */
import { useEffect, useState, useCallback, useRef, Suspense, lazy } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'

const IdeatePreview = lazy(() => import('../components/IdeatePreview'))
// Note: decision logging happens inside updateDirection when chosen:true

function blankDirs() {
  return [
    { id: 'a', label: 'A', title: '', note: '', chosen: false },
    { id: 'b', label: 'B', title: '', note: '', chosen: false },
    { id: 'c', label: 'C', title: '', note: '', chosen: false },
  ]
}

export default function IdeateFocusView({
  directions = [],
  updateDirection,
  addTask,
  projectId,
  setActiveView,
}) {
  const dirs =
    Array.isArray(directions) && directions.length >= 3
      ? directions
      : blankDirs()

  const [titleDraft, setTitleDraft] = useState('')
  const [bracket, setBracket] = useState(null) // [dirA, dirB] or null
  const [contenders, setContenders] = useState(null)
  const [winner, setWinner] = useState(null)
  const [queued, setQueued] = useState(false)
  /** Once true, we already seeded the bracket from titled dirs this session. */
  const bracketSeededRef = useRef(false)

  const untitled = dirs.filter((d) => !String(d.title || '').trim())
  const titled = dirs.filter((d) => String(d.title || '').trim())

  const exitFocus = useCallback(() => setActiveView?.('spark'), [setActiveView])

  const pick = useCallback(
    (chosenDir) => {
      if (!contenders || contenders.length === 0) {
        setWinner(chosenDir)
        setBracket(null)
        setContenders(null)
        return
      }
      setBracket([chosenDir, contenders[0]])
      setContenders(contenders.slice(1))
    },
    [contenders]
  )

  // Seed bracket when all titles are filled and we have not started elimination.
  useEffect(() => {
    if (winner || queued || bracket) return
    if (untitled.length > 0) {
      bracketSeededRef.current = false
      return
    }
    if (bracketSeededRef.current) return
    if (titled.length === 0) return

    bracketSeededRef.current = true
    if (titled.length === 1) {
      setWinner(titled[0])
      setBracket(null)
      setContenders(null)
      return
    }
    setContenders(titled.slice(2))
    setBracket([titled[0], titled[1]])
  }, [untitled.length, titled, winner, queued, bracket])

  // Arrow keys during head-to-head
  useEffect(() => {
    if (!bracket) return undefined
    const onKey = (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      if (e.key === 'ArrowLeft') pick(bracket[0])
      else if (e.key === 'ArrowRight') pick(bracket[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bracket, pick])

  const queueWinner = useCallback(() => {
    if (!winner || queued) return
    // Store updateDirection already logs decision when chosen:true
    updateDirection?.(winner.id, { chosen: true })
    addTask?.({
      id: Date.now() + Math.random(),
      title: `Draft ${winner.label}: ${winner.title}`,
      energy: 'med',
      meta: winner.note || 'Direction option',
      completed: false,
      seeded: false,
      projectId: projectId || null,
      dueDate: '',
    })
    setQueued(true)
  }, [winner, queued, updateDirection, addTask, projectId])

  const commitTitle = useCallback(
    (dir) => {
      const text = titleDraft.trim()
      if (!dir || !text) return
      updateDirection?.(dir.id, { title: text })
      setTitleDraft('')
    },
    [titleDraft, updateDirection]
  )

  const preview = (
    <Suspense
      fallback={
        <div className="focus-hint" style={{ padding: '1rem' }}>
          Loading…
        </div>
      }
    >
      <IdeatePreview directions={dirs} />
    </Suspense>
  )

  // ── Queued ────────────────────────────────────────────
  if (queued && winner) {
    return (
      <FocusShell
        stepLabel="03 // Ideate"
        stepIndex={1}
        stepCount={1}
        onExit={exitFocus}
        showPreviewDrawer
        drawerContent={preview}
      >
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">Direction {winner.label} queued</p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
            {winner.title}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView?.('flow')}
          >
            Next · Sketch
          </button>
        </div>
      </FocusShell>
    )
  }

  // ── Winner confirm ────────────────────────────────────
  if (winner) {
    return (
      <FocusShell
        stepLabel="03 // Ideate"
        stepIndex={1}
        stepCount={1}
        onExit={exitFocus}
        showPreviewDrawer
        drawerContent={preview}
      >
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">Winner: {winner.label}</p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
            {winner.title}
          </p>
          <button type="button" className="btn btn-primary" onClick={queueWinner}>
            Queue this direction
          </button>
        </div>
      </FocusShell>
    )
  }

  // ── Bracket ───────────────────────────────────────────
  if (bracket) {
    return (
      <FocusShell
        stepLabel="03 // Ideate"
        stepIndex={2}
        stepCount={3}
        onExit={exitFocus}
        showPreviewDrawer
        drawerContent={preview}
      >
        <div style={{ width: '100%', maxWidth: '40rem' }}>
          <p className="focus-prompt" style={{ textAlign: 'center' }}>
            Which direction wins?
          </p>
          <div className="focus-vs">
            {bracket.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className="focus-vs-card"
                onClick={() => pick(d)}
              >
                <span className="focus-hint">
                  {i === 0 ? '← Left arrow' : 'Right arrow →'}
                </span>
                <p className="focus-vs-title">
                  {d.label}: {d.title}
                </p>
                {d.note ? <p className="focus-hint">{d.note}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </FocusShell>
    )
  }

  // ── Empty: no dirs at all ─────────────────────────────
  if (titled.length === 0 && untitled.length === 0) {
    return (
      <FocusShell stepLabel="03 // Ideate" stepIndex={0} stepCount={1} onExit={exitFocus}>
        <div className="focus-card">
          <p className="focus-prompt">No directions yet</p>
          <p className="focus-hint">Add A · B · C titles on the main Ideate page first.</p>
          <div className="focus-actions">
            <button type="button" className="btn btn-secondary" onClick={exitFocus}>
              Back to Ideate
            </button>
          </div>
        </div>
      </FocusShell>
    )
  }

  // ── Phase A: title next empty direction ───────────────
  const current = untitled[0]
  if (!current) {
    // Titles full but bracket not seeded yet (effect will run next paint)
    return (
      <FocusShell
        stepLabel="03 // Ideate"
        stepIndex={titled.length}
        stepCount={Math.max(dirs.length, 1)}
        onExit={exitFocus}
        showPreviewDrawer
        drawerContent={preview}
      >
        <div className="focus-card">
          <p className="focus-prompt">Preparing shortlist…</p>
        </div>
      </FocusShell>
    )
  }

  const totalDirs = dirs.length
  const stepIdx = totalDirs - untitled.length

  return (
    <FocusShell
      stepLabel="03 // Ideate"
      stepIndex={stepIdx}
      stepCount={totalDirs}
      onExit={exitFocus}
      showPreviewDrawer
      drawerContent={preview}
    >
      <FocusCard cardKey={current.id}>
        <p className="focus-prompt">Direction {current.label} — one line:</p>
        <input
          className="focus-input-inline"
          style={{ display: 'block', width: '100%' }}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          placeholder="e.g. Bold and playful"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && titleDraft.trim()) commitTitle(current)
          }}
        />
        <div className="focus-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!titleDraft.trim()}
            onClick={() => commitTitle(current)}
          >
            Next
          </button>
        </div>
      </FocusCard>
    </FocusShell>
  )
}
