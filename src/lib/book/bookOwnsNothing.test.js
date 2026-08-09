import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { FIELD_HOMES, PAGE_FIELDS } from './bookContent'

/**
 * THE BRAND BOOK PRINTS BRAND FACTS. IT DOES NOT AUTHOR THEM.
 *
 * Two authoring surfaces were left on it, and both are closed here.
 *
 * BRAND NAME was worse than a duplicate — it was a control that discarded
 * what you typed. It read `detective.clientName || project.name` and wrote
 * `project.name`, two different fields, so on any project where the client had
 * answered chapter 01 the box showed their answer, accepted an edit, renamed
 * the project underneath, and re-rendered the client's answer over the top.
 * No error, no toast, nothing to notice.
 *
 * COLOURS was a full second editor — name, hex, add, remove — for the
 * canonical palette. It wrote the real `palette`/`paletteTokens` through
 * `setPaletteTokens`, so it was not a second STORE; it was a second HOME,
 * which is the rule this file exists to hold. Naming was the one thing it
 * could do that the Colour bench could not, so naming MOVED to Colour rather
 * than being deleted — deleting it would have removed the only way to name a
 * colour anywhere in the app.
 *
 * Greps the source because that is the only way to catch the next input
 * someone adds to this panel in good faith.
 */
const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '../..', p), 'utf8')
const book = read('views/BrandBookBuilderView.jsx')
const design = read('views/DesignView.jsx')

/** Strip comments — prose may describe the old input; code may not be it. */
const code = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the book authors no brand fact', () => {
  it('has no brand-name input', () => {
    const c = code(book)
    expect(c).not.toContain('bbb-brandName')
    /* The dead writer went with it. Leaving `renameProject` wired to a field
       nobody can type in is how the next reader concludes it still works. */
    expect(c).not.toContain('setBrandName')
    expect(c).not.toContain('renameProject')
  })

  it('names the brief as the brand name’s home', () => {
    expect(FIELD_HOMES.clientName).toBeTruthy()
    expect(FIELD_HOMES.clientName.view).toBe('project')
  })

  it('does not edit, add or remove palette colors', () => {
    const c = code(book)
    for (const writer of ['setPaletteTokens', 'updateColor', 'removeColor', 'addColor']) {
      expect(c, `the book still calls ${writer}`).not.toContain(writer)
    }
    /* The editable row component is gone, not merely unrendered. */
    expect(c).not.toContain('function ColorRow')
  })

  it('names the Color bench as the palette’s home', () => {
    expect(FIELD_HOMES.palette).toBeTruthy()
    expect(FIELD_HOMES.palette.view).toBe('brand')
    expect(FIELD_HOMES.palette.section).toBe('colors')
  })

  it('still SHOWS the palette, because the book has to print it', () => {
    expect(code(book)).toContain('bbb-color-read')
  })

  it('every declared page field has a home to be sent to', () => {
    /* A read-only value with no route is worse than an input: it states a
       fact the designer can see is wrong and gives them nowhere to go. */
    const homeless = []
    for (const [page, rows] of Object.entries(PAGE_FIELDS)) {
      for (const f of rows) {
        if (f.editedElsewhere) continue
        const home = f.scope === 'detective' ? FIELD_HOMES.detective : FIELD_HOMES[f.field]
        if (!home) homeless.push(`${page}.${f.field}`)
      }
    }
    expect(homeless).toEqual([])
  })
})

describe('the Color bench is where a color is named', () => {
  it('renames through the single writer, not through setProjectPalette', () => {
    const c = code(design)
    expect(c).toContain('setPaletteTokens')
    expect(c).toContain('palette-name-input')
  })
})
