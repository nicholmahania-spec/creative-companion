import { useMemo, useCallback, memo } from 'react'
import { measure } from '../lib/performance'

const IdeatePreview = memo(({ directions = [] }) => {
  // Helper to measure rendering time
  const measureTime = (name, fn) => {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    measure(name, start, end)
    return result
  }

  // Handle empty state
  if (directions.length === 0) {
    return measureTime('IdeatePreview_empty', () => (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Directions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Narrowing your brand directions
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No directions available</p>
            <p className="text-xs mt-2">Add directions in the Ideate view to begin</p>
          </div>
        </div>
      </div>
    ))
  }

  const titled = directions.filter((d) => String(d.title || '').trim())
  const chosen = directions.find((d) => d.chosen)

  return measureTime('IdeatePreview_content', () => (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Directions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Narrowing your brand directions
        </p>

        {/* Stats */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Total:</span>
            <span className="font-mono">{directions.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Titled:</span>
            <span className="font-mono">{titled.length}</span>
          </div>
          {chosen && (
            <div className="flex justify-between text-sm">
              <span>Chosen:</span>
              <span className="font-mono text-[var(--dopamine,#3D5AFE)]">{chosen.label}</span>
            </div>
          )}
        </div>

        {/* Directions list */}
        {titled.length > 0 && (
          <>
            <p className="font-medium mb-4 mt-2">Directions:</p>
            <div className="space-y-2">
              {titled.map((d) => (
                <div
                  key={d.id}
                  className={`border rounded p-2 text-sm ${d.chosen ? 'border-[var(--dopamine,#3D5AFE)]' : 'border-border'}`}
                >
                  <span className="font-semibold">{d.label}:</span> {d.title}
                  {d.chosen && <span className="ml-2 text-[var(--dopamine,#3D5AFE)]">★ chosen</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Winner queued message */}
        {chosen && (
          <p className="text-sm text-muted-foreground mt-4">
            Winner queued: <span className="font-medium">{chosen.title}</span>
          </p>
        )}
      </div>
    </div>
  ))
})

export default IdeatePreview