import { describe, expect, it } from 'vitest'
import { TYPE_RUNGS, specimenLine, typeSpecimen } from './typeSpecimen'

/**
 * The bench replaced two lines that set each face's NAME in itself. These pin
 * the two properties that make it a test rather than a decoration: it shows a
 * real hierarchy across both faces, and it never passes filler off as the
 * brand's own words.
 */

const project = (over = {}) => ({
  name: 'Internal job name',
  typeHeading: 'Fraunces SemiBold',
  typeBody: 'Plus Jakarta Sans Regular',
  detective: { clientName: 'Harbor & Hearth' },
  ...over,
})

describe('the rungs', () => {
  it('spans display down to caption, largest first', () => {
    const px = TYPE_RUNGS.map((r) => r.px)
    expect(px).toEqual([...px].sort((a, b) => b - a))
    expect(Math.max(...px)).toBeGreaterThanOrEqual(40)
    // The size that fails first has to be on the bench, or the bench is only
    // testing the easy half of the pairing.
    expect(Math.min(...px)).toBeLessThanOrEqual(13)
  })

  it('puts both faces under test', () => {
    const faces = new Set(TYPE_RUNGS.map((r) => r.face))
    expect(faces).toEqual(new Set(['heading', 'body']))
  })

  it('sets body copy in the body face, not the display face', () => {
    // The commonest way a specimen lies: everything set in the display face,
    // so the pairing is never actually paired.
    expect(TYPE_RUNGS.find((r) => r.id === 'body').face).toBe('body')
    expect(TYPE_RUNGS.find((r) => r.id === 'caption').face).toBe('body')
    expect(TYPE_RUNGS.find((r) => r.id === 'display').face).toBe('heading')
  })

  it('uses only the three weights the type system allows', () => {
    for (const r of TYPE_RUNGS) expect([500, 600, 700]).toContain(r.weight)
  })
})

describe('the copy', () => {
  it('leads with the client’s name, not the internal job name', () => {
    const { text, own } = specimenLine('display', project())
    expect(text).toBe('Harbor & Hearth')
    expect(own).toBe(true)
  })

  it('falls back to the project name when there is no client record', () => {
    const { text } = specimenLine('display', {
      name: 'Untitled',
      detective: {},
    })
    expect(text).toBe('Untitled')
  })

  it('marks stand-in copy as not the brand’s own', () => {
    // Nothing written yet: every line is filler and must say so, or filler
    // reads as a decision somebody made.
    const rungs = typeSpecimen({ detective: {} })
    expect(rungs.every((r) => typeof r.text === 'string' && r.text)).toBe(true)
    expect(rungs.filter((r) => r.own)).toHaveLength(0)
  })

  it('uses the brand’s own words once they exist', () => {
    const rungs = typeSpecimen(
      project({
        tagline: 'Quiet confidence, made local',
        positioning: 'For makers who ship on the date',
      })
    )
    const by = (id) => rungs.find((r) => r.id === id)
    expect(by('heading')).toMatchObject({
      text: 'Quiet confidence, made local',
      own: true,
    })
    expect(by('body').own).toBe(true)
    expect(by('body').text).toContain('makers')
  })

  /**
   * The specimen and the direction sheet must not disagree. Both resolve
   * through `effectiveWord`, so a promise the client wrote and the designer
   * has not overridden shows in both places.
   */
  it('resolves the client’s brief answer the same way the sheet does', () => {
    const rungs = typeSpecimen(
      project({
        detective: {
          clientName: 'Harbor & Hearth',
          messagingPromise: 'We ship on the date we said',
        },
      })
    )
    const subhead = rungs.find((r) => r.id === 'subhead')
    expect(subhead.text).toBe('We ship on the date we said')
    expect(subhead.own).toBe(true)
  })

  it('lets the designer’s override win over the client’s answer', () => {
    const rungs = typeSpecimen(
      project({
        messagingPromise: 'Sharper, in my words',
        detective: {
          clientName: 'Harbor & Hearth',
          messagingPromise: 'We ship on the date we said',
        },
      })
    )
    expect(rungs.find((r) => r.id === 'subhead').text).toBe(
      'Sharper, in my words'
    )
  })

  it('clips a long line rather than letting it become a paragraph', () => {
    const rungs = typeSpecimen(
      project({ positioning: 'x'.repeat(400) })
    )
    const body = rungs.find((r) => r.id === 'body')
    expect(body.text.length).toBeLessThanOrEqual(180)
    expect(body.text.endsWith('…')).toBe(true)
  })
})

describe('the faces', () => {
  it('names the face each rung is set in', () => {
    const rungs = typeSpecimen(project())
    expect(rungs.find((r) => r.id === 'display').faceLabel).toBe(
      'Fraunces SemiBold'
    )
    expect(rungs.find((r) => r.id === 'body').faceLabel).toBe(
      'Plus Jakarta Sans Regular'
    )
  })

  it('still renders when no faces have been chosen', () => {
    const rungs = typeSpecimen({})
    expect(rungs).toHaveLength(TYPE_RUNGS.length)
    for (const r of rungs) expect(r.faceLabel).toBeTruthy()
  })
})
