import { useEffect, useState } from 'react'
import useAppStore from '../store/useAppStore'

const ResearchPreview = ({
  deskMood = [],
  sessionIds = [],
  reviewedIds = new Set(),
  reviewedCount = 0,
  loading = false,
  error = null
}) => {
  const { brand } = useAppStore((s) => s)
  const { moodPins = [] } = brand

  // Calculate stats
  const totalItems = deskMood.length
  const sessionSize = sessionIds.length
  const keptItems = deskMood.filter(item => item.inPack || moodPins.includes(item.id)).length
  const remaining = sessionSize - reviewedCount

  // Get recently kept items for preview (limit to 4 for display)
  const recentKept = deskMood
    .filter(item => item.inPack || moodPins.includes(item.id))
    .slice(0, 4)

  // Handle error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Research Board</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Curating inspiration for your brand direction
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading research data</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Unknown error'}
            </p>
            <button
              onClick={() => {
                // In a real app, this would trigger a refetch
                // For now, we'll just console.log as state comes from store
                console.log('Retry requested for research data')
              }}
              className="btn btn-outline mt-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Research Board</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Curating inspiration for your brand direction
          </p>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading research data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Handle empty state
  if (totalItems === 0 && sessionSize === 0) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Research Board</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Curating inspiration for your brand direction
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No research data available</p>
            <p className="text-xs mt-2">Add images or notes in the Research view to begin curating</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Research Board</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Curating inspiration for your brand direction
        </p>

        {/* Stats overview */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Total Items:</span>
            <span className="font-mono">{totalItems}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>In Session:</span>
            <span className="font-mono">{sessionSize}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Reviewed:</span>
            <span className="font-mono">{reviewedCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Kept (★):</span>
            <span className="font-mono text-[var(--dopamine, #3D5AFE)]">{keptItems}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining:</span>
            <span className="font-mono">{Math.max(0, remaining)}</span>
          </div>
        </div>

        {/* Progress bar */}
        {sessionSize > 0 && (
          <div className="bg-muted/50 rounded-full h-2.5 my-4">
            <div
              className="bg-[var(--dopamine, #3D5AFE)] h-2.5 rounded-full"
              style={{ width: `${(reviewedCount / sessionSize) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Recent keeps preview */}
        {keptItems > 0 && (
          <>
            <p className="font-medium mb-2">Recently Kept:</p>
            <div className="grid grid-cols-2 gap-2">
              {recentKept.map((item, index) => (
                <div
                  key={item.id || index}
                  className="aspect-square bg-muted/50 rounded overflow-hidden flex items-center justify-center"
                >
                  {item.type === 'image' && item.visual ? (
                    <img
                      src={item.visual}
                      alt=""
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="text-center text-xs p-2">
                      {item.note ? (item.note.length > 10 ? item.note.slice(0, 10) + '...' : item.note) : 'Note'}
                    </div>
                  )}
                </div>
              ))}
              {recentKept.length < 4 && Array.from({ length: 4 - recentKept.length }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="aspect-square bg-muted/20 rounded flex items-center justify-center"
                >
                  <span className="text-muted/50 text-xs">—</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Legend */ }
      <div className="text-xs text-muted-foreground">
        <p className="mb-1"><em>●</em> Kept items are starred for your brand pack</p>
        <p><em>→</em> Keep | <em>←</em> Toss</p>
      </div>
    </div>
  )
}

export default ResearchPreview