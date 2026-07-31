import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { DETECTIVE_CHAPTERS } from './detectiveBrief'

/**
 * The client-answer review screen must branch on what a field IS, not on what
 * its value happens to look like.
 *
 * ReviewAnswers had a branch guarded by `Array.isArray(value)`, written to fix
 * a real bug: client attachments arrive as a sibling `${id}Files` array of
 * {name,url}, and a plain <textarea value={array}> rendered "[object Object]"
 * and could silently overwrite the client's uploads with typed text.
 *
 * But `Array.isArray` is true of the checklist fields as well —
 * deliverablesPicked and brandSurfaces hold arrays of option ids. They fell
 * into the attachment branch and rendered as <a href={undefined}><img
 * src={undefined}>: a row of broken images labelled "… — attached", read-only
 * and uneditable. That is the most commercially loaded answer in the brief —
 * what is included versus quoted separately — on the one screen whose stated
 * promise is that you review every line before anything is saved.
 *
 * The fix keyed the branch on the field id suffix instead. These tests hold the
 * two halves of that: attachments are identified structurally, and every
 * checklist the schema declares has somewhere real to render.
 */
const SRC = new URL('../components/ProjectOverviewShare.jsx', import.meta.url)
  .pathname
const src = readFileSync(SRC, 'utf8')

const ALL_FIELDS = DETECTIVE_CHAPTERS.flatMap((c) => c.fields)
const CHECKLISTS = ALL_FIELDS.filter((f) => f.type === 'checklist')

describe('review screen answer shapes', () => {
  /* If this ever finds nothing, the test below stops proving anything — so
     assert the fixture the whole file depends on actually exists. */
  it('the schema still declares checklist fields', () => {
    expect(CHECKLISTS.length).toBeGreaterThan(0)
  })

  it('identifies attachments by field id, never by value type alone', () => {
    expect(src).toMatch(/fieldId\.endsWith\('Files'\)\s*&&\s*Array\.isArray/)
    /* The bare form is what swept the checklists in. Banning it outright is
       the point: any future array-shaped field would be swept in too. */
    expect(src).not.toMatch(/if \(Array\.isArray\(value\)\) \{/)
  })

  it('renders checklist fields as checkboxes rather than text or thumbnails', () => {
    expect(src).toMatch(/field\?\.type === 'checklist'/)
    expect(src).toMatch(/type="checkbox"/)
  })

  /* Extras are priced differently. If the split does not survive the round
     trip, a scope answer can be reviewed and saved without the thing that
     makes it a scope answer. */
  it('keeps the included / quoted-separately split on review', () => {
    expect(src).toMatch(/Quoted separately/)
    expect(src).toMatch(/o\.extra/)
  })

  it('every declared checklist has options to render', () => {
    for (const f of CHECKLISTS) {
      expect(Array.isArray(f.options), `${f.id} needs options`).toBe(true)
      expect(f.options.length, `${f.id} needs options`).toBeGreaterThan(0)
    }
  })
})
