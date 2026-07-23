/**
 * 03 // Ideate — Focus Mode (Tactile Minimalist rework, opt-in preview).
 *
 * The blueprint's original spec for this stage was a typography
 * archetype grid + font-pairing showdown — but in this app, type
 * selection is a Design-step decision (DesignView writes
 * typeHeading/typeBody), not an Ideate one. Ideate's real job here is
 * narrowing the three A/B/C directions SparkView already manages, so
 * this stage keeps the blueprint's *interaction pattern* (one prompt
 * at a time, then a fast head-to-head elimination) applied to the
 * data that's actually Ideate's: directions, not fonts.
 *
 * Phase A: fill in each direction's title one at a time (skips ones
 * already titled). Phase B: head-to-head elimination between titled
 * directions — Left/Right arrow or tap picks a winner each round —
 * down to a single chosen direction, written via the same
 * updateDirection/logDecision/addTask calls SparkView's "queue"
 * button uses, so Sketch sees the exact same result either way.
 */
import { useEffect, useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import FocusCard from '../components/focus/FocusCard'
import useAppStore from '../store/useAppStore'
import { decisionFromDirection } from '../lib/decisionLog'
import IdeatePreview from '../components/IdeatePreview'

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
  const logDecision = useAppStore((s) => s.logDecision)
  const dirs = Array.isArray(directions) && directions.length >= 3 ? directions : blankDirs()

  // Intent setting state (phase 4)
  const [intent, setIntent] = useState('')
  const [intentSet, setIntentSet] = useState(false)

  const untitled = dirs.filter((d) => !String(d.title || '').trim())
  const [titleDraft, setTitleDraft] = useState('')
  const [bracket, setBracket] = useState(null) // [dirA, dirB] currently facing off, or null
  // Contenders still alive in the bracket — shrinks by one (the loser)
  // each round. Deriving "who's left" from the full titled list instead
  // would forget earlier eliminations and re-match a beaten direction.
  const [contenders, setContenders] = useState(null)
  const [winner, setWinner] = useState(null)
  const [queued, setQueued] = useState(false)

  // If intent not set, show intent input first (phase 4)
  if (!intentSet) {
    return (
      <FocusShell stepLabel="03 // Ideate" stepIndex={0} stepCount={2}>
        <FocusShell
          stepLabel="03 // Ideate"
          stepIndex={0}
          stepCount={2}
          showPreviewDrawer={true}
          drawerContent={
            <IdeatePreview
              directions={dirs}
            />
          }
        >
          <div className="focus-card">
            <p className="focus-prompt">What do you want to accomplish in your ideation session?</p>
            <input
              className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Explore three different brand directions for the project"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && intent.trim()) {
                  setIntentSet(true)
                }
              }}
            />
            <div className="flex justify-end mt-4">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!intent.trim()}
                onClick={() => {
                  if (intent.trim()) {
                    setIntentSet(true)
                  }
                }}
              >
                Start Ideating
              </button>
            </div>
          </div>
        </FocusShell>
      </FocusShell>
    )
  }

  const pick = (chosenDir) => {
    if (!contenders || contenders.length === 0) {
      setWinner(chosenDir)
      setBracket(null)
      setContenders(null)
    } else {
      setBracket([chosenDir, contenders[0]])
      setContenders(contenders.slice(1))
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!bracket) return
      if (e.key === 'ArrowLeft') pick(bracket[0])
      else if (e.key === 'ArrowRight') pick(bracket[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket])

  const queueWinner = () => {
    if (!winner || queued) return
    updateDirection?.(winner.id, { chosen: true })
    logDecision?.(decisionFromDirection(winner))
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
  }

  if (queued) {
    return (
      <FocusShell stepLabel="03 // Ideate" stepIndex={1} stepCount={1}>
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">Direction {winner.label} queued</p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>{winner.title}</p>
          <button type="button" className="btn btn-primary" onClick={() => setActiveView?.('flow')}>
            Next · Sketch
          </button>
        </div>
      </FocusShell>
    )
  }

  if (winner) {
    return (
      <FocusShell stepLabel="03 // Ideate" stepIndex={1} stepCount={1}>
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">Winner: {winner.label}</p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>{winner.title}</p>
          <button type="button" className="btn btn-primary" onClick={queueWinner}>
            Queue this direction
          </button>
        </div>
      </FocusShell>
    )
  }

  if (bracket) {
    return (
      <FocusShell stepLabel="03 // Ideate" stepIndex={2} stepCount={3}>
        <div style={{ width: '100%', maxWidth: '40rem' }}>
          <p className="focus-prompt" style={{ textAlign: 'center' }}>
            Which direction wins?
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {bracket.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => pick(d)}
                style={{
                  flex: 1,
                  textAlign: 'left',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  minHeight: '10rem',
                }}
              >
                <span className="focus-hint">{i === 0 ? '← Left arrow' : 'Right arrow →'}</span>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', margin: '0.5rem 0' }}>
                  {d.label}: {d.title}
                </p>
                {d.note && <p className="focus-hint">{d.note}</p>}
              </button>
            ))}
          </div>
        </div>
      </FocusShell>
    )
  }

  const current = untitled[0]
  const totalDirs = dirs.length
  const stepIdx = totalDirs - untitled.length

  return (
    <FocusShell stepLabel="03 // Ideate" stepIndex={stepIdx} stepCount={totalDirs}>
      <FocusCard cardKey={current?.id}>
        <p className="focus-prompt">Direction {current?.label} — one line:</p>
        <input
          className="focus-input-inline"
          style={{ display: 'block', width: '100%' }}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          placeholder="e.g. Bold and playful"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && titleDraft.trim()) {
              updateDirection?.(current.id, { title: titleDraft.trim() })
              setTitleDraft('')
            }
          }}
        />
        <div className="focus-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!titleDraft.trim()}
            onClick={() => {
              updateDirection?.(current.id, { title: titleDraft.trim() })
              setTitleDraft('')
            }}
          >
            Next
          </button>
        </div>
      </FocusCard>
    </FocusShell>
  )
}
