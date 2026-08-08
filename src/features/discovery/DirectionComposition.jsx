import {
  COMPOSITION_SLOTS,
  SLOT_HOME,
  directionComposition,
  slotSummary,
} from '../../lib/brand/directionComposition'

/**
 * A direction's three parts, and the two things you can do to them.
 *
 * CHOOSE, DEVELOP, SWAP are separate on purpose. Choosing a direction marks
 * the route — it does not overwrite the project's mark, faces or palette, so a
 * designer can compare three compositions without one of them silently
 * becoming the brand. Developing opens the workspace that owns the part.
 * Swapping repoints a reference. This component only does the last two.
 */

const LABEL = { mark: 'Mark', typePairing: 'Type', palette: 'Color' }

function Filled({ slot, artifact }) {
  if (slot === 'mark') {
    return artifact.image ? (
      <img className="dir-slot-mark" src={artifact.image} alt="" />
    ) : (
      <span className="dir-slot-text">{slotSummary(slot, artifact)}</span>
    )
  }
  if (slot === 'palette') {
    return (
      <span className="dir-slot-swatches">
        {(artifact.hexes || []).slice(0, 5).map((h, i) => (
          <i key={`${h}-${i}`} style={{ background: h }} />
        ))}
      </span>
    )
  }
  return <span className="dir-slot-text">{slotSummary(slot, artifact)}</span>
}

export default function DirectionComposition({
  project,
  direction,
  onCapture,
  onClear,
  onOpen,
}) {
  const parts = directionComposition(project, direction)
  const marks = project?.logoConcepts || []
  /* Nothing made yet is not a composition — see captureDirectionFrom. The
     button is disabled rather than hidden so the row still says what it is
     waiting for, and "Open" next to it is the way to go and make it. */
  const canCapture = {
    palette: (project?.palette || []).length > 0,
    typePairing: !!(
      String(project?.typeHeading || '').trim() ||
      String(project?.typeBody || '').trim()
    ),
  }

  return (
    <div className="dir-comp" role="group" aria-label={`Direction ${direction.label} composition`}>
      {COMPOSITION_SLOTS.map((slot) => {
        const artifact = parts[slot]
        const lost = parts.empty.includes(slot)
        return (
          <div className="dir-slot" key={slot}>
            <span className="dir-slot-label">{LABEL[slot]}</span>

            <span className="dir-slot-body">
              {artifact ? (
                <Filled slot={slot} artifact={artifact} />
              ) : (
                /* Pointed at something the designer deleted is a different
                   state from never set, and substituting the project's
                   current part would show a composition nobody assembled. */
                <span className="dir-slot-text is-empty">
                  {lost ? 'no longer there' : '—'}
                </span>
              )}
            </span>

            <span className="dir-slot-acts">
              {slot === 'mark' ? (
                <select
                  className="dir-slot-pick"
                  aria-label={`Mark for direction ${direction.label}`}
                  value={artifact?.id || ''}
                  onChange={(e) =>
                    e.target.value
                      ? onCapture?.('mark', e.target.value)
                      : onClear?.('mark')
                  }
                >
                  <option value="">—</option>
                  {marks.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Concept ${i + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  className="text-link"
                  disabled={!canCapture[slot]}
                  onClick={() => onCapture?.(slot)}
                >
                  Use current
                </button>
              )}
              {artifact && slot !== 'mark' && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => onClear?.(slot)}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="text-link"
                onClick={() => onOpen?.(SLOT_HOME[slot].view)}
              >
                Open
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
