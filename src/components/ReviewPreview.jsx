import { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { packReadiness } from '../lib/exportFiles'
import { isFeedbackAiConfigured, translateFeedback } from '../lib/feedbackAi'
import Button from './ui/Button'

const ReviewPreview = ({
  activeProject,
  buildCurrentBrandPack,
  loading = false,
  error = null
}) => {
  // Handle error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Review feedback and identify gaps
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading review data</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Unknown error'}
            </p>
            <button
              onClick={() => {
                // In a real app, this would trigger a refetch
                // For now, we'll just console.log as state comes from store
                console.log('Retry requested for review data')
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
          <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Review feedback and identify gaps
          </p>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading review data...</p>
          </div>
        </div>
      </div>
    )
  }

  const { brand } = useAppStore((s) => s)
  const { feedbackNotes = '' } = activeProject || {}
  const noteLines = String(feedbackNotes || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const packSnap = buildCurrentBrandPack?.()
  const ready = packSnap ? packReadiness(packSnap) : { checks: [], thin: false, ok: true }

  const [translating, setTranslating] = useState(false)
  const [translation, setTranslation] = useState(null)
  const aiReady = isFeedbackAiConfigured()

  const runTranslate = async (line) => {
    setTranslating(true)
    setTranslation(null)
    const result = await translateFeedback(line)
    setTranslating(false)
    setTranslation(result)
  }

  // Stats
  const totalNotes = noteLines.length

  // Handle empty state
  if ((!activeProject || !feedbackNotes) && !loading && !error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Review Overview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Review feedback and identify gaps
          </p>

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

        {/* Stats overview */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Feedback Notes</p>
              <p className="text-lg font-semibold">{totalNotes}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Readiness Checks</p>
              <p className="text-lg font-semibold">{ready.checks.length}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Blocking Issues</p>
              <p className="text-lg font-semibold text-destructive">
                {ready.checks.filter(c => !c.ok).length}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">AI Assistance</p>
              <p className="text-lg font-semibold">
                {aiReady ? 'Available' : 'Not Configured'}
              </p>
            </div>
          </div>

          {/* Recent feedback snippets */}
          {noteLines.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Recent Feedback:</p>
              <div className="space-y-2">
                {noteLines.slice(0, 3).map((note, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded border-l-2 border-l-[var(--dopamine, #3D5AFE)]">
                    <p className="text-sm text-muted-foreground">{note.substring(0, 100)}{note.length > 100 ? '...' : ''}</p>
                  </div>
                ))}
                {noteLines.length > 3 && (
                  <p className="text-center text-muted-italic mt-2 text-xs">
                    And {noteLines.length - 3} more notes...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Blocking gaps preview */}
          {ready.checks.some(c => !c.ok) && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Attention Needed:</p>
              <div className="space-y-2">
                {ready.checks
                  .filter(c => !c.ok)
                  .slice(0, 3)
                  .map((check) => (
                    <div key={check.id} className="flex items-center gap-3 p-3 bg-red-50 rounded border border-red-200">
                      <div className="flex-shrink-0">
                        <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-red-800">{check.label}</p>
                        <p className="text-sm text-red-600">{check.message || ''}</p>
                      </div>
                    </div>
                  ))}
                {ready.checks.filter(c => !c.ok).length > 3 && (
                  <p className="text-center text-muted-italic mt-2 text-xs">
                    And {ready.checks.filter(c => !c.ok).length - 3} more issues...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Quick Actions</h3>
        <div className="space-y-3">
          {noteLines.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                // Focus on first note
                setTimeout(() => {
                  const firstNoteEl = document.querySelector('.focus-card p:first-child')
                  if (firstNoteEl) firstNoteEl.focus()
                }, 100)
              }}
            >
              Review Feedback ({totalNotes})
            </Button>
          )}
          {ready.checks.some(c => !c.ok) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                // Jump to first blocking gap
                const firstBlocking = ready.checks.find(c => !c.ok)
                if (firstBlocking?.view) {
                  // In a real app, this would navigate to the appropriate view
                  console.log(`Jump to ${firstBlocking.view} to fix: ${firstBlocking.label}`)
                }
              }}
            >
              Fix Blocking Issues ({ready.checks.filter(c => !c.ok).length})
            </Button>
          )}
          {!aiReady && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                // Prompt to set up AI feedback
                alert('AI feedback requires backend setup. Please configure VITE_FEEDBACK_AI_ENDPOINT.')
              }}
            >
              Setup AI Feedback
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReviewPreview