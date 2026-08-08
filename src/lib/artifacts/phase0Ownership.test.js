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
})
