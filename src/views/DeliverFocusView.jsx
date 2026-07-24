/**
 * 07 // Deliver — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Added: Intent-setting step at start (phase 4 UX consistency).
 * Then proceeds to format selection and shipping as before.
 * Format Matrix + auto-naming preview + a single Ship action that runs
 * every selected export in sequence. Uses the app's real export
 * pipeline (runPack/runExport, slugifyFilename) — no new formats, no
 * cloud upload or email (those need a storage/email provider decision
 * that hasn't been made yet, so this stage only does what the app can
 * already do today).
 */
import { useState, Suspense, lazy } from 'react'
import FocusShell from '../components/focus/FocusShell'
import Button from '../components/ui/Button'
import { slugifyFilename, packReadiness } from '../lib/exportFiles'
const BrandPreview = lazy(() => import('../components/BrandPreview'))

const FORMATS = [
  { id: 'pdf', label: 'Brand Book PDF', suffix: 'brand-book.pdf', default: true },
  { id: 'kit', label: 'Source Kit (zip)', suffix: 'brand-kit.zip', default: true },
  { id: 'print', label: 'Print-Ready PDF', suffix: 'brand-direction.pdf', default: false },
  { id: 'pdf-preview', label: 'Raster Preview', suffix: 'brand-book.png', default: false },
  { id: 'md', label: 'Brief (Markdown)', suffix: 'brief.md', default: false },
]

export default function DeliverFocusView({
  activeProject,
  buildCurrentBrandPack,
  runExport,
  setActiveView,
}) {
  // Intent setting state
  const [intent, setIntent] = useState('')
  const [intentSet, setIntentSet] = useState(false)

  // Original DeliverView state (moved inside intentSet conditional)
  const [selected, setSelected] = useState(
    () => new Set(FORMATS.filter((f) => f.default).map((f) => f.id))
  )
  const [shipping, setShipping] = useState(false)
  const [shipped, setShipped] = useState(false)
  const [confirmThin, setConfirmThin] = useState(false)

  const slug = slugifyFilename(activeProject?.name, 'creative-companion')
  const ready = packReadiness(buildCurrentBrandPack?.())

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runShip = async () => {
    setShipping(true)
    for (const f of FORMATS) {
      if (!selected.has(f.id)) continue
      runExport?.(f.id)
      // Give each download a beat to start before triggering the next —
      // browsers can drop rapid-fire simultaneous downloads.
      await new Promise((r) => setTimeout(r, 350))
    }
    setShipping(false)
    setShipped(true)
  }

  const ship = () => {
    if (selected.size === 0 || shipping) return
    // Same "thin pack" guard as the standard Deliver view — don't let a
    // pack missing tagline/colors/pins go out silently.
    if (ready.thin && !confirmThin) {
      setConfirmThin(true)
      return
    }
    runShip()
  }

  const exitFocus = () => setActiveView?.('finish')

  // If intent not set, show intent input first
  if (!intentSet) {
    return (
      <FocusShell
        stepLabel="07 // Deliver"
        stepIndex={0}
        stepCount={3}
        showPreviewDrawer={false}
        onExit={exitFocus}
      >
        <div className="focus-card">
          <p id="deliver-intent-prompt" className="focus-prompt">What do you want to accomplish in your delivery session?</p>
          <input
            id="deliver-intent-input"
            className="focus-input-inline w-full border border-border rounded-md px-3 py-2 text-base focus-ring focus-ring-accent focus-ring-offset-0"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="e.g., Generate final brand assets and prepare for client handoff"
            autoFocus
            aria-labelledby="deliver-intent-prompt"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && intent.trim()) {
                setIntentSet(true)
              }
            }}
          />
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (intent.trim()) {
                  setIntentSet(true)
                }
              }}
              disabled={!intent.trim()}
            >
              Start Delivery
            </Button>
          </div>
        </div>
      </FocusShell>
    )
  }

  // Main DeliverView logic (only shown after intent is set)
  if (shipped) {
    return (
      <FocusShell stepLabel="07 // Deliver" stepIndex={3} stepCount={3} onExit={exitFocus}>
        <div className="focus-shell">
          <main className="focus-main">
            <div className="focus-card">
              <p className="focus-prompt">Project delivered.</p>
              <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
                Your slate is completely clean.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView?.('home')}
              >
                Start new project
              </Button>
            </div>
          </main>
        </div>
      </FocusShell>
    )
  }

  return (
    <FocusShell
      stepLabel="07 // Deliver"
      stepIndex={1}
      stepCount={3}
      showPreviewDrawer={true}
      onExit={exitFocus}
      drawerContent={
        <div>
          <h3 className="font-semibold mb-4">Brand Preview</h3>
          <Suspense fallback={
            <div className="animate-pulse bg-muted/50 rounded p-4 h-full flex items-center justify-center">
              <div className="space-y-4">
                <div className="h-4 w-32 bg-border rounded"></div>
                <div className="h-4 w-24 bg-border rounded"></div>
                <div className="h-4 w-40 bg-border rounded"></div>
              </div>
            </div>
          }>
            <BrandPreview projectName={activeProject?.name || 'Untitled Project'} />
          </Suspense>
          {selected.size > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Selected Exports</h3>
              <div className="space-y-2">
                {Array.from(selected).map((id) => {
                  const format = FORMATS.find((f) => f.id === id)
                  if (!format) return null
                  return (
                    <div key={id} className="flex justify-between">
                      <span>{format.label}</span>
                      <span className="font-mono">{slug}-{format.suffix}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      }
      onExit={exitFocus}
    >
      <div className="focus-card" style={{ maxWidth: '30rem' }}>
        <p className="focus-prompt">Select deliverable formats</p>
        <div className="focus-chip-row" style={{ flexWrap: 'wrap' }}>
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`focus-chip${selected.has(f.id) ? ' is-selected' : ''}`}
              onClick={() => toggle(f.id)}
              aria-pressed={selected.has(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="focus-hint" style={{ marginTop: '1.5rem' }}>
          Naming convention: {slug}_[type]
        </p>
        <p className="focus-hint">
          Preview: {slug}-{FORMATS.find((f) => selected.has(f.id))?.suffix || 'brand-book.pdf'}
        </p>

        {ready.thin && (
          <p className="focus-hint" style={{ color: 'var(--dopamine, #3D5AFE)' }}>
            Thin pack — missing tagline / colors / ★ pins
          </p>
        )}

        <div className="focus-actions mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={selected.size === 0 || shipping}
            onClick={ship}
          >
            {shipping
              ? 'Shipping…'
              : confirmThin
                ? 'Ship anyway'
                : `Ship ${selected.size} format${selected.size === 1 ? '' : 's'}`}
          </Button>
          {confirmThin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmThin(false)}
              className="ml-2"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </FocusShell>
  )
}