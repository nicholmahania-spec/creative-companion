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
          ) : type.source === 'evidence' && type.samples?.length ? (
            <span className="dir-developing-type-faces is-evidence" aria-hidden="true">
              {type.samples.slice(0, 2).join(' · ')}
              {type.samples.length > 2 ? '…' : ''}
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

/**
 * Family name from a sample label like "Fraunces Bold" for specimen preview.
 * Display only — never written into project type fields.
 */
export function familyFromSampleLabel(label) {
  const s = String(label ?? '').trim()
  if (!s) return ''
  return s
    .replace(/\s+(Bold|Regular|SemiBold|Medium|Light|Black|Thin|Italic)$/i, '')
    .trim()
}

/**
 * Panel lead: incomplete / evidence-only route part owns first attention.
 * Tools stay below (caller). No new data — status + optional material only.
 */
export function DirectionPartLead({
  project,
  title,
  status,
  note,
  testId,
  children,
}) {
  const activeId = project?.activeDirectionId || null
  if (!activeId || !status) return null
  return (
    <div
      className="dir-route-material dir-route-part-lead"
      data-testid={testId || undefined}
    >
      {title ? (
        <p className="field-label" style={{ margin: 0 }}>
          {title}
        </p>
      ) : null}
      <p className="dir-route-part-status" role="status">
        {status}
      </p>
      {children}
      {note ? <p className="dir-route-material-note">{note}</p> : null}
    </div>
  )
}

/**
 * Type sample reactions as visual signals — not an approved pairing.
 */
export function DirectionTypeEvidence({ samples }) {
  const list = (samples || []).filter(Boolean)
  if (!list.length) return null
  return (
    <ul className="dir-route-type-samples" aria-label="Type signals on this route">
      {list.map((label, i) => {
        const family = familyFromSampleLabel(label)
        return (
          <li key={`${label}-${i}`} className="dir-route-type-sample">
            <span
              className="dir-route-type-sample-aa"
              style={family ? { fontFamily: `"${family}", sans-serif` } : undefined}
              aria-hidden="true"
            >
              Aa
            </span>
            <span className="dir-route-type-sample-name">{label}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Frames the existing brand tool when the route part is incomplete, so
 * project defaults are not read as the chosen direction's finished system.
 * Without label/note, children render unwrapped (no extra chrome).
 */
export function DirectionRouteTool({ label, note, testId, children }) {
  if (!label && !note) return children
  return (
    <div className="dir-route-tool" data-testid={testId || undefined}>
      {label ? (
        <p className="field-label dir-route-tool-label" style={{ margin: 0 }}>
          {label}
        </p>
      ) : null}
      {note ? <p className="dir-route-tool-note">{note}</p> : null}
      {children}
    </div>
  )
}
