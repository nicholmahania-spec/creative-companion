import { normalizeHex } from '../color'
import { decisionLineFromPack } from '../brandSystem'
import { touchpointsFor } from '../journey/touchpoints'

/**
 * The brand book's plan — its pages, their order, their numbering, and the
 * condition each one exists under. Declared once, here.
 *
 * This file exists because the book was being described in two places that
 * had already drifted apart. `brandBookPdf.js` held a private `foundations`
 * and `sections` array; `BrandBookBuilderView.jsx` held a `bookOrder` string
 * list; and each file carried a comment claiming the two matched. Nothing
 * enforced it, and by the time the PDF was rebuilt to the Harbor & Hearth
 * layout they named different pages in a different order — the PDF folding
 * Story into Foundations and demoting the brief and handoff note to an
 * appendix, the on-screen book still printing them as top-level pages, and
 * neither one carrying the other's imagery, dividers or numbering.
 *
 * That is the defect CLAUDE.md calls the dominant one in this codebase: a
 * structure restated rather than derived, where a correct change to one copy
 * fails loudly and a wrong one stays silent. So the rule here is the same as
 * `journey.js`: read the plan from this module, never retype it. If a page
 * needs to move, be renumbered, or stop existing, this is the only file that
 * should have to change.
 *
 * The plan is derived from the pack rather than declared flat, because a page
 * exists only when the project holds the content it would print. A book that
 * draws a Story page over invented prose is the Promise/Proof bug again — a
 * surface bound to a field nothing ever wrote. `omitted` carries the pages
 * that were left out and what each is waiting for, so their absence can be
 * shown rather than silently swallowed.
 */

const clean = (v) => String(v ?? '').trim()
const has = (v) => !!clean(v)

/**
 * Everything the page conditions below need, derived from the pack once.
 *
 * The pack is the input rather than the raw project because the pack is what
 * actually gets delivered — `buildBrandPackSnapshot` is where project fields
 * become book fields, and reading round it would reintroduce exactly the kind
 * of second copy this module exists to remove.
 */
export function bookInputs(packIn) {
  const pack = packIn || {}
  const d = pack.detective || {}

  const colors = (pack.palette || []).map((c) => normalizeHex(c) || c).filter(Boolean)
  const pins = Array.isArray(pack.pins) ? pack.pins : []
  /* The hoisted copy wins, but `buildBrandPackSnapshot` only fills it when
     the brief holds surfaces — an older project answered into `detective`
     alone, so dropping that fallback would empty its Applications section. */
  const surfaces = pack.brandSurfaces?.length ? pack.brandSurfaces : d.brandSurfaces
  const touchpoints = touchpointsFor(surfaces, d.deliverablesPicked)

  return {
    pack,
    d,
    colors,
    pins,
    touchpoints,
    tagline: clean(pack.tagline),
    /* No `brief` fallback. `brief` is auto-composed from the answers on every
       keystroke, so it is the run-on summary rather than prose anyone wrote —
       printing it as Our Story put a wall of "Goal: … Story: … Words: …" in
       the client's book. A project with no story now gets no Story page, which
       is the rule everywhere else in this file. */
    story: clean(pack.story) || clean(d.story),
    /* The hoisted copy wins, but a project answered before
       buildBrandPackSnapshot hoisted toneOfVoice still has it only on the
       detective — and the page's own text reads both, so the condition must
       too, or the page is judged absent and then rendered with content. */
    voice: clean(pack.voice) || clean(pack.toneOfVoice) || clean(d.toneOfVoice),
    decision: clean(decisionLineFromPack(pack)),
  }
}

/**
 * The opening spread. One numbered stop (01) holding up to three pages, each
 * appearing only if the project answered for it.
 */
export const FOUNDATION_PAGES = [
  {
    id: 'voice',
    title: 'Brand Voice',
    sub: 'Who we are for, how we sound, and the promise we keep.',
    needs: 'a positioning line, tagline, promise, proof, personality or tone of voice',
    exists: (x) =>
      /* Positioning belongs here too, or the page is judged absent and then
         asked to print a field it holds — the same mismatch tone-of-voice had.
         Any field a page prints must be able to bring that page into being. */
      has(x.pack.positioning) ||
      has(x.tagline) ||
      has(x.pack.messagingPromise) ||
      has(x.pack.messagingProof) ||
      has(x.pack.messagingPersonality) ||
      has(x.voice) ||
      has(x.decision),
  },
  {
    id: 'story',
    title: 'Our Story',
    sub: 'Why this brand exists, in their own words.',
    needs: 'the Story answer, or what makes it different',
    exists: (x) => has(x.story) || has(x.pack.usp) || has(x.d.brandWords) || has(x.d.goal),
  },
  {
    id: 'audience',
    title: 'Our Audience',
    sub: 'Who this is for, and what they need from it.',
    needs: 'the audience answers in the brief',
    exists: (x) =>
      has(x.d.audience) ||
      has(x.d.feel) ||
      has(x.d.audiencePains) ||
      has(x.d.brandWords) ||
      has(x.d.brandAsPerson),
  },
]

/**
 * The numbered sections, each a divider page followed by its content page.
 * Logo and Typography are unconditional because the builder itself supplies
 * their content — there is always a wordmark to set and a scale to print.
 */
export const SECTION_PAGES = [
  {
    id: 'logo',
    short: 'Logo',
    name: 'Logo',
    divider: ['Logo', 'System'],
    page: 'Lockups & Construction',
    /* Unconditional — the PDF always draws lockups from the wordmark — but it
       still names what it is waiting for, because the prose beside those
       lockups is optional and an empty Logo page that says nothing about why
       is the silent-gap failure this list exists to prevent. */
    needs: 'the logo notes on Identity',
    exists: () => true,
  },
  {
    id: 'color',
    short: 'Color',
    name: 'Color Palette',
    divider: ['Color', 'Palette'],
    page: 'Roles & Usage',
    needs: 'a palette',
    exists: (x) => x.colors.length > 0,
  },
  {
    id: 'type',
    short: 'Type',
    name: 'Typography',
    divider: ['Typography'],
    page: 'Type Family & Scale',
    needs: null,
    exists: () => true,
  },
  {
    id: 'imagery',
    short: 'Imagery',
    name: 'Photography & Imagery',
    divider: ['Photography', '& Imagery'],
    page: 'Style Rules & Mood Board',
    needs: 'imagery notes, or pins on the Research wall',
    exists: (x) =>
      has(x.pack.imageryDo) ||
      has(x.pack.imageryDont) ||
      has(x.pack.imageryStyle) ||
      x.pins.length > 0,
  },
  {
    id: 'apps',
    short: 'Applications',
    name: 'Brand in Use',
    divider: ['Brand', 'in Use'],
    page: 'Applications',
    needs: 'the surfaces picked in the brief',
    exists: (x) => x.touchpoints.length > 0,
  },
]

/**
 * The book's plan for one pack.
 *
 * Numbering runs 01 for Foundations then one per drawn section, so a book
 * missing Imagery numbers Applications 05 rather than leaving a gap where a
 * section the reader never saw would have been.
 */
export function bookPlan(packIn) {
  const x = bookInputs(packIn)
  const omitted = []

  const foundations = FOUNDATION_PAGES.filter((f) => {
    if (f.exists(x)) return true
    omitted.push({ id: f.id, label: f.title, needs: f.needs })
    return false
  }).map((f) => ({ ...f, kind: 'foundation' }))

  const sections = SECTION_PAGES.filter((s) => {
    if (s.exists(x)) return true
    if (s.needs) omitted.push({ id: s.id, label: s.name, needs: s.needs })
    return false
  }).map((s) => ({ ...s, kind: 'section' }))

  let n = 0
  const foundationsNum = foundations.length ? String(++n).padStart(2, '0') : ''
  const numbered = sections.map((s) => ({ ...s, num: String(++n).padStart(2, '0') }))

  return { inputs: x, foundations, foundationsNum, sections: numbered, omitted }
}

/**
 * The section ids in book order, for surfaces that only need the running
 * order — the on-screen book's page list, a contents list, a step indicator.
 * Derived so no caller has to retype the sequence.
 */
export function bookSectionIds(packIn) {
  return bookPlan(packIn).sections.map((s) => s.id)
}
