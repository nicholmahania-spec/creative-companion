import { useMemo, useCallback, memo } from 'react'
import useAppStore from '../store/useAppStore'
import { recordMetric, measureTime } from '../lib/performance'

const DefinePreview = memo(({ activeProject, updateDetective, loading = false, error = null }) => {
  // Handle error state
  if (error) {
    return measureTime('DefinePreview_error', () => (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Define your brand's purpose and audience
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading project definition data</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message || 'Unknown error'}
            </p>
            <button
              onClick={() => {
                // In a real app, this would trigger a refetch
                // For now, we'll just console.log as state comes from store
                console.log('Retry requested for project definition data')
              }}
              className="btn btn-outline mt-2"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    ))
  }

  // Handle loading state
  if (loading) {
    return measureTime('DefinePreview_loading', () => (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Define your brand's purpose and audience
          </p>

          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading project definition data...</p>
          </div>
        </div>
      </div>
    ))
  }

  // Handle empty state
  if (!activeProject) {
    return measureTime('DefinePreview_empty', () => (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Define your brand's purpose and audience
          </p>

          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No project data available</p>
            <p className="text-xs mt-2">Define your project in the Define view to begin</p>
          </div>
        </div>
      </div>
    ))
  }

  const detective = activeProject?.detective || {}

  // Format the who field for display
  const whoPrimary = detective.audience?.split(' — ')[0] || detective.whoPrimary || ''
  const whoSecondary = detective.audience?.split(' — ')[1] || ''
  const whoDisplay = whoPrimary && whoSecondary
    ? `${whoPrimary} — ${whoSecondary}`
    : whoPrimary || 'Not set'

  return measureTime('DefinePreview_content', () => (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define your brand's purpose and audience
        </p>

        {/* Goal preview */}
        <div className="space-y-2">
          <p className="font-medium mb-1">Goal:</p>
          <p className="text-lg text-muted-foreground italic">
            "{detective.goal || 'What does this project need to accomplish?'}"
          </p>
        </div>

        {/* Audience preview */}
        <div className="space-y-2">
          <p className="font-medium mb-1">Audience:</p>
          <p className="text-lg text-muted-foreground italic">
            "{whoDisplay || 'Who is this for?'}"
          </p>
        </div>

        {/* Feel preview */}
        <div className="space-y-2">
          <p className="font-medium mb-1">Feel Like:</p>
          <div className="flex flex-wrap gap-2">
            {(detective.feel || '').split(',').map((feeling) => feeling.trim())
              .filter(Boolean)
              .map((feeling, index) => (
                <span key={index} className="px-2 py-1 bg-muted/50 text-xs rounded">
                  {feeling}
                </span>
              ))}
            {!detective.feel && (
              <span className="px-2 py-1 bg-muted/50 text-xs rounded italic">
                Select feeling words
              </span>
            )}
          </div>
        </div>

        {/* Avoid preview */}
        {detective.avoid && (
          <div className="space-y-2">
            <p className="font-medium mb-1">Avoid Feeling Like:</p>
            <p className="text-lg text-muted-foreground italic">
              "{detective.avoid}"
            </p>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="font-medium mb-2">Completion Status:</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Goal</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${detective.goal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {detective.goal ? '✓ Set' : '○ Empty'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Audience</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${whoDisplay ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {whoDisplay ? '✓ Set' : '○ Empty'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Feel</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${detective.feel ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {detective.feel ? '✓ Set' : '○ Empty'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Focus on goal input
                  setTimeout(() => {
                    const goalInput = document.querySelector('.focus-card input[placeholder*="do what"]')
                    if (goalInput) goalInput.focus()
                  }, 100)
                }}
                className="w-full btn btn-outline"
              >
                Define Goal
              </button>
              {!whoPrimary && (
                <button
                  onClick={() => {
                    // Focus on who section
                    setTimeout(() => {
                      const whoRadios = document.querySelectorAll('.focus-chip')
                      if (whoRadios[0]) whoRadios[0].focus()
                    }, 100)
                  }}
                  className="w-full btn btn-outline"
                >
                  Define Audience
                </button>
              )}
              {(!detective.feel || (detective.feel && detective.feel.split(',').filter(f => f.trim()).length < 3)) && (
                <button
                  onClick={() => {
                    // Focus on feel words section
                    setTimeout(() => {
                      const feelChips = document.querySelectorAll('.focus-chip')
                      if (feelChips[0]) feelChips[0].focus()
                    }, 100)
                  }}
                  className="w-full btn btn-outline"
                >
                  Define Feel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ));
  });

export default DefinePreview