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
import { useEffect, useRef, useState, Suspense, lazy } from 'react'
import FocusShell from '../components/focus/FocusShell'
import useAppStore from '../store/useAppStore'
import Button from '../components/ui/Button'
const ResearchPreview = lazy(() => import('../components/ResearchPreview'))

const SWIPE_COMMIT_PX = 90

export default function ResearchFocusView({ deskMood = [], setActiveView }) {
  const toggleMoodPinInPack = useAppStore((s) => s.toggleMoodPinInPack)
  const removeMoodPin = useAppStore((s) => s.removeMoodPin)
  const addMoodPin = useAppStore((s) => s.addMoodPin)
  /** Inline, because this view has no toast channel of its own. */
  const [notice, setNotice] = useState('')

  // No intent gate — start curating immediately (ADHD initiation).
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  /* The last tossed pin, kept whole so it can be put back. Toss is a hard
     delete from the store and an uploaded image exists nowhere else, so
     without this a mis-swipe — or a stray Backspace, which is muscle memory
     for "undo my typing" — destroyed a reference permanently and silently.
     Reversibility is also what makes fast triage possible at all: if a wrong
     call costs nothing, the user can move quickly instead of deliberating
     over every card. */
  const [lastTossed, setLastTossed] = useState(null)

  const undoToss = () => {
    if (!lastTossed) return
    addMoodPin?.(lastTossed)
    setReviewedIds((prev) => {
      const next = new Set(prev)
      next.delete(lastTossed.id)
      return next
    })
    setLastTossed(null)
  }

  const commit = (direction) => {
    if (!current) return
    if (direction === 'keep') {
      // The pack caps at 6 and the store REFUSES past it, returning
      // {ok:false}. Discarding that result advanced the card and recorded the
      // pin as decided while nothing had actually been kept — work the user
      // believed was saved, discovered missing later with no way to tell which.
      const r = toggleMoodPinInPack?.(current.id)
      if (r && r.ok === false) {
        setNotice(r.error || 'Six is the max — unstar one to swap')
        return
      }
    } else {
      setLastTossed(current)
      removeMoodPin?.(current.id)
    }
    setNotice('')
    setReviewedIds((prev) => new Set(prev).add(current.id))
    setDragX(0)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (!current) return
      // Never treat Backspace in a text field as "toss pin"
      const tag = e.target?.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        e.target?.isContentEditable
      ) {
        return
      }
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

  const exitFocus = () => setActiveView?.('studio')

  if (deskMood.length === 0) {
    return (
      <FocusShell
        stepLabel="02 // Research"
        stepIndex={1}
        stepCount={2}
        showPreviewDrawer={true}
        onExit={exitFocus}
        drawerContent={
          <Suspense fallback={
            <p className="research-preview-note">Loading board…</p>
          }>
            <ResearchPreview
              deskMood={deskMood}
              sessionIds={sessionIds}
              reviewedIds={reviewedIds}
              reviewedCount={reviewedCount}
              loading={loading}
              error={error}
            />
          </Suspense>
        }
      >
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">No pictures yet</p>
          <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
            Add a few images or notes first — this screen is for deciding
            what stays, not for gathering.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView?.('studio')}
          >
            Go add pictures
          </Button>
        </div>
      </FocusShell>
    )
  }

  if (!current) {
    const kept = deskMood.filter((m) => m.inPack)
    return (
      <FocusShell
        stepLabel="02 // Research"
        stepIndex={2}
        stepCount={2}
        showPreviewDrawer={true}
        onExit={exitFocus}
        drawerContent={
          <Suspense fallback={
            <p className="research-preview-note">Loading board…</p>
          }>
            <ResearchPreview
              deskMood={deskMood}
              sessionIds={sessionIds}
              reviewedIds={reviewedIds}
              reviewedCount={reviewedCount}
              loading={loading}
              error={error}
            />
          </Suspense>
        }
      >
        <div className="focus-card" style={{ textAlign: 'center' }}>
          <p className="focus-prompt">
            {kept.length} kept, reviewed {reviewedCount} of {sessionIds.length}
          </p>
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView?.('spark')}
            >
              Next · Ideate
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  const rotate = Math.max(-12, Math.min(12, dragX / 12))

  return (
    <FocusShell
      stepLabel="02 // Research"
      stepIndex={1 + reviewedCount}
      stepCount={2}
      showPreviewDrawer={true}
      onExit={exitFocus}
      drawerContent={
        <ResearchPreview
          deskMood={deskMood}
          sessionIds={sessionIds}
          reviewedIds={reviewedIds}
          reviewedCount={reviewedCount}
          loading={loading}
          error={error}
        />
      }
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

        {/* What is LEFT, not a ratio. "3 of 12 reviewed" is two numbers to
            subtract before it means anything; the sidebar and the chapter
            rail both dropped this same pattern for the same reason. */}
        <p className="focus-hint" style={{ marginTop: '0.75rem' }}>
          {Math.max(0, sessionIds.length - reviewedCount)} left · ← Backspace toss · Keep →
        </p>

        {notice && (
          <p className="focus-hint" role="status" style={{ marginTop: '0.5rem' }}>
            {notice}
          </p>
        )}

        <div className="focus-actions" style={{ justifyContent: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => commit('toss')}
          >
            ← Toss
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => commit('keep')}
          >
            Keep →
          </Button>
        </div>

        {/* Stays until the next toss replaces it — no timer. A countdown on
            the only route back to a deleted reference is a deadline the user
            cannot perceive, and the whole point is that a wrong swipe costs
            nothing. */}
        {lastTossed && (
          <div className="focus-actions" style={{ justifyContent: 'center' }}>
            <Button variant="ghost" size="sm" onClick={undoToss}>
              Undo toss{lastTossed.note ? ` — ${String(lastTossed.note).slice(0, 28)}` : ''}
            </Button>
          </div>
        )}
      </div>
    </FocusShell>
  )
}
