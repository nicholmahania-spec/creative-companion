/**
 * Yours only — the parking lot and the private notes.
 *
 * Both exist for the same reason: there was nowhere in this app to put
 * something that is not work. An idea that is not ready either became a task
 * (and therefore a thing you are failing to do) or was lost, and an honest
 * note about a client — “attached to the old blue even though it fights the
 * new direction” — had no home that was not client-facing.
 *
 * Nothing here is ever counted, chased or surfaced anywhere else. There is no
 * badge for parking an idea and no reminder about one you parked. That
 * absence is the feature: the moment the parking lot has a counter attached
 * to it, it stops being a place to put things down.
 *
 * Private is structural, not a promise: buildBrandPackSnapshot copies named
 * fields only, so neither field can reach an export, the portal or the book.
 */
import { useState } from 'react'
import useAppStore from '../store/useAppStore'

export default function YoursOnlyPanel({ project = null }) {
  const parkIdea = useAppStore((s) => s.parkIdea)
  const unparkIdea = useAppStore((s) => s.unparkIdea)
  const updateBrandField = useAppStore((s) => s.updateBrandField)
  const [draft, setDraft] = useState('')

  const parked = Array.isArray(project?.parkingLot) ? project.parkingLot : []

  const park = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    parkIdea(draft)
    setDraft('')
  }

  return (
    <section className="desk-panel desk-yours" aria-label="Yours only">
      <div className="desk-panel-head">
        <span className="desk-eyebrow">Yours only</span>
        <span className="desk-yours-note">Never sent to the client</span>
      </div>

      <form className="desk-park-form" onSubmit={park}>
        <label className="field-label sr-only" htmlFor="park-idea">
          Park an idea
        </label>
        <input
          id="park-idea"
          type="text"
          className="field-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Park an idea for later"
        />
        <button type="submit" className="btn btn-secondary">
          Park
        </button>
      </form>

      {parked.length > 0 && (
        <ul className="desk-park-list">
          {parked.map((i) => (
            <li key={i.id} className="desk-park-item">
              <span className="desk-park-text">{i.text}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => unparkIdea(i.id)}
              >
                Clear
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="field-block">
        <label className="field-label" htmlFor="private-notes">
          Notes to yourself
        </label>
        <textarea
          id="private-notes"
          className="field-input desk-private-notes"
          rows={3}
          value={project?.privateNotes || ''}
          onChange={(e) => updateBrandField('privateNotes', e.target.value)}
          placeholder="What you would not put in an email"
        />
      </div>
    </section>
  )
}
