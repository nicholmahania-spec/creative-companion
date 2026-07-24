import { memo } from 'react'

const ReviewPreview = memo(({
  activeProject,
  noteLines = [],
  clearedNotes = 0,
  ready,
  aiReady,
  loading = false,
  error = null,
}) => {
  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading review data</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading review data...</p>
          </div>
        </div>
      </div>
    )
  }

  const checks = ready?.checks || []
  const blockingCount = checks.filter(c => !c.ok).length
  const totalNotes = noteLines.length

  if (totalNotes === 0 && blockingCount === 0 && !activeProject) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No review data</p>
            <p className="text-sm mt-2">Complete work in other views to generate feedback for review</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Review feedback and identify gaps
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Addressed</p>
              <p className="text-lg font-semibold">{clearedNotes}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Remaining</p>
              <p className="text-lg font-semibold">{totalNotes}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Readiness Checks</p>
              <p className="text-lg font-semibold">{checks.length}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Blocking</p>
              <p
                className="text-lg font-semibold"
                style={{ color: blockingCount > 0 ? 'var(--text-danger, #dc2626)' : 'inherit' }}
              >
                {blockingCount}
              </p>
            </div>
          </div>

          {totalNotes > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Pending Feedback:</p>
              <div className="space-y-2">
                {noteLines.slice(0, 3).map((note, i) => (
                  <div
                    key={i}
                    className="p-3 bg-muted/50 rounded border-l-2 border-l-[var(--dopamine,#3D5AFE)]"
                  >
                    <p className="text-sm text-muted-foreground">
                      {note.replace(/^•\s*/, '').substring(0, 100)}
                      {note.length > 100 ? '…' : ''}
                    </p>
                  </div>
                ))}
                {totalNotes > 3 && (
                  <p className="text-center text-muted-foreground mt-2 text-xs">
                    And {totalNotes - 3} more notes…
                  </p>
                )}
              </div>
            </div>
          )}

          {blockingCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Attention Needed:</p>
              <div className="space-y-2">
                {checks
                  .filter(c => !c.ok)
                  .slice(0, 3)
                  .map((check) => (
                    <div
                      key={check.id}
                      className="flex items-center gap-3 p-3 bg-red-50 rounded border border-red-200"
                    >
                      <span className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-red-800">{check.label}</p>
                        {check.message && (
                          <p className="text-sm text-red-600">{check.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                {blockingCount > 3 && (
                  <p className="text-center text-muted-foreground mt-2 text-xs">
                    And {blockingCount - 3} more…
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!aiReady && (
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            AI feedback translation is not configured.
            Set <code>VITE_FEEDBACK_AI_ENDPOINT</code> to enable it.
          </p>
        </div>
      )}
    </div>
  )
})

export default ReviewPreview
