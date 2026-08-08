/**
 * What the type specimen actually says.
 *
 * THE PROBLEM. Identity's Type screen rendered each face's own NAME set in
 * itself ("Fraunces SemiBold" in Fraunces SemiBold) plus one pangram. That
 * tells you a font loaded. It does not tell you the thing a designer is
 * actually deciding — whether a display face and a body face hold together as
 * a hierarchy, at the sizes real work uses, in the brand's own colors. You
 * cannot judge a pairing from two words.
 *
 * WHY REAL CONTENT, NOT LOREM. The brand's own tagline, promise and
 * positioning are already in the project, and a specimen set in the client's
 * actual sentences is a materially better test than one set in filler: real
 * copy has the brand's word lengths, its capitals, its punctuation. Where a
 * line has not been written yet the fallback is honest and generic rather
 * than inventing a sentence and attributing it to the brand — the same rule
 * `briefWords` and `strategySeed` follow.
 *
 * SIZES ARE THE POINT. The scale below is fixed, not configurable. A
 * configurable scale would be a settings decision billed before any looking
 * happens, and the sizes that matter are the ones the brand book and the
 * touchpoint mocks already draw at.
 */

import { effectiveWord } from './briefWords'

/**
 * The rungs, in the order they are read.
 *
 * `face` says which of the two faces the rung uses — this is the pairing
 * under test, so the split has to be visible and consistent. `px` is a real
 * rendered size, not a token: the question is "does 13px caption still work
 * under a 48px display", and a token would hide the answer behind a name.
 */
export const TYPE_RUNGS = [
  { id: 'display', label: 'Display', px: 44, weight: 700, face: 'heading' },
  { id: 'heading', label: 'Heading', px: 28, weight: 700, face: 'heading' },
  { id: 'subhead', label: 'Subhead', px: 20, weight: 600, face: 'heading' },
  { id: 'body', label: 'Body', px: 16, weight: 500, face: 'body' },
  { id: 'caption', label: 'Caption', px: 13, weight: 500, face: 'body' },
]

const clean = (v) => String(v ?? '').trim()

/** Trim to a length that still reads as a line rather than a paragraph. */
const clip = (v, n) => (v.length > n ? `${v.slice(0, n - 1).trimEnd()}…` : v)

/**
 * Specimen copy for one rung, from the project's own words where they exist.
 *
 * @param {string} rungId
 * @param {object} project
 * @returns {{ text: string, own: boolean }}
 *   `own` is true when the line came from this brand rather than the
 *   fallback — the UI says so, so nobody reads filler as a decision.
 */
export function specimenLine(rungId, project = {}) {
  const name =
    clean(project.detective?.clientName) ||
    clean(project.logoWordmark) ||
    clean(project.name)

  const pick = (value, fallback) => {
    const v = clean(value)
    return v ? { text: v, own: true } : { text: fallback, own: false }
  }

  switch (rungId) {
    case 'display':
      return pick(name, 'Your brand name')
    case 'heading':
      return pick(project.tagline, 'The line people remember')
    case 'subhead':
      /* Promise resolves the client's own brief answer when the designer has
         not overridden it — the same effective value the sheet shows, so the
         specimen and the direction sheet cannot disagree. */
      return pick(
        effectiveWord(project, 'messagingPromise').value,
        'What this brand promises'
      )
    case 'body': {
      const source =
        clean(effectiveWord(project, 'positioning').value) ||
        clean(effectiveWord(project, 'voice').value)
      return source
        ? { text: clip(source, 180), own: true }
        : {
            text:
              'Body copy at reading size, so the pairing is judged where it ' +
              'actually has to work — a paragraph, not a word.',
            own: false,
          }
    }
    case 'caption':
      return pick(
        clean(project.detective?.usp) && clip(project.detective.usp, 70),
        'Caption and small print — the size that fails first'
      )
    default:
      return { text: '', own: false }
  }
}

/**
 * Every rung, resolved, with the face label each one should be set in.
 *
 * @param {object} project
 * @returns {Array<{id,label,px,weight,faceLabel,text,own}>}
 */
export function typeSpecimen(project = {}) {
  const heading = clean(project.typeHeading) || 'Plus Jakarta Sans Bold'
  const body = clean(project.typeBody) || 'Plus Jakarta Sans Regular'
  return TYPE_RUNGS.map((r) => ({
    ...r,
    faceLabel: r.face === 'heading' ? heading : body,
    ...specimenLine(r.id, project),
  }))
}
