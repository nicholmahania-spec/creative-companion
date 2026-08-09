import { useEffect, useMemo } from 'react'
import { pinFaceStyle, pinImageUrl } from '../../lib/moodPins'
import { loadBrandFamilies } from '../../lib/book/fontLoader'
import {
  citingDirections,
  evidenceSummary,
} from '../../lib/brand/directionEvidence'
import { directionLetters } from '../../lib/brand/directionLetters'
import '../../styles/lazy-directions.css'

/**
 * The material behind a direction, drawn.
 *
 * WHY THIS EXISTS. Three title fields and three why fields is a form, not a
 * shortlist — and a designer who cannot yet put the thing into words has
 * nothing to work from. Everything here is material the project already holds:
 * a pin from the wall, a sample the designer favorited in the brief. Nothing
 * is generated, nothing is scored, and no trait is read off an image.
 */

/** One piece of material, at whatever size the caller needs. */
export function EvidenceFace({ item }) {
  if (item.missing) {
    return (
      <span className="dir-ev-face is-gone" aria-hidden="true">
        ×
      </span>
    )
  }
  const sample = item.sample
  if (sample?.category === 'type') {
    return (
      <span
        className="dir-ev-face is-type"
        style={{
          fontFamily: `"${sample.family}", serif`,
          fontWeight: sample.weight,
        }}
        aria-hidden="true"
      >
        Aa
      </span>
    )
  }
  if (sample?.category === 'color') {
    return (
      <span
        className="dir-ev-face"
        style={{ background: sample.hex }}
        aria-hidden="true"
      />
    )
  }
  const pin = item.pin || {}
  const url = pinImageUrl(pin)
  if (url) {
    return (
      <span
        className="dir-ev-face"
        style={pinFaceStyle(pin)}
        aria-hidden="true"
      />
    )
  }
  if (pin.type === 'color') {
    return (
      <span
        className="dir-ev-face"
        style={pinFaceStyle(pin)}
        aria-hidden="true"
      />
    )
  }
  return (
    <span className="dir-ev-face is-note" aria-hidden="true">
      {String(evidenceSummary(item)).slice(0, 2)}
    </span>
  )
}

/** Real letterforms, or a comparison between two faces means nothing. */
function useSampleFonts(items) {
  const families = useMemo(
    () =>
      [
        ...new Set(
          items
            .filter((i) => i.sample?.category === 'type')
            .map((i) => i.sample.family)
        ),
      ].join('|'),
    [items]
  )
  useEffect(() => {
    if (families) loadBrandFamilies?.(families.split('|'))
  }, [families])
}

/**
 * What the designer responded to, and which routes it is in.
 *
 * ONE ROUTE IS OPEN AND TAPPING A TILE PUTS THE PIECE IN IT. The first version
 * of this band put three A·B·C toggles on every tile, which asked "is this in
 * A? in B? in C?" once per piece — three binary decisions times however many
 * things the designer kept, all live at once, on the screen whose job is to be
 * looked at. Setting the target once and tapping many pieces asks the question
 * once for the whole session, is one tap rather than a drag or a two-step
 * selection, and needs no gesture that a finger or a keyboard cannot make.
 *
 * A tile already used by a route that is NOT open shows that route's letter.
 * That is the comparison — the same serif in A and B and not in C is a fact
 * about the shortlist no single card can state — and it is letters rather than
 * a count, because ranking routes by how much evidence they carry would be an
 * opinion the material does not hold.
 */
export function EvidenceBand({
  items,
  project,
  openRoute,
  onCite,
  emptyAction,
  observations,
}) {
  useSampleFonts(items)
  const letters = directionLetters(project)

  return (
    <section className="dir-ev-band" aria-labelledby="dir-ev-heading">
      <p className="dir-ev-head">
        <span className="brand-section-label" id="dir-ev-heading">
          What you responded to
        </span>
        {items.length > 0 ? (
          <span className="dir-ev-target">
            {openRoute ? `adding to ${openRoute.letter}` : `${items.length} kept`}
          </span>
        ) : null}
      </p>

      {items.length === 0 ? (
        <p className="dir-ev-empty">
          Nothing kept yet. Tap &hearts; on anything you respond to and it
          shows up here.
          {emptyAction}
        </p>
      ) : (
        <ul className="dir-ev-list">
          {items.map((item) => {
            const cited = citingDirections(project, item.key)
            const label = evidenceSummary(item)
            const inOpen = !!openRoute && cited.includes(openRoute.id)
            const elsewhere = cited
              .filter((id) => id !== openRoute?.id)
              .map((id) => letters[id])
              .filter(Boolean)
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className={`dir-ev-item${inOpen ? ' is-in' : ''}`}
                  aria-pressed={inOpen}
                  disabled={!openRoute}
                  aria-label={
                    openRoute
                      ? `${inOpen ? 'Remove' : 'Add'} ${label} ${
                          inOpen ? 'from' : 'to'
                        } route ${openRoute.letter}`
                      : label
                  }
                  onClick={() => onCite?.(item.key)}
                >
                  <EvidenceFace item={item} />
                  <span className="dir-ev-label">{label}</span>
                  {elsewhere.length ? (
                    <span className="dir-ev-else" aria-hidden="true">
                      {elsewhere.join('')}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* The one sentence the app may say about a pattern, and only when the
          comparisons behind it clear both a share and a margin. Everything
          else on this band is material, not a reading. */}
      {observations?.enough ? (
        <p className="dir-ev-observed">
          <span>Your choices leaned toward</span> {observations.lines.join(' · ')}
        </p>
      ) : null}
    </section>
  )
}

/** The citations on one route, inside its card. */
export function EvidenceStrip({ items, letter, onCite, sayEmpty = true }) {
  useSampleFonts(items)
  if (!items.length) {
    /* Pointing at tiles that are not being drawn is a dead end, and on a fresh
       project it was said once per card. Say nothing instead. */
    if (!sayEmpty) return null
    return <p className="dir-ev-strip is-empty">Tap what belongs here</p>
  }
  return (
    <ul className="dir-ev-strip" aria-label={`Material behind route ${letter}`}>
      {items.map((item) => (
        <li className="dir-ev-cited" key={item.key}>
          <EvidenceFace item={item} />
          <span className="dir-ev-cited-label">{evidenceSummary(item)}</span>
          <button
            type="button"
            className="dir-ev-drop"
            aria-label={`Remove ${evidenceSummary(item)} from route ${letter}`}
            onClick={() => onCite?.(item.key)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
