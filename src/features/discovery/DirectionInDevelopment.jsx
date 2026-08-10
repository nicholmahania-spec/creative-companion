import useAppStore from '../../store/useAppStore'
import { EvidenceFace } from './DirectionEvidence'
import {
  activeDirectionWorkingMaterial,
} from '../../lib/brand/directionWorkingMaterial'
import '../../styles/lazy-directions.css'

/**
 * The route Identity is being made for — provisional working material.
 *
 * ARRIVING WRITES NOTHING. This resolves the active direction's refs and
 * citations for display so Color / Type / Mark open as development of THAT
 * material, not a blank brand with a sticky note. Canonical project fields
 * stay the system of record until explicit Use or edit.
 *
 * NO LETTER. A·B·C are Directions positions only.
 */

const PART_LABEL = { colour: 'Color', type: 'Type', mark: 'Mark' }

function ColourStrip({ hexes }) {
  if (!hexes?.length) return null
  return (
    <span className="dir-developing-swatches" aria-hidden="true">
      {hexes.slice(0, 6).map((h, i) => (
        <i key={`${h}-${i}`} style={{ background: h }} title={h} />
      ))}
    </span>
  )
}

function PartRow({ part, children }) {
  return (
    <li className={`dir-developing-part is-${part.state}`}>
      <span className="dir-developing-part-label">{PART_LABEL[part.slot]}</span>
      <span className="dir-developing-part-body">
        {children}
        <span className="dir-developing-part-summary">{part.summary}</span>
      </span>
      <span className="dir-developing-state">
        {part.state === 'captured'
          ? 'On this route'
          : part.state === 'evidence'
            ? 'Evidence'
            : 'Not yet'}
      </span>
    </li>
  )
}

export default function DirectionInDevelopment({
  project,
  onOpenDirections,
  flashMicro,
}) {
  const setActiveDirection = useAppStore((s) => s.setActiveDirection)
  const moodItems = useAppStore((s) => s.moodItems)

  const working = activeDirectionWorkingMaterial(project, moodItems)
  if (!working) return null

  const { title, note, evidence, colour, type, mark, parts } = working

  return (
    <aside
      className="dir-developing"
      aria-label="Route being developed"
      data-direction-working="true"
    >
      <p className="dir-developing-head">
        <span className="dir-developing-kicker">Making</span>
        <span className="dir-developing-title">{title || 'Untitled route'}</span>
        <button type="button" className="text-link" onClick={onOpenDirections}>
          Directions
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setActiveDirection(working.directionId)
            flashMicro?.('Set aside')
          }}
        >
          Stop
        </button>
      </p>

      {note ? <p className="dir-developing-why">{note}</p> : null}

      <p className="dir-developing-lede">
        Material from this route — develop it into the brand. Nothing below is
        the final system until you Use it or edit it.
      </p>

      <ul className="dir-developing-parts" aria-label="What this route holds">
        <PartRow part={parts.colour}>
          <ColourStrip hexes={colour.hexes} />
        </PartRow>
        <PartRow part={parts.type}>
          {type.source === 'ref' ? (
            <span className="dir-developing-type-faces" aria-hidden="true">
              {[type.heading, type.body].filter(Boolean).join(' · ')}
            </span>
          ) : null}
        </PartRow>
        <PartRow part={parts.mark}>
          {mark.concept?.image ? (
            <img
              className="dir-developing-mark"
              src={mark.concept.image}
              alt=""
            />
          ) : null}
        </PartRow>
      </ul>

      {evidence.length > 0 ? (
        <ul className="dir-developing-ev" aria-label="Cited evidence">
          {evidence.map((item) => (
            <li key={item.key}>
              <EvidenceFace item={item} />
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  )
}

/**
 * “This route points at X · Use”, on the screen that owns X.
 *
 * ONE ROW, IN CONTEXT. Writes through the setter the owning workspace already
 * owns. Colour has no Use caller — applying a palette snapshot writes roles
 * positionally, which stays a parked owner decision.
 */
export function DirectionPartOffer({ project, slot, label, inUse, onUse, children }) {
  const activeId = project?.activeDirectionId || null
  const direction = (project?.directions || []).find((d) => d?.id === activeId)
  if (!direction || !label) return null
  return (
    <div className={`dir-offer${inUse ? ' is-in-use' : ''}`}>
      <span className="dir-offer-text">
        This route points at <b>{label}</b>
      </span>
      {children}
      {inUse ? (
        <span className="dir-offer-state">In use</span>
      ) : (
        <button
          type="button"
          className="text-link"
          onClick={onUse}
          aria-label={`Use this route's ${slot}`}
        >
          Use
        </button>
      )}
    </div>
  )
}

/**
 * Honest empty / evidence-only state when the route has no captured pairing
 * or mark — so Identity does not look finished by accident.
 */
export function DirectionPartGap({ project, message }) {
  const activeId = project?.activeDirectionId || null
  if (!activeId || !message) return null
  return (
    <p className="dir-offer dir-offer-gap" role="status">
      {message}
    </p>
  )
}
