/**
 * The brand book's plan is declared once, in bookDocument.js.
 *
 * It was previously written out twice — a private `foundations`/`sections`
 * pair inside brandBookPdf.js, and a `bookOrder` string list inside
 * BrandBookBuilderView.jsx — with a comment in each file claiming the two
 * matched. Nothing enforced that, so when the PDF was rebuilt to the Harbor
 * & Hearth layout the copies drifted apart: different pages, a different
 * order, and numbering and divider pages that existed on only one side. Both
 * comments went on asserting they agreed.
 *
 * That is the same failure `journeySingleSource.test.js` was written for, so
 * this is the same guardrail: derive the plan, never retype it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { bookPlan, bookSectionIds, FOUNDATION_PAGES, SECTION_PAGES } from './bookDocument'

const SRC = new URL('../..', import.meta.url).pathname

/** Only the declaration and this test may spell the section list out. */
const ALLOWED = new Set([
  'lib/book/bookDocument.js',
  'lib/book/bookDocument.test.js',
])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(js|jsx)$/.test(name)) out.push(full)
  }
  return out
}

const files = walk(SRC)
  .map((f) => ({ rel: relative(SRC, f), text: readFileSync(f, 'utf8') }))
  .filter((f) => !ALLOWED.has(f.rel))

/** A pack with enough in it that every optional page earns its place. */
const fullPack = () => ({
  projectName: 'Harbor & Hearth',
  tagline: 'Warm by design',
  palette: ['#1C1917', '#0F766E', '#A8A29E'],
  pins: [{ id: 'p1' }],
  imageryDo: 'Natural light',
  brandSurfaces: ['Website'],
  story: 'Born in a shed.',
  detective: {
    audience: 'Homeowners',
    deliverablesPicked: [],
    brandSurfaces: ['Website'],
  },
})

describe('bookDocument — the plan', () => {
  it('numbers Foundations 01 and then one per drawn section', () => {
    const plan = bookPlan(fullPack())
    expect(plan.foundationsNum).toBe('01')
    expect(plan.sections.map((s) => s.num)).toEqual(['02', '03', '04', '05', '06'])
  })

  it('closes the gap when a section is missing rather than skipping a number', () => {
    // No palette and no imagery: Color and Imagery drop out entirely.
    const plan = bookPlan({ ...fullPack(), palette: [], pins: [], imageryDo: '' })
    const ids = plan.sections.map((s) => s.id)
    expect(ids).toEqual(['logo', 'type', 'apps'])
    // Applications is 04, not 06 — the reader never saw 05, so there is no 05.
    expect(plan.sections.map((s) => s.num)).toEqual(['02', '03', '04'])
  })

  it('draws no page the project has no content for, and says what each needs', () => {
    const plan = bookPlan({})
    expect(plan.foundations).toEqual([])

    /* Logo and Typography are unconditional — the builder supplies their
       content. Applications survives too, because `touchpointsFor` falls back
       to four default mocks when no surface is picked; that is the older
       fixed-mock behaviour kept deliberately, not this plan letting an empty
       page through. */
    expect(plan.sections.map((s) => s.id)).toEqual(['logo', 'type', 'apps'])

    // Absence is reported, not silently swallowed.
    const omitted = Object.fromEntries(plan.omitted.map((o) => [o.id, o.needs]))
    expect(Object.keys(omitted)).toEqual(
      expect.arrayContaining(['voice', 'story', 'audience', 'color', 'imagery'])
    )
    Object.values(omitted).forEach((needs) => expect(needs).toBeTruthy())
  })

  it('keeps Applications for an older project that answered surfaces in the brief only', () => {
    /* buildBrandPackSnapshot only hoists brandSurfaces when the brief holds
       them, so dropping the detective fallback would empty this section. */
    const plan = bookPlan({
      palette: ['#111111'],
      brandSurfaces: [],
      detective: { brandSurfaces: ['Packaging'], deliverablesPicked: [] },
    })
    expect(plan.sections.map((s) => s.id)).toContain('apps')
  })

  it('exposes the running order without callers retyping it', () => {
    expect(bookSectionIds(fullPack())).toEqual(['logo', 'color', 'type', 'imagery', 'apps'])
  })

  it('tolerates a null pack rather than throwing mid-export', () => {
    expect(() => bookPlan(null)).not.toThrow()
    expect(bookPlan(null).sections.length).toBeGreaterThan(0)
  })
})

describe('bookDocument — nothing restates the plan', () => {
  it('no other module writes out the section names', () => {
    /* The page names as the design sets them. A file naming several of these
       in sequence is describing the book, which is this module's job. */
    const names = SECTION_PAGES.map((s) => s.name)
    const offenders = []
    files.forEach((f) => {
      const hits = names.filter((n) => f.text.includes(`'${n}'`) || f.text.includes(`"${n}"`))
      if (hits.length > 1) offenders.push(`${f.rel} → ${hits.join(', ')}`)
    })
    expect(offenders).toEqual([])
  })

  it('no other module writes out the foundation page titles', () => {
    const titles = FOUNDATION_PAGES.map((f) => f.title)
    const offenders = []
    files.forEach((f) => {
      const hits = titles.filter((t) => f.text.includes(`'${t}'`) || f.text.includes(`"${t}"`))
      if (hits.length > 1) offenders.push(`${f.rel} → ${hits.join(', ')}`)
    })
    expect(offenders).toEqual([])
  })

  it('brandBookPdf derives its plan rather than declaring one', () => {
    const pdf = files.find((f) => f.rel === 'lib/book/brandBookPdf.js')
    expect(pdf, 'brandBookPdf.js should still exist').toBeTruthy()
    expect(pdf.text).toContain('bookPlan(pack)')
    /* The shape of the old private declaration. Its return would be a second
       plan that nothing keeps in step with this one. */
    expect(pdf.text).not.toMatch(/divider:\s*\[/)
  })
})
