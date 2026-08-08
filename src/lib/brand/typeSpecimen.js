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

/** Comparison key for "this rung is about to repeat a line already above it". */
const sameLine = (v) => clean(v).toLowerCase().replace(/\s+/g, ' ')

/**
 * Where each rung looks for its words, best first.
 *
 * MORE THAN ONE SOURCE PER RUNG, deliberately. Body used to read positioning
 * and Caption used to read the client's USP, which sounds distinct and is not:
 * `effectiveWord(project, 'positioning')` RESOLVES to `detective.usp` when the
 * designer has not written their own positioning line — which is most projects
 * at the point the type gets chosen. Both rungs landed on the same sentence and
 * the bench quietly stopped testing a hierarchy and started testing whether one
 * sentence renders at two sizes.
 *
 * Every entry is language the project already contains. Nothing here invents
 * brand copy; a rung that runs out of sources says so instead (see below).
 */
const RUNG_SOURCES = {
  display: (p) => [
    clean(p.detective?.clientName) || clean(p.logoWordmark) || clean(p.name),
  ],
  heading: (p) => [clean(p.tagline)],
  subhead: (p) => [
    /* Promise resolves the client's own brief answer when the designer has
       not overridden it — the same effective value the sheet shows, so the
       specimen and the direction sheet cannot disagree. */
    effectiveWord(p, 'messagingPromise').value,
    effectiveWord(p, 'voice').value,
  ],
  body: (p) => [
    effectiveWord(p, 'positioning').value,
    effectiveWord(p, 'messagingProof').value,
    effectiveWord(p, 'voice').value,
  ],
  caption: (p) => [
    clean(p.detective?.usp),
    effectiveWord(p, 'messagingPersonality').value,
    clean(p.detective?.audience),
  ],
}

/** How long each rung's line may run before it stops being a line. */
const RUNG_CLIP = { display: 60, heading: 90, subhead: 120, body: 180, caption: 70 }

/**
 * The stand-in, when the brand has not written anything this rung can use.
 *
 * These are marked `own: false` and the UI says so, so filler is never read as
 * a decision somebody made. They also describe the SIZE rather than pretending
 * to be brand copy, which is what makes an exhausted rung still worth looking
 * at: the hierarchy is legible even where the words are not the brand's.
 */
const RUNG_FALLBACK = {
  display: 'Your brand name',
  heading: 'The line people remember',
  subhead: 'What this brand promises',
  body:
    'Body copy at reading size, so the pairing is judged where it actually ' +
    'has to work — a paragraph, not a word.',
  caption: 'Caption and small print — the size that fails first',
}

/**
 * Specimen copy for one rung, from the project's own words where they exist.
 *
 * @param {string} rungId
 * @param {object} project
 * @param {Set<string>} [taken]
 *   lines already used by the rungs above this one. A candidate that repeats
 *   one is skipped rather than printed twice — an honest placeholder beats a
 *   bench that looks like it is testing two sizes and is testing one line
 *   twice. Omit it to resolve a rung on its own.
 * @returns {{ text: string, own: boolean }}
 *   `own` is true when the line came from this brand rather than the
 *   fallback — the UI says so, so nobody reads filler as a decision.
 */
export function specimenLine(rungId, project = {}, taken) {
  const sources = RUNG_SOURCES[rungId]
  if (!sources) return { text: '', own: false }
  const limit = RUNG_CLIP[rungId] || 180
  for (const raw of sources(project || {})) {
    const v = clean(raw)
    if (!v) continue
    const text = clip(v, limit)
    if (taken?.has(sameLine(text))) continue
    return { text, own: true }
  }
  return { text: RUNG_FALLBACK[rungId] || '', own: false }
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
  /* Resolved in rung order so the larger sizes get first claim on the
     brand's strongest language and the smaller ones fall through, rather
     than the other way round. */
  const taken = new Set()
  return TYPE_RUNGS.map((r) => {
    const line = specimenLine(r.id, project, taken)
    if (line.own) taken.add(sameLine(line.text))
    return {
      ...r,
      faceLabel: r.face === 'heading' ? heading : body,
      ...line,
    }
  })
}
