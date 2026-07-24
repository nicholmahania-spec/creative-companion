import { useMemo, memo } from 'react'

const ResearchPreview = memo(({
  deskMood = [],
  sessionIds = [],
  reviewedCount = 0,
  loading = false,
  error = null,
}) => {
  const stats = useMemo(() => {
    const keptItems = deskMood.filter(item => item.inPack).length
    const remaining = Math.max(0, sessionIds.length - reviewedCount)
    const recentKept = deskMood.filter(item => item.inPack).slice(0, 4)
    return { keptItems, remaining, recentKept }
  }, [deskMood, sessionIds.length, reviewedCount])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Research Board</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading research data</p>
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
          <h3 className="font-semibold text-lg mb-2">Research Board</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading research data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (deskMood.length === 0 && sessionIds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Research Board</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No research data available</p>
            <p className="text-xs mt-2">Add images or notes in the Research view to begin</p>
          </div>
        </div>
      </div>
    )
  }

  const sessionSize = sessionIds.length

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Research Board</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Curating inspiration for your brand direction
        </p>

        <div className="space-y-2 text-sm">
          {[
            ['Total Items', deskMood.length],
            ['In Session', sessionSize],
            ['Reviewed', reviewedCount],
            ['Kept (★)', stats.keptItems],
            ['Remaining', stats.remaining],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span>{label}</span>
              <span
                className="font-mono"
                style={label === 'Kept (★)' ? { color: 'var(--dopamine, #3D5AFE)' } : undefined}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {sessionSize > 0 && (
          <div className="bg-muted/50 rounded-full h-2 my-4">
            <div
              className="bg-[var(--dopamine,#3D5AFE)] h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, (reviewedCount / sessionSize) * 100)}%` }}
            />
          </div>
        )}

        {stats.keptItems > 0 && (
          <>
            <p className="font-medium mb-2">Recently Kept:</p>
            <div className="grid grid-cols-2 gap-2">
              {stats.recentKept.map((item, i) => (
                <div
                  key={item.id || `item-${i}`}
                  className="aspect-square bg-muted/50 rounded overflow-hidden flex items-center justify-center"
                >
                  {item.type === 'image' && item.visual ? (
                    <img
                      src={item.visual}
                      alt=""
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-center text-xs p-2 text-muted-foreground">
                      {item.note ? item.note.slice(0, 12) + (item.note.length > 12 ? '…' : '') : 'Note'}
                    </div>
                  )}
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - stats.recentKept.length) }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="aspect-square bg-muted/20 rounded flex items-center justify-center"
                >
                  <span className="text-muted-foreground text-xs">—</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-3">→ Keep · ← Toss</p>
      </div>
    </div>
  )
})

export default ResearchPreview
