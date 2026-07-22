/**
 * 07 // Deliver — Focus Mode (Tactile Minimalist rework, opt-in preview).
 * Format Matrix + auto-naming preview + a single Ship action that runs
 * every selected export in sequence. Uses the app's real export
 * pipeline (runPack/runExport, slugifyFilename) — no new formats, no
 * cloud upload or email (those need a storage/email provider decision
 * that hasn't been made yet, so this stage only does what the app can
 * already do today).
 */
import { useState } from 'react'
import FocusShell from '../components/focus/FocusShell'
import { slugifyFilename, packReadiness } from '../lib/exportFiles'

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

  if (shipped) {
    return (
      <div className="focus-shell">
        <main className="focus-main">
          <div className="focus-card" style={{ textAlign: 'center' }}>
            <p className="focus-prompt">Project delivered.</p>
            <p className="focus-hint" style={{ marginBottom: '1.5rem' }}>
              Your slate is completely clean.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveView?.('home')}
            >
              Start new project
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <FocusShell stepLabel="07 // Deliver" stepIndex={1} stepCount={1}>
      <div className="focus-card" style={{ maxWidth: '30rem' }}>
        <p className="focus-prompt">Select deliverable formats</p>
        <div className="focus-chip-row">
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

        <div className="focus-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.size === 0 || shipping}
            onClick={ship}
          >
            {shipping
              ? 'Shipping…'
              : confirmThin
                ? 'Ship anyway'
                : `Ship ${selected.size} format${selected.size === 1 ? '' : 's'}`}
          </button>
          {confirmThin && (
            <button
              type="button"
              className="focus-skip-btn"
              onClick={() => setConfirmThin(false)}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </FocusShell>
  )
}
