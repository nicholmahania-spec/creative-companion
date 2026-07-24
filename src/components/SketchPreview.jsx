import { useMemo, memo } from 'react'

const SketchPreview = memo(({ tasks = [], nowId = null, loading = false, error = null }) => {
  const now = useMemo(() => tasks.find(t => t.id === nowId) || null, [tasks, nowId])

  const upNext = useMemo(
    () =>
      tasks
        .filter(t => t.id !== nowId && t.meta && !isNaN(parseInt(t.meta)))
        .sort((a, b) => (parseInt(a.meta) || 0) - (parseInt(b.meta) || 0)),
    [tasks, nowId]
  )

  const unranked = useMemo(
    () => tasks.filter(t => t.id !== nowId && (!t.meta || isNaN(parseInt(t.meta)))),
    [tasks, nowId]
  )

  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
  }), [tasks])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading sketch data</p>
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
          <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading sketch data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No tasks yet</p>
            <p className="text-sm mt-2">Start by capturing your first idea</p>
          </div>
        </div>
      </div>
    )
  }

  const queue = [...upNext, ...unranked]

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Capture and prioritize your ideas
        </p>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Done</p>
            <p className="text-lg font-semibold">{stats.completed}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Pending</p>
            <p className="text-lg font-semibold">{stats.pending}</p>
          </div>
        </div>

        {now && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="font-medium mb-2">Now Working On:</p>
            <div className="bg-muted/50 rounded p-3">
              <p className="font-semibold">{now.title}</p>
              {now.energy && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full mt-1 ${
                    now.energy === 'high'
                      ? 'bg-red-100 text-red-800'
                      : now.energy === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {now.energy}
                </span>
              )}
            </div>
          </div>
        )}

        {queue.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="font-medium mb-2">Up Next:</p>
            <div className="space-y-2">
              {queue.slice(0, 4).map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <p className="text-sm font-medium truncate flex-1">{task.title}</p>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    #{i + 1}
                  </span>
                </div>
              ))}
              {queue.length > 4 && (
                <p className="text-center text-muted-foreground text-xs">
                  And {queue.length - 4} more…
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default SketchPreview
