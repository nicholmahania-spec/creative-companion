import { describe, expect, it } from 'vitest'
import {
  buildDeliveryPack,
  defaultDeliveryNote,
  deliveryOpened,
  deliveryStage,
  deliveryStatusLine,
  DELIVERY_PACK_LIMIT,
  PRIVATE_PACK_FIELDS,
  readDeliveryEnvelope,
} from './brandDelivery'

/** A pack with one of everything the delivery has to reason about. */
const packFixture = () => ({
  projectName: 'Sparrow',
  palette: ['#1B4C7E', '#FAFAF9'],
  handoffNote: 'Everything is in the zip.',
  learnings: 'The second round of marks was the one.',
  openTasks: [{ id: 1, title: 'Chase the invoice' }],
  feedbackLog: ['client hated round one'],
  revisionRounds: [{ round: 1 }],
  decisionLog: [{ label: 'Primary typeface' }],
  discoveryAnswers: { budget: 'tight' },
  progressPercent: 80,
  doneCount: 4,
  totalCount: 5,
  scopeOutOf: 'Motion',
  scopeApprover: 'Dana',
  scopeRevisionsIncluded: 2,
  deadline: '2026-09-01',
  pins: [{ id: 'p1', visual: 'data:image/png;base64,AAAA' }],
  logoImage: 'data:image/png;base64,BBBB',
})

describe('buildDeliveryPack', () => {
  it('strips every private field before anything reaches the client', () => {
    const { pack } = buildDeliveryPack(packFixture())
    for (const field of PRIVATE_PACK_FIELDS) {
      expect(pack, `${field} must not travel to the client`).not.toHaveProperty(field)
    }
  })

  it('keeps what the book actually prints', () => {
    const { pack } = buildDeliveryPack(packFixture())
    expect(pack.projectName).toBe('Sparrow')
    expect(pack.palette).toEqual(['#1B4C7E', '#FAFAF9'])
    expect(pack.handoffNote).toBe('Everything is in the zip.')
    // Printed in the book's Handoff appendix, so it is already client-facing.
    expect(pack.learnings).toBe('The second round of marks was the one.')
    expect(pack.pins).toHaveLength(1)
    expect(pack.logoImage).toBeTruthy()
  })

  /* The failure this guards is a designer previewing a book with a moodboard
     and delivering one without, with nothing on screen saying why. */
  it('drops the heaviest things first, and says which', () => {
    const heavy = packFixture()
    heavy.pins = [{ id: 'p1', visual: 'x'.repeat(DELIVERY_PACK_LIMIT) }]
    const { pack, dropped, tooLarge } = buildDeliveryPack(heavy)
    expect(pack.pins).toEqual([])
    expect(dropped).toContain('the moodboard images')
    expect(tooLarge).toBe(false)
    // The logo is smaller and more important — it survives.
    expect(pack.logoImage).toBeTruthy()
  })

  it('reports tooLarge rather than silently sending a broken book', () => {
    const huge = packFixture()
    huge.brief = 'x'.repeat(DELIVERY_PACK_LIMIT + 1)
    expect(buildDeliveryPack(huge).tooLarge).toBe(true)
  })

  it('survives being handed nothing', () => {
    expect(buildDeliveryPack(null)).toEqual({ pack: null, dropped: [], tooLarge: false })
  })
})

describe('readDeliveryEnvelope', () => {
  it('unwraps what publishDelivery stores', () => {
    const stored = { v: 1, pack: { projectName: 'X' }, book: { pageSize: 'a4' }, hideWatermark: true }
    expect(readDeliveryEnvelope(stored)).toEqual({
      pack: { projectName: 'X' },
      book: { pageSize: 'a4' },
      hideWatermark: true,
    })
  })

  /* A row written before the envelope existed must still render a book, not an
     empty page whose whole job is to look finished. */
  it('accepts a bare pack', () => {
    const { pack, book, hideWatermark } = readDeliveryEnvelope({ projectName: 'X' })
    expect(pack).toEqual({ projectName: 'X' })
    expect(book).toBeNull()
    expect(hideWatermark).toBe(false)
  })

  it('degrades to an empty envelope on junk', () => {
    expect(readDeliveryEnvelope(null).pack).toBeNull()
    expect(readDeliveryEnvelope('nope').pack).toBeNull()
  })
})

describe('deliveryStage', () => {
  it('is draft until the designer asks to look at it', () => {
    expect(deliveryStage(null, false)).toBe('draft')
    expect(deliveryStage({ delivery_status: 'not_delivered' }, false)).toBe('draft')
  })

  it('previews locally — the server never holds a half-sent delivery', () => {
    expect(deliveryStage({ delivery_status: 'not_delivered' }, true)).toBe('preview')
  })

  it('reads delivered from the row', () => {
    expect(deliveryStage({ delivery_status: 'delivered' }, false)).toBe('delivered')
  })

  /* "Send it again" sets the same local flag as the first preview. If
     delivered outranked it, that button would change nothing on screen. */
  it('lets an already-delivered project be previewed again', () => {
    expect(deliveryStage({ delivery_status: 'delivered' }, true)).toBe('preview')
  })
})

describe('deliveryStatusLine', () => {
  it('walks not-sent → sent → opened → replied', () => {
    expect(deliveryStatusLine(null)).toBe('Not sent yet')
    expect(deliveryStatusLine({ delivery_status: 'delivered' })).toMatch(/waiting/i)
    expect(
      deliveryStatusLine({ delivery_status: 'delivered', delivery_viewed_at: 'now' })
    ).toBe('They opened it')
    expect(
      deliveryStatusLine({
        delivery_status: 'delivered',
        delivery_viewed_at: 'now',
        delivery_reaction: 'love it',
      })
    ).toBe('They wrote back')
  })

  /* A client who has not opened it yet is not late. This app does not tell
     its user they are behind — see nonPunitiveState.test.js for the same rule
     applied to colour. */
  it('never implies the client is overdue', () => {
    const lines = [
      deliveryStatusLine(null),
      deliveryStatusLine({ delivery_status: 'delivered' }),
      deliveryStatusLine({ delivery_status: 'delivered', delivery_viewed_at: 'now' }),
    ]
    for (const line of lines) {
      expect(line).not.toMatch(/overdue|late|still no|chase|nothing yet|ignored/i)
    }
  })

  it('knows whether it was opened', () => {
    expect(deliveryOpened({ delivery_viewed_at: 'now' })).toBe(true)
    expect(deliveryOpened({})).toBe(false)
  })
})

describe('defaultDeliveryNote', () => {
  /* Sending it unedited has to be a real option, so it must read as a
     finished message rather than as a form with holes in it. */
  it('reads as something a person wrote', () => {
    const note = defaultDeliveryNote({ clientName: 'Dana', projectName: 'Sparrow' })
    expect(note).toContain('Dana')
    expect(note).toContain('Sparrow')
    expect(note).not.toMatch(/\[|\]|\{|TODO|XXX/)
  })

  it('still makes sense with nothing filled in', () => {
    const note = defaultDeliveryNote()
    expect(note.trim()).not.toBe('')
    expect(note).not.toMatch(/undefined|null/)
  })
})
