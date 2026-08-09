import useAppStore from '../../store/useAppStore'
import { directionEvidence } from '../../lib/brand/directionEvidence'
import { EvidenceFace } from './DirectionEvidence'
import '../../styles/lazy-directions.css'

/**
 * The route Identity is being made for.
 *
 * THE HANDOFF DIRECTIONS NEVER HAD. Before this, a route's only reader
 * anywhere downstream was one line on a brand-book page. A designer left
 * Directions having named a route and arrived at Identity with no way to tell
 * which one they were making — the app had the answer and never said it.
 *
 * IT IS MATERIAL, NOT A FORM. An earlier version listed the route's three
 * parts and printed "Not set" against each, which is three unfinished
 * obligations shown before any work has started. What belongs here is what the
 * designer responded to, at a size they can read it at — that is the creative
 * context. The `Use` actions live on the sub-screen that owns each part, where
 * the designer can see what one would replace.
 *
 * NO LETTER. A·B·C are positions on the Directions screen and have no referent
 * here, so the route is named.
 *
 * ARRIVING WRITES NOTHING. This renders; it does not set a field.
 */
export default function DirectionInDevelopment({
  project,
  onOpenDirections,
  flashMicro,
}) {
  const setActiveDirection = useAppStore((s) => s.setActiveDirection)
  const moodItems = useAppStore((s) => s.moodItems)

  const activeId = project?.activeDirectionId || null
  const direction = (project?.directions || []).find((d) => d?.id === activeId)
  if (!direction) return null

  const cited = directionEvidence(direction, moodItems, project?.id)
  const name = String(direction.title || '').trim()

  return (
    <aside className="dir-developing" aria-label="Route being developed">
      <p className="dir-developing-head">
        <span className="dir-developing-kicker">Making</span>
        <span className="dir-developing-title">{name || 'Untitled route'}</span>
        <button type="button" className="text-link" onClick={onOpenDirections}>
          Directions
        </button>
        {/* The state is visible here, so the off switch belongs here. Without
            it the only way to stop was a control on another screen, and in
            practice this would assert a stale route for the project's life. */}
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setActiveDirection(direction.id)
            flashMicro?.('Set aside')
          }}
        >
          Stop
        </button>
      </p>

      {String(direction.note || '').trim() ? (
        <p className="dir-developing-why">{direction.note.trim()}</p>
      ) : null}

      {cited.length > 0 ? (
        <ul className="dir-developing-ev" aria-label="Material behind this route">
          {cited.map((item) => (
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
 * ONE ROW, IN CONTEXT. It sits beside the thing it would replace, so the
 * designer can see the trade before making it, and it writes through the
 * setter the owning workspace already writes through — no second source of
 * truth, and as reversible as any other edit made there.
 *
 * Colour has no caller, deliberately: applying a palette snapshot means
 * writing `paletteTokens` positionally, which is the naming-drift question
 * this repo has parked for an owner decision. Offering it would settle that by
 * accident.
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
