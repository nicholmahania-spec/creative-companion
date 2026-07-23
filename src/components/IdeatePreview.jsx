const IdeatePreview = ({ directions = [] }) => {
  const titled = directions.filter((d) => String(d.title || '').trim())
  const chosen = directions.find((d) => d.chosen)

  if (directions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">Directions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Narrow down your creative directions
          </p>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-muted-foreground">No directions yet</p>
            <p className="text-sm mt-2">Add directions in the Spark view to begin ideating</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Directions</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Narrow down your creative directions
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">{directions.length}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Titled</p>
              <p className="text-lg font-semibold">{titled.length}</p>
            </div>
          </div>

          {chosen && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Chosen Direction:</p>
              <div className="bg-muted/50 rounded p-3">
                <p className="font-semibold">{chosen.label}: {chosen.title}</p>
                {chosen.note && <p className="text-sm text-muted-foreground mt-1">{chosen.note}</p>}
              </div>
            </div>
          )}

          {titled.length > 0 && !chosen && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-medium mb-2">Candidates:</p>
              <div className="space-y-2">
                {titled.map((d) => (
                  <div key={d.id} className="p-3 bg-muted/50 rounded border-l-2 border-l-[var(--dopamine,#3D5AFE)]">
                    <p className="font-semibold text-sm">{d.label}: {d.title}</p>
                    {d.note && <p className="text-xs text-muted-foreground mt-0.5">{d.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold text-lg mb-2">Status</h3>
        <div className="space-y-2">
          {directions.map((d) => (
            <div key={d.id} className="flex items-center justify-between">
              <span className="text-sm">Direction {d.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${d.chosen ? 'bg-green-100 text-green-800' : d.title ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                {d.chosen ? '✓ Chosen' : d.title ? '○ Titled' : '○ Empty'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IdeatePreview
