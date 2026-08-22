/**
 * `content-open` — the opening region of an ordinary content page.
 *
 * The sibling of `section-open`. A numbered section announces itself with a
 * full-bleed band; every other page in the book announces itself with a
 * tracked eyebrow. Below that line the two are the same heading, which is why
 * both call `headingBlock` rather than each positioning a title and a rule.
 *
 * Thirteen call sites go through this in the PDF — the three foundation pages,
 * the type character set, the imagery and applications continuations, and all
 * four appendix pages — so it is the most-used region in the book and the one
 * a second renderer needs most.
 *
 * THE KICKER IS UPPERCASED HERE, NOT BY THE RENDERER. Case is a typographic
 * decision, and a renderer that upper-cased on its own would be deciding what
 * the page says. The same reasoning puts `tracking` here as design intent and
 * leaves the platform's own limits to the platform — see the note on the
 * kicker box below.
 *
 * Sizes are CSS pixels at 96dpi, converted by `geometry.px()`, exactly as
 * `brandBookPdf.js` writes them so the two can be read side by side.
 */

import { makeRegion } from '../positioned'
import { BODY_BASELINE, headingBlock } from './headingBlock'

const SPEC = Object.freeze({
  kickerSize: 10.5,
  kickerGap: 10,
  /* DESIGN INTENT, IN EM, UNCAPPED. The design tracks its eyebrows at .16em.
     A PDF reader stops being able to tell tracking from a space somewhere
     above .1em and extracts the line letter by letter, so the PDF renderer
     caps what it draws — but that ceiling is a fact about PDF text extraction,
     not about this design, and a browser has no such limit. Capping here would
     export the PDF's constraint to every other surface. */
  kickerTracking: 0.16,
  titleSize: 32,
})

/**
 * @param {object}   pageSpec  { kicker, title }
 * @param {object}   content   { sub }
 * @param {object}   style     { kicker:{color}, title:{color}, rule:{fill}, sub:{color} }
 * @param {object}   geometry  { margin, contentW, startY, px }
 * @param {Function} measure   (text, {face,size,width}) => string[]
 * @returns {import('../positioned').Region}
 */
export function composeContentOpen(pageSpec, content, style, geometry, measure) {
  const { margin, contentW, startY = 0, px } = geometry || {}
  if (typeof px !== 'function') throw new Error('composeContentOpen: geometry.px is required')
  if (typeof measure !== 'function') throw new Error('composeContentOpen: measure is required')

  const boxes = []
  let y = startY

  const kickerSize = px(SPEC.kickerSize)
  boxes.push({
    id: 'kicker',
    type: 'text',
    lines: [String(pageSpec?.kicker ?? '').toUpperCase()],
    origin: { x: margin, y: y + kickerSize * BODY_BASELINE },
    rect: { x: margin, y, w: contentW, h: kickerSize },
    style: {
      face: 'label',
      size: kickerSize,
      color: style.kicker.color,
      tracking: SPEC.kickerTracking,
    },
    z: 1,
  })
  y += kickerSize * BODY_BASELINE + px(SPEC.kickerGap)

  const head = headingBlock(
    { title: pageSpec?.title, sub: content?.sub },
    style,
    { ...geometry, startY: y },
    measure,
    { titleSize: SPEC.titleSize }
  )
  boxes.push(...head.boxes)

  return makeRegion({ id: 'content-open', boxes, advanceTo: head.advanceTo })
}

export default composeContentOpen
