import { useState } from 'react'
import useAppStore from '../store/useAppStore'

const SketchPreview = ({
  tasks = [],
  nowId = null,
  ranked = false,
  loading = false,
  error = null
}) => {
  // Handle error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture and prioritize your ideas
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading sketch data</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Unknown error'}
            </p>
            <button
              onClick={() => {
                // In a real app, this would trigger a refetch
                // For now, we'll just console.log as state comes from store
                console.log('Retry requested for sketch data')
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
          <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture and prioritize your ideas
          </p>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading sketch data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Handle empty state
  if (tasks.length === 0 && !loading && !error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture and prioritize your ideas
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No tasks yet</p>
            <p className="text-sm mt-2">Start by capturing your first idea</p>
          </div>
        </div>
      </div>
    )
  }

  const [draft, setDraft] = useState('')

  // Helper to get current "now" task
  const now = tasks.find(t => t.id === nowId) || null
  // Get ranked (numbered) upnext tasks
  const upNext = tasks
    .filter(t => t.id !== nowId && t.meta && !isNaN(parseInt(t.meta)))
    .sort((a, b) => (parseInt(a.meta) || 0) - (parseInt(b.meta) || 0))
  // Get unranked upnext tasks
  const unrankedUpNext = tasks.filter(
    t => t.id !== nowId && (!t.meta || isNaN(parseInt(t.meta)))
  )

  // Stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const inProgressTasks = now && !now.completed ? 1 : 0
  const pendingTasks = totalTasks - completedTasks

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Sketch Board</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Capture and prioritize your ideas
        </p>

        {/* Stats overview */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Total Tasks</p>
              <p className="text-lg font-semibold">{totalTasks}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold text-success">{completedTasks}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">In Progress</p>
              <p className="text-lg font-semibold">{inProgressTasks}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Pending</p>
              <p className="text-lg font-semibold">{pendingTasks}</p>
            </div>
          </div>

          {/* Current task highlight */}
          {now && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Now Working On:</p>
              <div className="bg-muted/50 rounded p-3">
                <p className="font-semibold">{now.title}</p>
                {now.energy && (
                  <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${now.energy === 'high' ? 'bg-red-100 text-red-800' : now.energy === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                    {now.energy}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick add task input */}
          {!now && totalTasks === 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Get Started:</p>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    // In a real app, this would dispatch to add task
                    setDraft('')
                  }
                }}
                className="w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
                placeholder="What's your first sketch idea?"
              />
              {draft.trim() && (
                <button
                  onClick={() => {
                    // In a real app, this would dispatch to add task
                    setDraft('')
                  }}
                  className="mt-2 btn btn-primary"
                >
                  Add Task
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Task preview */}
      {(now || upNext.length > 0 || unrankedUpNext.length > 0) && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Task Queue</h3>
          {now && (
            <div className="mb-4">
              <p className="font-medium mb-1">Now:</p>
              <div className="bg-[var(--dopamine, #3D5AFE)]/10 rounded p-3">
                <p className="font-semibold">{now.title}</p>
              </div>
            </div>
          )}
          {(upNext.length > 0 || unrankedUpNext.length > 0) && (
            <div className="space-y-3">
              <p className="font-medium mb-1">Up Next:</p>
              <div className="space-y-2">
                {[...upNext, ...unrankedUpNext].slice(0, 5).map((task, index) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 border rounded bg-muted/50 ${index === 0 && now ? 'border-l-4 border-[var(--dopamine, #3D5AFE)]' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{task.title}</p>
                      {task.meta && !isNaN(parseInt(task.meta)) && (
                        <span className="text-xs text-muted">Priority: #{task.meta}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted">
                      {index + 1}
                    </div>
                  </div>
                ))}
                {(upNext.length + unrankedUpNext.length) > 5 && (
                  <p className="text-center text-muted-italic mt-2">
                    And {upNext.length + unrankedUpNext.length - 5} more...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!now && totalTasks === 0 && (
        <div className="border rounded-lg p-4 text-center">
          <p className="text-muted-foreground">No tasks yet</p>
          <p className="text-sm mt-2">Start by capturing your first idea</p>
        </div>
      )}
    </div>
  )
}

export default SketchPreview