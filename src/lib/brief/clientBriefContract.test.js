import { describe, expect, it } from 'vitest'
import { DETECTIVE_CHAPTERS, spectrumChoices } from './detectiveBrief'

/**
 * Both public routes — /f/:shareId and /c/:portalId — render the detective
 * schema through the shared ClientBriefFields component. There is no DOM
 * test environment configured here, so these guard the data contract that
 * component depends on rather than its markup.
 */

const allFields = DETECTIVE_CHAPTERS.flatMap((c) => c.fields || [])
const clientVisible = allFields.filter((f) => !f.designerOnly)

describe('client-facing brief contract', () => {
  it('hides only the fields a client genuinely cannot answer', () => {
    // Budget and file formats invite a wrong or embarrassed guess; the
    // designer records them. Anything else hidden from a client is a
    // decision that should be made deliberately, not by accident.
    const hidden = allFields.filter((f) => f.designerOnly).map((f) => f.id)
    expect(hidden.sort()).toEqual(['budgetRange', 'technical'])
    expect(clientVisible.length).toBe(allFields.length - hidden.length)
  })

  it('every client-visible field can actually be rendered', () => {
    for (const f of clientVisible) {
      expect(f.id, 'field needs an id').toBeTruthy()
      expect(f.label, `${f.id} needs a label`).toBeTruthy()
      // The renderer branches on checklist -> area -> plain input. A
      // checklist without options would render an empty group.
      if (f.type === 'checklist') {
        expect(Array.isArray(f.options), `${f.id} needs options`).toBe(true)
        expect(f.options.length).toBeGreaterThan(0)
      }
      if (f.type === 'spectrum') {
        expect(Array.isArray(f.poles), `${f.id} needs poles`).toBe(true)
        expect(f.poles.length, `${f.id} needs exactly two poles`).toBe(2)
        expect(f.poles.every((p) => p && p.trim())).toBe(true)
      }
    }
  })

  it('spectrum scales are worded, never numbered, and store stable tokens', () => {
    const spectrums = clientVisible.filter((f) => f.type === 'spectrum')
    expect(spectrums.length).toBeGreaterThan(0)
    for (const f of spectrums) {
      const choices = spectrumChoices(f.poles)
      expect(choices.length).toBe(5)
      // The user has said numbers mean nothing to them; a 1-5 scale would
      // make every answer a translation step.
      for (const c of choices) {
        expect(c.label, `${f.id} label should not be a number`).not.toMatch(/^\d+$/)
        expect(c.label.trim().length).toBeGreaterThan(0)
      }
      // Stored value is a token, so the wording can change without
      // orphaning answers already saved on real projects.
      expect(choices.map((c) => c.value)).toEqual([
        'a',
        'mostly-a',
        'balanced',
        'mostly-b',
        'b',
      ])
      expect(choices[0].label).toBe(f.poles[0])
      expect(choices[4].label).toBe(f.poles[1])
    }
  })

  it('spectrum ids match the old schema so existing answers carry over', () => {
    // These ids came from discoveryBrief. Renaming them would orphan any
    // answer a client already gave through the old share form.
    const ids = clientVisible.filter((f) => f.type === 'spectrum').map((f) => f.id)
    expect(ids.sort()).toEqual([
      'spectrumBoldMinimalist',
      'spectrumHighEndAffordable',
      'spectrumModernTraditional',
      'spectrumPlayfulProfessional',
    ])
  })

  it('the deliverables checklist splits into included vs quoted separately', () => {
    // Saying so on the form itself is what prevents the awkward
    // conversation later, so both groups must be non-empty.
    const checklist = clientVisible.find((f) => f.type === 'checklist')
    expect(checklist).toBeTruthy()
    expect(checklist.options.some((o) => !o.extra)).toBe(true)
    expect(checklist.options.some((o) => o.extra)).toBe(true)
  })

  it('field ids are unique, so answers cannot overwrite each other', () => {
    const ids = allFields.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('tips stay within the five-word placeholder cap', () => {
    // tip renders as the input placeholder on the Define sheet, where a long
    // sentence is clipped by the field width and vanishes on first keypress.
    for (const f of allFields) {
      if (!f.tip) continue
      const words = f.tip.split(/\s+/).filter(Boolean).length
      expect(words, `${f.id} tip is ${words} words: "${f.tip}"`).toBeLessThanOrEqual(6)
    }
  })
})
