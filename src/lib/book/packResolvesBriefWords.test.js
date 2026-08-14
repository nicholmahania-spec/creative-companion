/**
 * The brand pack resolves the brief-owned words, and nothing downstream
 * resolves them again.
 *
 * WHAT WENT WRONG. `briefWords.js` states the rule — RESOLVE, NEVER COPY —
 * and asserts in its own header that this already held end to end: "the same
 * order `buildBrandPackSnapshot` already resolves in, so what you see is what
 * ships." It did not. Of the eight `BRIEF_WORD_SOURCES` fields, the pack
 * resolved two (`messagingPromise`, `messagingProof`) as hand-written
 * `p.X || d.X` pairs and read the other six straight off the project. So a
 * project where the client had answered and the designer had written nothing
 * showed the client's words on the direction sheet and shipped a blank line
 * in the delivered book.
 *
 * `voice` was rescued afterwards — twice, in `bookDocument` and again in
 * `brandBookPdf`, each re-implementing the same precedence. That is what hid
 * the rest: the one field anybody checked looked right, while `dontUse` and
 * `messagingPersonality` printed nothing and `orgEmail`/`orgPhone` printed
 * the client's details on the business card and a blank contact line in the
 * book, from the same project.
 *
 * WHAT THIS PINS. Both halves, because either alone comes back:
 *   1. the pack agrees with `effectiveWord` for every mapped key, and
 *   2. the reads still standing downstream never fire on a fresh pack — so
 *      the rule lives at the boundary even though a compatibility read for
 *      already-delivered packs remains. See the second describe block.
 *
 * A new brief-owned word added to `BRIEF_WORD_SOURCES` is covered here the
 * day it is added — the cases iterate the map rather than listing fields.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildBrandPackSnapshot } from './exportFiles'
import { bookInputs } from './bookDocument'
import { effectiveWord, BRIEF_WORD_SOURCES } from '../brand/briefWords'

/**
 * `positioning` is the one mapped field the pack deliberately does NOT
 * resolve, and it needs to stay that way.
 *
 * The brief asks "What does your business do?" (`usp`) — a description. A
 * positioning statement is a synthesis the designer writes from it. Shipping
 * the description under a heading that promises the synthesis is the same
 * defect as shipping the auto-composed brief there, which `exportFiles`
 * already records correcting. `isBriefOwned('positioning')` is false and
 * `FIELD_HOMES.positioning` points at the sheet, both of which say the same
 * thing: a fallback is not the same fact.
 *
 * Its own two guards are `identityConsumesBrief.test.js` (the sheet may still
 * offer `usp` as material to write from) and `positioningOwnership.test.js`.
 */
const NOT_RESOLVED_AT_THE_PACK = new Set(['positioning'])

const RESOLVED = Object.keys(BRIEF_WORD_SOURCES).filter(
  (f) => !NOT_RESOLVED_AT_THE_PACK.has(f),
)

/** A project whose client answered every mapped question and whose designer wrote nothing. */
function clientAnsweredEverything(overrides = {}) {
  const detective = {}
  for (const source of Object.values(BRIEF_WORD_SOURCES)) {
    detective[source] = `client ${source}`
  }
  return { id: 'p1', name: 'Internal job name', detective, ...overrides }
}

const packFor = (project) =>
  buildBrandPackSnapshot({ project, tasks: [], moodItems: [] })

describe('the pack resolves the brief-owned words', () => {
  it('agrees with effectiveWord for every mapped field', () => {
    const project = clientAnsweredEverything()
    const pack = packFor(project)
    for (const field of RESOLVED) {
      expect(
        pack[field],
        `${field} ships a different value than the sheet shows ` +
          `(brief source: detective.${BRIEF_WORD_SOURCES[field]})`,
      ).toBe(effectiveWord(project, field).value)
    }
  })

  it('actually ships the client’s answer rather than agreeing on blank', () => {
    /* Guards the test above from passing vacuously: if resolution were
       removed AND effectiveWord broke the same way, "they agree" would still
       hold with both empty. */
    const pack = packFor(clientAnsweredEverything())
    for (const field of RESOLVED) {
      expect(pack[field], `${field} shipped empty`).toBe(
        `client ${BRIEF_WORD_SOURCES[field]}`,
      )
    }
  })

  it('lets what the designer wrote win, and ships that', () => {
    const project = clientAnsweredEverything()
    for (const field of RESOLVED) project[field] = `designer ${field}`
    const pack = packFor(project)
    for (const field of RESOLVED) {
      expect(pack[field]).toBe(`designer ${field}`)
      expect(pack[field]).toBe(effectiveWord(project, field).value)
    }
  })

  it('does not let an empty override blank the client’s answer', () => {
    /* The precedence that matters most in practice. A designer who types into
       one of these and then clears it must fall back, not ship a blank page —
       and '   ' is what clearing a textarea can actually leave behind. */
    for (const blank of ['', '   ', null, undefined]) {
      const project = clientAnsweredEverything()
      for (const field of RESOLVED) project[field] = blank
      const pack = packFor(project)
      for (const field of RESOLVED) {
        expect(pack[field], `${field} blanked by ${JSON.stringify(blank)}`).toBe(
          `client ${BRIEF_WORD_SOURCES[field]}`,
        )
      }
    }
  })

  it('survives a project with no brief at all', () => {
    /* Every one of these is a real state: a project created before the brief
       existed, one whose detective failed to migrate, and the pack built for
       an empty new project. None may throw, and all must resolve to ''. */
    for (const project of [{ id: 'p' }, { id: 'p', detective: null }, {}]) {
      const pack = packFor(project)
      for (const field of RESOLVED) expect(pack[field]).toBe('')
    }
  })

  it('keeps positioning out of it — a fallback is not the same fact', () => {
    const project = clientAnsweredEverything()
    const pack = packFor(project)
    /* The sheet may show the client's description as material to write from… */
    expect(effectiveWord(project, 'positioning').value).toBe('client usp')
    /* …and the delivered book prints only what the designer wrote. */
    expect(pack.positioning).toBe('')

    project.positioning = 'The mark that survives a stamp'
    expect(packFor(project).positioning).toBe('The mark that survives a stamp')
  })
})

describe('the downstream reads are compatibility, not a second resolver', () => {
  /**
   * `bookDocument` and `brandBookPdf` still read
   * `pack.voice || pack.toneOfVoice || …`. The audit that found this defect
   * expected those to be deleted once the boundary resolved, and on the
   * evidence available that was right — on a pack built today they never
   * fire.
   *
   * They are kept anyway, because packs are not only built today.
   * `publishDelivery` stores one in the `client_portals` row as
   * `delivery_pack {v:1}` and `PublicBrandReveal` regenerates the client's
   * PDF from that stored copy every time they open their link. A pack
   * delivered before this change has `voice: ''` and the answer in
   * `toneOfVoice`; deleting the fallback would silently remove the Brand
   * Voice page from a book already in a client's hands.
   *
   * So the contract is not "no second read exists" — it is "the second read
   * never fires on a fresh pack". That is what keeps the resolution rule in
   * one place while the compatibility read stays safe, and it is what these
   * two cases pin.
   */
  it('never fires on a pack built today', () => {
    const project = clientAnsweredEverything()
    const pack = packFor(project)
    /* Fresh pack: the first operand already answers, so what bookDocument
       derives equals what the boundary resolved. */
    expect(bookInputs(pack).voice).toBe(pack.voice)
    expect(pack.voice).toBe('client toneOfVoice')
  })

  it('still rescues a delivery_pack stored before the boundary resolved', () => {
    /* Exactly the shape `publishDelivery` wrote at v1: voice unresolved,
       the answer only in the hoisted copy. If this ever stops rescuing, a
       delivered book loses a page. */
    const legacyDeliveryPack = { voice: '', toneOfVoice: 'Plain and warm' }
    expect(bookInputs(legacyDeliveryPack).voice).toBe('Plain and warm')
  })

  it('calls the resolver at the boundary rather than inlining it again', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const src = readFileSync(resolve(here, './exportFiles.js'), 'utf8')
    expect(src).toContain("from '../brand/briefWords'")
  })
})
