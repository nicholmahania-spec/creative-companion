import { memo } from 'react'

const DefinePreview = memo(({ activeProject, loading = false, error = null }) => {
  if (error) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-danger">Error loading project definition data</p>
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
          <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading project definition data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!activeProject) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No project data available</p>
            <p className="text-xs mt-2">Define your project in the Define view to begin</p>
          </div>
        </div>
      </div>
    )
  }

  const detective = activeProject?.detective || {}
  const whoPrimary = detective.audience?.split(' — ')[0] || detective.whoPrimary || ''
  const whoSecondary = detective.audience?.split(' — ')[1] || ''
  const whoDisplay = whoPrimary && whoSecondary
    ? `${whoPrimary} — ${whoSecondary}`
    : whoPrimary || ''
  const feelWords = (detective.feel || '').split(',').map(f => f.trim()).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Project Definition</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define your brand's purpose and audience
        </p>

        <div className="space-y-4">
          <div>
            <p className="font-medium mb-1">Goal</p>
            <p className="text-sm text-muted-foreground italic">
              "{detective.goal || 'What does this project need to accomplish?'}"
            </p>
          </div>

          <div>
            <p className="font-medium mb-1">Audience</p>
            <p className="text-sm text-muted-foreground italic">
              "{whoDisplay || 'Who is this for?'}"
            </p>
          </div>

          {feelWords.length > 0 && (
            <div>
              <p className="font-medium mb-1">Feel Like</p>
              <div className="flex flex-wrap gap-2">
                {feelWords.map((feeling, i) => (
                  <span key={i} className="px-2 py-1 bg-muted/50 text-xs rounded">
                    {feeling}
                  </span>
                ))}
              </div>
            </div>
          )}

          {detective.avoid && (
            <div>
              <p className="font-medium mb-1">Avoid</p>
              <p className="text-sm text-muted-foreground italic">"{detective.avoid}"</p>
            </div>
          )}

          <div className="pt-4 border-t border-border/50">
            <p className="font-medium mb-2">Completion</p>
            <div className="space-y-1">
              {[
                ['Goal', !!detective.goal],
                ['Audience', !!whoDisplay],
                ['Feel', feelWords.length >= 1],
              ].map(([label, done]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${done ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {done ? '✓ Set' : '○ Empty'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default DefinePreview
