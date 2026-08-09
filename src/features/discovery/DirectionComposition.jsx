import { makeRef, refKey } from '../../lib/artifacts/artifactRef'
import {
  COMPOSITION_SLOTS,
  SLOT_HOME,
  artifactChoiceLabel,
  artifactsOfKind,
  directionComposition,
  slotSummary,
} from '../../lib/brand/directionComposition'

/**
 * A direction's three parts, and the two things you can do to them.
 *
 * CHOOSE, DEVELOP, SWAP are separate on purpose. Choosing a direction marks
 * the route — it does not overwrite the project's mark, faces or palette, so a
 * designer can compare three compositions without one of them silently
 * becoming the brand. Developing opens the workspace that owns the part, at
 * the sub-screen that owns it. Swapping repoints a reference and creates no
 * content. This component only does the last two.
 *
 * SWAP USED TO BE HALF A VERB. Every slot could be pointed at the project's
 * mark by id, but palette and type could only ever be pointed at whatever the
 * project held at that moment — so a snapshot captured on A could not be given
 * to B. The picker below lists the snapshots the project already has, which is
 * a swap; "Use current" still takes a new one, which is a capture.
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
  editable = true,
  onCapture,
  onClear,
  onSwap,
  onDevelop,
}) {
  const parts = directionComposition(project, direction)
  const marks = project?.logoConcepts || []
  /* Nothing made yet is not a composition — see captureDirectionFrom. The
     button is disabled rather than hidden so the row still says what it is
     waiting for, and "Develop" next to it is the way to go and make it. */
  const snapshots = {
    palette: artifactsOfKind(project, 'palette'),
    typePairing: artifactsOfKind(project, 'typePairing'),
  }
  const canCapture = {
    palette: (project?.palette || []).length > 0,
    typePairing: !!(
      String(project?.typeHeading || '').trim() ||
      String(project?.typeBody || '').trim()
    ),
  }

  /* A CLOSED CARD IS FOR COMPARING, NOT EDITING. Three labelled rows with a
     picker, a capture link and a Develop link apiece is thirteen controls per
     card and nine of them belong to a route the designer is not working on.
     Closed, the composition is what it looks like; the controls come back the
     moment the route is opened. */
  if (!editable) {
    if (!parts.filled && !parts.empty.length) return null
    return (
      <div className="dir-comp is-quiet" aria-label="What this route is made of">
        {COMPOSITION_SLOTS.map((slot) =>
          parts[slot] ? (
            <span className="dir-quiet-part" key={slot}>
              <Filled slot={slot} artifact={parts[slot]} />
            </span>
          ) : parts.empty.includes(slot) ? (
            <span className="dir-quiet-part is-gone" key={slot}>
              {LABEL[slot]} no longer there
            </span>
          ) : null
        )}
      </div>
    )
  }

  return (
    <div className="dir-comp" role="group" aria-label="Composition">
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
                  aria-label="Mark for this route"
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
                <>
                  {snapshots[slot].length > 0 && (
                    <select
                      className="dir-slot-pick"
                      aria-label={`${LABEL[slot]} for this route`}
                      value={artifact?.id || ''}
                      onChange={(e) =>
                        e.target.value
                          ? onSwap?.(slot, refKey(makeRef(slot, e.target.value)))
                          : onClear?.(slot)
                      }
                    >
                      <option value="">—</option>
                      {snapshots[slot].map((a) => (
                        <option key={a.id} value={a.id}>
                          {artifactChoiceLabel(slot, a)}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    className="text-link"
                    disabled={!canCapture[slot]}
                    onClick={() => onCapture?.(slot)}
                  >
                    Use current
                  </button>
                </>
              )}
              <button
                type="button"
                className="text-link"
                aria-label={`Develop ${LABEL[slot]}`}
                onClick={() => onDevelop?.(SLOT_HOME[slot])}
              >
                Develop
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
