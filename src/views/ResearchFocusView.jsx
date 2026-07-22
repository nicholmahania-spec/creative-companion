/**
 * 02 // Research — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Curate-only: gathering (upload/URL/note) stays on the standard
 * Research view — this stage takes whatever's already on the board and
 * runs it through a one-at-a-time swipe-card review, separating
 * "collect" from "decide" per the blueprint.
 *
 * Keep = star for the brand pack (toggleMoodPinInPack, max 6 — same
 * cap the standard view enforces). Toss = remove from the board
 * entirely (removeMoodPin). Right arrow / swipe-right = Keep,
 * Backspace / swipe-left = Toss — desktop keyboard and mobile touch
 * both drive the same two actions, per the mobile blueprint's mandate
 * that this stage get a real swipe gesture, not just a mouse-drag
 * standing in for one.
 */
import { useEffect, useRef, useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import useAppStore from '../store/useAppStore'

const SWIPE_COMMIT_PX = 90

export default function ResearchFocusView({ deskMood = [], setActiveView }) {
  const toggleMoodPinInPack = useAppStore((s) => s.toggleMoodPinInPack)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  // Fixed at mount: the review queue is "everything on the board right
  // now," not a live view of deskMood — toss removes an item from
  // deskMood, which would otherwise shrink the denominator mid-review.
  const [sessionIds] = useState(() => deskMood.map((m) => m.id))
  // Permanent record of ids decided this session — a "kept" item stays
  // in deskMood (it's just starred), so the queue can't be derived from
  // deskMood membership alone or a kept-then-later-tossed-elsewhere
  // action would re-queue it as if it were new.
  const [reviewedIds, setReviewedIds] = useState(() => new Set())
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)

  const queue = sessionIds.filter(
    (id) => !reviewedIds.has(id) && deskMood.some((m) => m.id === id)
  )
  const currentId = queue[0]
  const current = deskMood.find((m) => m.id === currentId)
  const reviewedCount = reviewedIds.size

  const commit = (direction) => {
    if (!current) return
    if (direction === 'keep') toggleMoodPinInPack?.(current.id)
    else removeMoodPin?.(current.id)
    setReviewedIds((prev) => new Set(prev).add(current.id))
    setDragX(0)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!current) return
      if (e.key === 'ArrowRight') commit('keep')
      else if (e.key === 'Backspace') commit('toss')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const onPointerDown = (e) => {
    startX.current = e.clientX
    setDragging(true)
  }
  const onPointerMove = (e) => {
    if (!dragging) return
    setDragX(e.clientX - startX.current)
  }
  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    if (dragX > SWIPE_COMMIT_PX) commit('keep')
    else if (dragX < -SWIPE_COMMIT_PX) commit('toss')
    else setDragX(0)
  }

  if (deskMood.length === 0) {
    return (
      <FocusShell stepLabel="02 // Research" stepIndex={0} stepCount={1}>
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">No pictures yet</p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
            Add a few images or notes first — this screen is for deciding
            what stays, not for gathering.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView?.('studio')}
          >
            Go add pictures
          </button>
        </div>
      </FocusShell>
    )
  }

  if (!current) {
    const kept = deskMood.filter((m) => m.inPack)
    return (
      <FocusShell stepLabel="02 // Research" stepIndex={1} stepCount={1}>
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">
            {kept.length} kept, reviewed {reviewedCount} of {sessionIds.length}
          </p>
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveView?.('spark')}
            >
              Next · Ideate
            </button>
          </div>
        </div>
      </FocusShell>
    )
  }

  const rotate = Math.max(-12, Math.min(12, dragX / 12))

  return (
    <FocusShell
      stepLabel="02 // Research"
      stepIndex={reviewedCount}
      stepCount={sessionIds.length}
    >
      <div style={{ width: '100%', maxWidth: '26rem', textAlign: 'center' }}>
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            touchAction: 'pan-y',
            cursor: dragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
            transform: `translateX(${dragX}px) rotate(${rotate}deg)`,
            transition: dragging ? 'none' : 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)',
            minHeight: '20rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: current?.type === 'image' ? 0 : '1.5rem',
          }}
        >
          {current?.type === 'image' && current.visual ? (
            <img
              src={current.visual}
              alt=""
              draggable={false}
              style={{ width: '100%', maxHeight: '24rem', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {current?.note || current?.visual || 'Untitled note'}
            </p>
          )}
        </div>

        <p className="focus-hint" style={{ marginTop: '0.75rem' }}>
          {reviewedCount + 1} of {sessionIds.length} reviewed · ← Backspace toss · Keep →
        </p>

        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-ghost" onClick={() => commit('toss')}>
            ← Toss
          </button>
          <button type="button" className="btn btn-primary" onClick={() => commit('keep')}>
            Keep →
          </button>
        </div>
      </div>
    </FocusShell>
  )
}
