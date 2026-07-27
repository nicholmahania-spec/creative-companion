import { useMemo, memo } from 'react'

/**
 * Focus Mode's board summary.
 *
 * Rewritten off Tailwind. Every class in the previous version — `space-y-4`,
 * `text-muted-foreground`, `aspect-square`, `h-2`, `rounded-full`, `font-mono`
 * — resolved to nothing, because this project has no Tailwind: no dependency,
 * no config, no directive. The panel rendered as unstyled text and its
 * progress bar had no height at all, so the one visual signal of how far
 * through a review you were did not exist.
 *
 * The stat table went with it, and not for styling reasons. It listed Total
 * Items / In Session / Reviewed / Kept / Remaining — five numbers, two of
 * which are the same fact twice — for a user who has said plainly that
 * numbers mean nothing to them. What is left to do is the whole message, so
 * that is what this says, in the same grammar the chapter rail already uses.
 */
const ResearchPreview = memo(({
  deskMood = [],
  sessionIds = [],
  reviewedCount = 0,
  loading = false,
  error = null,
}) => {
  const stats = useMemo(() => {
    const kept = deskMood.filter((item) => item.inPack)
    return {
      keptCount: kept.length,
      recentKept: kept.slice(0, 4),
      remaining: Math.max(0, sessionIds.length - reviewedCount),
    }
  }, [deskMood, sessionIds.length, reviewedCount])

  if (error) {
    return (
      <div className="research-preview">
        <h3 className="research-preview-title">Board review</h3>
        <p className="research-preview-error">
          {error.message || 'Could not load the board.'}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="research-preview">
        <h3 className="research-preview-title">Board review</h3>
        <p className="research-preview-note">Loading…</p>
      </div>
    )
  }

  if (deskMood.length === 0 && sessionIds.length === 0) {
    return (
      <div className="research-preview">
        <h3 className="research-preview-title">Board review</h3>
        <p className="research-preview-note">
          Nothing on the board yet — add references in Research first.
        </p>
      </div>
    )
  }

  const sessionSize = sessionIds.length
  const pct = sessionSize > 0
    ? Math.min(100, Math.round((reviewedCount / sessionSize) * 100))
    : 0

  return (
    <div className="research-preview">
      <h3 className="research-preview-title">Board review</h3>

      {/* Named remaining work, not a ratio. "3/12" is a number to decode that
          produces no next action; "3 still to look at" is the action. */}
      <p className="research-preview-status" role="status">
        {stats.remaining > 0
          ? `${stats.remaining} still to look at`
          : 'Everything reviewed'}
      </p>

      {sessionSize > 0 && (
        <div
          className="research-preview-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={sessionSize}
          aria-valuenow={reviewedCount}
          aria-label="Pins reviewed"
        >
          <div
            className="research-preview-bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {stats.keptCount > 0 && (
        <>
          <p className="research-preview-subhead">
            Starred so far
          </p>
          <div className="research-preview-grid">
            {stats.recentKept.map((item, i) => (
              <div
                key={item.id || `kept-${i}`}
                className="research-preview-thumb"
              >
                {item.type === 'image' && item.visual ? (
                  <img src={item.visual} alt="" loading="lazy" />
                ) : (
                  <span className="research-preview-thumb-note">
                    {item.note
                      ? item.note.slice(0, 14) + (item.note.length > 14 ? '…' : '')
                      : 'Note'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="research-preview-note">→ Keep · ← Toss</p>
    </div>
  )
})

export default ResearchPreview
