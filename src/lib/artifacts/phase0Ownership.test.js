import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { FIELD_HOMES } from '../book/bookContent'
import { BRIEF_WORD_SOURCES, effectiveWord } from '../brand/briefWords'
import { allBrandSurfaces } from '../journey/touchpoints'

/**
 * ONE HOME, MANY CONSUMERS.
 *
 * An OUTPUT may never author a DECISION. The Brand Book broke that three
 * times, Touchpoints wrote over the client's own brief answer, and the
 * stationery preview held a second copy of the client's phone and email.
 *
 * Source greps rather than render tests, because the failure mode is an
 * editor being ADDED BACK — and each of these rendered perfectly while
 * quietly being the second author of something.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '../..', p), 'utf8')
const code = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const book = code(read('views/BrandBookBuilderView.jsx'))
const sketch = code(read('views/SketchView.jsx'))
const review = code(read('views/ReviewView.jsx'))
const stationery = code(read('components/StationeryKit.jsx'))
const design = code(read('views/DesignView.jsx'))

describe('the Brand Book consumes the brand, it does not write it', () => {
  for (const field of ['tagline', 'typeHeading', 'typeBody'])
    it(`never writes ${field}`, () => {
      expect(book).not.toContain(`updateBrandField('${field}'`)
    })

  it('still prints them, and says where they are written', () => {
    expect(book).toContain('BookOwnedElsewhere')
    for (const f of ['tagline', 'typeHeading', 'typeBody'])
      expect(FIELD_HOMES[f], f).toBeTruthy()
    expect(FIELD_HOMES.typeHeading.view).toBe('brand')
    expect(FIELD_HOMES.typeHeading.section).toBe('type')
  })

  it('keeps its own document typography', () => {
    // Weight and size are the document's, not the brand's — they may stay.
    expect(book).toContain('headlineWeight')
    expect(book).toContain('setBookBuilder')
  })
})

describe('Identity is the only author of the brand’s words and faces', () => {
  for (const field of ['tagline', 'typeHeading', 'typeBody'])
    it(`writes ${field}`, () => {
      expect(design).toContain(`updateBrandField('${field}'`)
    })
})

describe('feedback has one editor', () => {
  it('Review owns it', () => {
    expect(review).toContain("updateBrandField('feedbackNotes'")
  })

  it('Touchpoints reads it and routes', () => {
    // Two editors on one field meant either could clobber the other
    // mid-sentence, and one log looked like two.
    expect(sketch).not.toContain("updateBrandField('feedbackNotes'")
    expect(sketch).toContain('feedbackNotes')
  })
})

describe('the brief keeps the client’s own answer', () => {
  it('Touchpoints never writes brandSurfaces', () => {
    expect(sketch).not.toContain("updateDetective('brandSurfaces'")
  })

  it('designer additions live on the project and are unioned for display', () => {
    expect(sketch).toContain("updateBrandField('designerSurfaces'")
    expect(sketch).toContain('allBrandSurfaces')
  })

  it('a surface the designer added still reaches the client’s book', () => {
    // Splitting authorship must not split visibility: who noticed a surface
    // is a question about the brief, not about whether the brand appears
    // there. `bookFieldsReach` caught this the moment it was not true.
    const project = {
      detective: { brandSurfaces: ['website'] },
      designerSurfaces: ['signage', 'website'],
    }
    expect(allBrandSurfaces(project)).toEqual(['website', 'signage'])
    expect(allBrandSurfaces({})).toEqual([])
  })
})

describe('the client’s contact details are asked once', () => {
  it('phone and email resolve from the brief', () => {
    expect(BRIEF_WORD_SOURCES.orgPhone).toBe('clientPhone')
    expect(BRIEF_WORD_SOURCES.orgEmail).toBe('clientEmail')
    expect(stationery).toContain('effectiveWord')
  })

  it('the brief fills the gap and the designer’s own value wins', () => {
    const brief = { detective: { clientPhone: '0100 000 000' } }
    expect(effectiveWord(brief, 'orgPhone')).toEqual({
      value: '0100 000 000',
      fromBrief: true,
    })
    expect(
      effectiveWord({ ...brief, orgPhone: '0200 111 111' }, 'orgPhone')
    ).toEqual({ value: '0200 111 111', fromBrief: false })
  })

  /**
   * INHERITING IS NOT THE SAME AS HAVING TYPED IT.
   *
   * The two contact boxes were bound to the RESOLVED value, so on a project
   * where only the client had answered, the box displayed their number and
   * the first keystroke sent `e.target.value` — their number and all — into
   * `project.orgPhone`. One fact forked into two columns, and clearing the
   * box afterwards wrote `''`, which reads as an override of nothing rather
   * than a return to the brief: there was no way back to inheriting.
   *
   * `BrandArtboard`'s `sourceBehind` already records this correction for
   * Positioning. These pin the same shape on the kit: the ARTWORK resolves,
   * the CONTROL holds the designer's own field, and the brief's answer is
   * named underneath as provenance rather than pre-filled into the input.
   *
   * Source greps for the bindings, per this file's header — the environment
   * is `node`, there is no renderer, and the failure mode is a binding being
   * quietly changed back. The semantics either side of the binding are real
   * assertions on `effectiveWord`.
   */
  it('the control holds the designer’s own value, never the resolved one', () => {
    /* The assertion that flips: before the fix these read
       `value={effectiveWord(activeProject, 'orgPhone').value}`. */
    expect(stationery).toContain("value={activeProject.orgPhone || ''}")
    expect(stationery).toContain("value={activeProject.orgEmail || ''}")
    expect(stationery).not.toContain(
      "value={effectiveWord(activeProject, 'orgPhone').value}"
    )
    expect(stationery).not.toContain(
      "value={effectiveWord(activeProject, 'orgEmail').value}"
    )
  })

  it('typing is still an explicit override, and writes only its own field', () => {
    expect(stationery).toContain(
      "onChange={(e) => updateBrandField('orgPhone', e.target.value)}"
    )
    expect(stationery).toContain(
      "onChange={(e) => updateBrandField('orgEmail', e.target.value)}"
    )
    /* The client's answer is the brief's. Nothing here may write back to it,
       or "override" would silently mean "edit the client's brief". */
    expect(stationery).not.toContain('clientPhone')
    expect(stationery).not.toContain('clientEmail')
    expect(stationery).not.toContain('detective')
  })

  it('clearing the box returns to the brief rather than overriding with nothing', () => {
    const brief = { detective: { clientPhone: '0100 000 000' } }
    /* What the control now writes when the designer empties it — and what the
       artwork resolves immediately afterwards. `clean()` trims, so a box of
       spaces is not an override either. */
    for (const cleared of ['', '   ']) {
      expect(effectiveWord({ ...brief, orgPhone: cleared }, 'orgPhone')).toEqual({
        value: '0100 000 000',
        fromBrief: true,
      })
    }
  })

  it('the artwork still prints the resolved value, not the empty control', () => {
    /* If this ever stopped being true the fix would have traded a fork for a
       blank letterhead — the box is empty while inheriting, so the artwork is
       the only place the inherited number is printed. */
    expect(stationery).toContain("effectiveWord(activeProject, 'orgPhone').value")
    expect(stationery).toContain("effectiveWord(activeProject, 'orgEmail').value")
    /* And it is named under the control while it is the client's. */
    expect(stationery).toContain('BRIEF_PROVENANCE')
    expect(stationery).toContain('briefPhone.fromBrief')
    expect(stationery).toContain('briefEmail.fromBrief')
  })

  it('leaves the contact fields the brief never asks about alone', () => {
    /* Address and website have no brief source, so they were never forked and
       must not grow provenance or resolution they have no basis for. */
    expect(BRIEF_WORD_SOURCES.orgAddress).toBeUndefined()
    expect(BRIEF_WORD_SOURCES.orgWebsite).toBeUndefined()
    expect(stationery).toContain("value={activeProject.orgAddress || ''}")
    expect(stationery).toContain("value={activeProject.orgWebsite || ''}")
  })
})
