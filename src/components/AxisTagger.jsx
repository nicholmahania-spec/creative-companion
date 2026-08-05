import { AXES } from '../lib/brand/alignment'

/**
 * Place one thing on the five rulers.
 *
 * Used for both sides of the comparison — a strategy word ("warm") and a
 * candidate typeface — because they have to live in the same space to be
 * comparable at all.
 *
 * Every axis starts UNSET, and unset is a real answer that survives being
 * left alone. That is deliberate: a slider parked at the middle by default
 * would silently assert "neither formal nor casual" about every word the
 * designer never touched, which is precisely the invented strategy the
 * whole module refuses. The clear button gets an axis back to unset,
 * because a control you cannot undo is a trap.
 */
export default function AxisTagger({ value = {}, onChange, idPrefix }) {
  const set = (axisId, next) => onChange?.({ ...value, [axisId]: next })

  return (
    <ul className="tagger-rows">
      {AXES.map((axis) => {
        const raw = value?.[axis.id]
        const unset = raw === null || raw === undefined || raw === ''
        const id = `${idPrefix}-${axis.id}`
        return (
          <li key={axis.id} className="tagger-row">
            <label className="tagger-axis" htmlFor={id}>
              {axis.label}
            </label>
            <span className="tagger-pole">{axis.low}</span>
            <input
              id={id}
              className="tagger-range"
              type="range"
              min="0"
              max="100"
              step="5"
              /* An unset axis parks the thumb in the middle but is NOT
                 recorded as 0.5 — the value only becomes real when the
                 designer moves it. */
              value={unset ? 50 : Math.round(Number(raw) * 100)}
              onChange={(e) => set(axis.id, Number(e.target.value) / 100)}
              aria-describedby={`${id}-state`}
            />
            <span className="tagger-pole tagger-pole-high">{axis.high}</span>
            <span className="tagger-state" id={`${id}-state`}>
              {unset ? 'not said' : ''}
            </span>
            <button
              type="button"
              className="tagger-clear"
              onClick={() => set(axis.id, null)}
              disabled={unset}
              aria-label={`Clear ${axis.label}`}
            >
              clear
            </button>
          </li>
        )
      })}
    </ul>
  )
}
