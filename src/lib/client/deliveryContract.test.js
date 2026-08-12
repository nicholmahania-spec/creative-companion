import { describe, expect, it } from 'vitest'
import {
  buildDeliveryPack,
  deliveryGaps,
  deliveryStage,
  DELIVERY_PACK_LIMIT,
} from './brandDelivery'
import {
  buildBrandPackSnapshot,
  packReadiness,
} from '../book/exportFiles'
import { bookContentPages } from '../book/bookContent'
import {
  canDistribute,
  deliverableChecklist,
  packagePlan,
} from '../deliver/packagePlan'
import { packHandoffStatus } from '../../views/DeskView.jsx'
import {
  findProducedBusinessCard,
  isProducedBusinessCardArtifact,
} from '../brand/businessCardArtifact'

/**
 * THE DELIVERY CONTRACT — what a client is actually able to receive, and on
 * what evidence the app says they can receive it.
 *
 * There are two entirely separate handovers in this product and they share no
 * code path:
 *
 *   THE ZIP     built in the browser by `downloadClientPackage`, planned by
 *               `packagePlan`. Honours usage rights, holds back what is not
 *               the client's, and says so in the README. Never leaves the
 *               designer's machine on its own.
 *
 *   THE PORTAL  `publishDelivery` writes `buildDeliveryPack(pack)` into
 *               `client_portals.delivery_pack`, and `/d/:portalId` serves it
 *               to anyone holding the link. This is the only thing the app
 *               itself ever transmits to a client.
 *
 * `buildDeliveryPack` is therefore the ONE gate on outbound client material,
 * and its allow-list is inverted: it strips a named list and passes everything
 * else. `packagePlan` is the opposite — it plans a named list and excludes
 * everything else. The tests below pin what each one actually does today,
 * including where the two disagree, because the disagreement is invisible from
 * either screen.
 *
 * Tests marked RECORDED DEFECT assert current behavior on purpose. They are
 * evidence, not endorsement — each names what the correct behavior would be so
 * that fixing it is a deliberate edit to a failing assertion rather than a
 * silent change nothing was watching.
 */

/** A finished-looking project that can ship almost nothing. */
const projectFixture = () => ({
  name: 'Sparrow',
  tagline: 'Small bird, big nerve',
  voice: 'Warm, plain, unfussy',
  handoffNote: 'Everything is in the folder.',
  learnings: 'Round two was the one.',
  /* The Review stop's own notes field — "Change · why · keep". The designer's
     critique of their own work, written for nobody but themselves. */
  feedbackNotes: '• Client hated round one\n• Never show them the mono lockup',
  palette: ['#1B4C7E', '#FAFAF9', '#E8B04B'],
  /* No mark. Every readiness signal below still reads as finished. */
  logoImage: '',
  detective: {
    goal: 'Open a second shop',
    audience: 'Locals',
    deliverablesPicked: ['logoPrimary', 'colourPalette', 'businessCard'],
  },
  packageAssets: [
    { id: 'a1', name: 'Stock skyline', dataUrl: 'data:image/png;base64,AAAA', rights: 'thirdParty' },
    { id: 'a2', name: 'My own grid system', dataUrl: 'data:image/png;base64,BBBB', rights: 'designerOwned' },
    { id: 'a3', name: 'Their NDA scan', dataUrl: 'data:application/pdf;base64,JVBERi0=', rights: 'doNotDistribute' },
  ],
})

const packFor = (project) =>
  buildBrandPackSnapshot({
    project,
    moodItems: [{ id: 'p1', inPack: true, visual: 'data:image/png;base64,CCCC' }],
    palette: project.palette,
  })

describe('the ZIP honours usage rights', () => {
  const pack = packFor(projectFixture())
  const plan = packagePlan(pack, { assets: pack.packageAssets })

  it('ships none of the three restricted files', () => {
    const shipped = plan.folders.flatMap((f) => f.files).map((f) => f.name)
    for (const bad of ['Stock', 'grid', 'NDA']) {
      expect(shipped.join(' ')).not.toMatch(new RegExp(bad, 'i'))
    }
  })

  it('names each one, with the reason, where the designer reads it', () => {
    expect(plan.excluded.map((x) => x.name)).toEqual([
      'Stock skyline',
      'My own grid system',
      'Their NDA scan',
    ])
    for (const x of plan.excluded) expect(x.reason).toMatch(/Kept back/)
  })

  it('agrees with canDistribute, so one rule decides both', () => {
    for (const a of pack.packageAssets) expect(canDistribute(a)).toBe(false)
  })
})

describe('the portal delivery pack honours the same rights decision', () => {
  /**
   * D1 — FIXED (remediation pass 1).
   *
   * `buildBrandPackSnapshot` carries `packageAssets` (exportFiles.js:439) so
   * the ZIP planner can read the designer's uploaded files off the pack. That
   * is a local, designer-side concern. But the same pack is what
   * `publishDelivery` writes into `client_portals.delivery_pack`, which
   * `get_brand_delivery` serves to any holder of /d/:portalId — so before this
   * fix, every file the ZIP withheld on rights travelled to the client anyway,
   * bytes and all, rendered by nothing and visible to no one.
   *
   * `packageAssets` is now in `PRIVATE_PACK_FIELDS`. The legitimate files still
   * reach the client the way they always did: through the zip the designer
   * builds and hands over.
   */
  it('does not forward packageAssets at all', () => {
    const pack = packFor(projectFixture())
    // The snapshot still carries them — production truth is untouched.
    expect(pack.packageAssets).toHaveLength(3)

    const { pack: delivered } = buildDeliveryPack(pack)
    expect(delivered).not.toHaveProperty('packageAssets')
  })

  /**
   * Not just the array — the bytes. A future shape change that moved the files
   * somewhere else on the pack would pass the assertion above and still ship
   * them, so this searches the whole serialized payload for the actual
   * base64 each restricted file carries.
   */
  it('carries no byte of any rights-restricted file, anywhere in the payload', () => {
    const pack = packFor(projectFixture())
    const restricted = pack.packageAssets.filter((a) => !canDistribute(a))
    expect(restricted).toHaveLength(3)

    const { pack: delivered } = buildDeliveryPack(pack)
    const wire = JSON.stringify(delivered)
    for (const a of restricted) {
      const payload = a.dataUrl.split(',')[1]
      expect(
        wire,
        `${a.name} (${a.rights}) is held back from the zip but its bytes are in the delivery pack`
      ).not.toContain(payload)
      expect(wire).not.toContain(a.name)
    }
  })

  /* The two halves of the contract now agree. This is the assertion that would
     have caught the original defect: the zip's rights decision and the
     delivery pack's contents are checked against each other, not separately. */
  it('agrees with the zip — nothing packagePlan held back is delivered', () => {
    const pack = packFor(projectFixture())
    const plan = packagePlan(pack, { assets: pack.packageAssets })
    const { pack: delivered } = buildDeliveryPack(pack)
    const wire = JSON.stringify(delivered)

    expect(plan.excluded.length).toBeGreaterThan(0)
    for (const held of plan.excluded) expect(wire).not.toContain(held.name)
  })

  /**
   * D2 — FIXED (remediation pass 1).
   *
   * `feedbackNotes` is the Review stop's private notes field, placeholdered
   * "Change · why · keep". It sits beside `learnings` and `handoffNote` in the
   * snapshot and reads like them, which is why it was missed — but those two
   * ARE client-facing and the book prints them in its Handoff appendix under
   * client-facing labels (brandBookPdf.js:806). Nothing prints this one.
   */
  it('does not forward the designer’s private review notes', () => {
    const { pack: delivered } = buildDeliveryPack(packFor(projectFixture()))
    expect(delivered).not.toHaveProperty('feedbackNotes')
    expect(JSON.stringify(delivered)).not.toContain('Never show them the mono lockup')
  })

  /* The other half of D2, and the line that keeps this fix from overreaching:
     the two neighbours are genuinely client-facing and must still travel. */
  it('still forwards the two the book actually prints', () => {
    const { pack: delivered } = buildDeliveryPack(packFor(projectFixture()))
    expect(delivered.handoffNote).toBe('Everything is in the folder.')
    expect(delivered.learnings).toBe('Round two was the one.')
  })

  /**
   * D3 — RESOLVED BY D1, verified rather than redesigned.
   *
   * `buildDeliveryPack` sheds weight in a fixed order — moodboard pins, then
   * logo artwork — and `packageAssets` was never in that order. So a pack whose
   * weight was entirely in uploaded files stripped the two things a client can
   * SEE, still came back over the limit, and blocked the send with a message
   * about the book being too big. The megabytes belonged to files the client
   * was never supposed to receive.
   *
   * With the files out of the payload the scenario simply does not arise: this
   * is the exact fixture that used to shed both and report tooLarge.
   */
  it('no longer sheds the book’s own images for weight it did not cause', () => {
    const project = projectFixture()
    project.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    project.packageAssets = [
      { id: 'big', name: 'Press-ready card', rights: 'clientOwned', dataUrl: `data:application/pdf;base64,${'A'.repeat(3_200_000)}` },
    ]
    const heavy = packFor(project)
    /* The weight is real and still on the project — it is simply no longer
       the delivery's problem. */
    expect(heavy.packageAssets[0].dataUrl.length).toBeGreaterThan(3_000_000)

    const { pack: delivered, dropped, tooLarge } = buildDeliveryPack(heavy)
    expect(tooLarge).toBe(false)
    expect(dropped).toEqual([])
    expect(delivered.pins).toHaveLength(1)
    expect(delivered.logoImage).toBe('data:image/svg+xml;base64,PHN2Zy8+')
  })

  /* A pack that is genuinely too heavy on its own still sheds, in order, and
     still says so. The shedding algorithm was not touched. */
  it('still sheds, in order, when the book itself is the weight', () => {
    const project = projectFixture()
    project.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    const heavy = packFor(project)
    heavy.pins = [{ id: 'p1', visual: 'x'.repeat(3_100_000) }]
    const { dropped, tooLarge } = buildDeliveryPack(heavy)
    expect(dropped).toContain('the moodboard images')
    expect(tooLarge).toBe(false)
  })

  /**
   * The premise the whole strip rests on, proved directly rather than by
   * proxy: the client-facing book is byte-for-byte the same document before
   * and after the strip.
   *
   * `deliveryPackPrivacy.test.js` asserts the weaker version of this (no file
   * under src/lib/book/ so much as MENTIONS a stripped field) across the whole
   * list. This builds the actual page structure both ways and compares it, so
   * the designer's preview and the client's copy are shown to be one document.
   */
  it('the client-facing book is unchanged by the strip', () => {
    const pack = packFor(projectFixture())
    const { pack: delivered } = buildDeliveryPack(pack)
    expect(bookContentPages(delivered)).toEqual(bookContentPages(pack))
  })
})

describe('package readiness reads package truth', () => {
  const project = projectFixture()
  const pack = packFor(project)
  const plan = packagePlan(pack, { assets: pack.packageAssets })

  /**
   * FINDING R1 — FIXED (remediation pass 2).
   *
   * `packReadiness` asked eight questions and every one was "is this project
   * field non-empty?". It never asked `markSource` whether the logo could be
   * written to a file, never asked `packagePlan` what the folders would
   * contain, and never asked `deliverableChecklist` whether the client was
   * getting what they bought — so this project, with no mark at all and two of
   * three bought deliverables unsatisfiable, reported zero gaps and the desk
   * called it ready to send.
   *
   * It now consults the checklist. Nothing new is required of a project: the
   * rows come from `detective.deliverablesPicked`, which is what the brief
   * bought.
   */
  it('is not ready while a bought deliverable cannot be packaged', () => {
    const ready = packReadiness(pack)
    expect(ready.thin).toBe(true)
    expect(ready.allDone).toBe(false)
  })

  it('names which bought items are missing, rather than counting them', () => {
    const ready = packReadiness(pack)
    expect(ready.deliverableGaps.map((d) => d.id)).toEqual([
      'logoPrimary',
      'businessCard',
    ])
    expect(ready.deliverableGaps[0].missing).toBe('No mark uploaded yet — add it on Identity')
  })

  it('agrees with the panel on the same screen', () => {
    const rows = deliverableChecklist(pack, plan)
    expect(packReadiness(pack).deliverables).toEqual(rows)
  })

  it('and the desk no longer claims it is ready to send', () => {
    const status = packHandoffStatus({ thin: !!packReadiness(pack).thin, pathFull: true })
    expect(status.ready).toBe(false)
    expect(status.line).toBe('Not enough here to send yet')
  })

  /* Requirement 1: with everything bought actually present, readiness can pass
     again — the gate has to open, not merely close. */
  it('is ready once every bought deliverable is in the package', () => {
    const done = projectFixture()
    done.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    done.packageAssets = [
      {
        id: 'bc',
        name: 'Sparrow business card',
        dataUrl: 'data:application/pdf;base64,JVBERi0=',
        group: 'application',
        item: 'businessCard',
        deliverable: 'businessCard',
        rights: 'clientOwned',
      },
    ]
    const readyPack = packFor(done)
    const ready = packReadiness(readyPack)
    expect(ready.deliverableGaps).toEqual([])
    expect(ready.thin).toBe(false)
    expect(ready.allDone).toBe(true)
    const status = packHandoffStatus({ thin: false, pathFull: true })
    expect(status.ready).toBe(true)
    expect(status.line).toBe('Ready to send to the client')
  })

  /* Requirement 3: nothing is invented. A brief that bought nothing has no
     rows, so readiness is governed by the written-down checks exactly as
     before — a logo-only job is never asked for a palette it did not buy. */
  it('invents no requirement for a project that bought nothing', () => {
    const none = projectFixture()
    none.detective = { ...none.detective, deliverablesPicked: [] }
    const ready = packReadiness(packFor(none))
    expect(ready.deliverables).toEqual([])
    expect(ready.deliverableGaps).toEqual([])
    expect(ready.thin).toBe(false)
  })

  it('does not fail solely because an optional note is unwritten', () => {
    const noNotes = projectFixture()
    noNotes.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    noNotes.detective = { ...noNotes.detective, deliverablesPicked: ['logoPrimary'] }
    noNotes.handoffNote = ''
    noNotes.learnings = ''
    const ready = packReadiness(packFor(noNotes))
    expect(ready.deliverableGaps).toEqual([])
    expect(ready.allDone).toBe(true)
  })

  /* Requirement 4: rights are load-bearing here too. A business card the
     designer may not hand over never reaches the plan, so it cannot tick the
     item it is attributed to. */
  it('a rights-excluded file cannot satisfy a bought deliverable', () => {
    const restricted = projectFixture()
    restricted.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    restricted.packageAssets = [
      {
        id: 'bc',
        name: 'Licensed card template',
        dataUrl: 'data:application/pdf;base64,JVBERi0=',
        group: 'application',
        item: 'businessCard',
        deliverable: 'businessCard',
        rights: 'thirdParty',
      },
    ]
    const restrictedPack = packFor(restricted)
    const ready = packReadiness(restrictedPack)
    expect(ready.deliverableGaps.map((d) => d.id)).toEqual(['businessCard'])
    expect(ready.thin).toBe(true)
    // …and the reason is stated where the designer reads it, not swallowed.
    expect(
      packagePlan(restrictedPack, { assets: restrictedPack.packageAssets }).excluded
        .map((x) => x.name)
    ).toEqual(['Licensed card template'])
  })

  /* Requirement 5: an accepted mock is evidence of work, never a file. */
  it('an accepted Touchpoints mock cannot satisfy a produced-file requirement', () => {
    const mocked = projectFixture()
    mocked.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    mocked.packageAssets = []
    mocked.touchpointApps = {
      businessCard: { done: true, note: 'Signed off', check: { readable: true } },
    }
    const ready = packReadiness(packFor(mocked))
    expect(ready.deliverableGaps.map((d) => d.id)).toEqual(['businessCard'])
    expect(ready.thin).toBe(true)
  })

  /* Requirement 8: readiness describes, it does not build. `packagePlan` is
     pure and this must stay a read. */
  it('does not mutate package truth while reading it', () => {
    const before = JSON.parse(JSON.stringify(pack))
    packReadiness(pack)
    packReadiness(pack)
    expect(pack).toEqual(before)
  })

  /* Requirement 6, restated at this layer: fixing readiness must not have
     quietly re-opened the delivery boundary. */
  it('reading the package for readiness does not put it in the delivery pack', () => {
    packReadiness(pack)
    const { pack: delivered } = buildDeliveryPack(pack)
    expect(delivered).not.toHaveProperty('packageAssets')
  })

  /**
   * FINDING R2 — FIXED (remediation pass 3).
   *
   * DeskView gated its ready affordance on `packStatus === 'Pack ready for
   * handoff'`, a string `packHandoffStatus` stopped returning when the copy was
   * rewritten. Permanently false, permanently unreachable, and nothing failed.
   * The function now returns `{ line, ready }` so the state travels with the
   * words it describes and cannot drift from them again.
   *
   * The full state table lives in `packHandoffStatus.test.js`; this asserts the
   * one thing the DELIVERY contract cares about — that the readiness the desk
   * reports is the readiness the package can actually support.
   */
  it('the desk’s ready flag follows the package, not a string literal', () => {
    const blocked = packHandoffStatus({ thin: !!packReadiness(pack).thin, pathFull: true })
    expect(blocked.ready).toBe(false)

    const done = projectFixture()
    done.logoImage = 'data:image/svg+xml;base64,PHN2Zy8+'
    done.detective = { ...done.detective, deliverablesPicked: ['logoPrimary'] }
    const readyPack = packFor(done)
    expect(packReadiness(readyPack).deliverableGaps).toEqual([])
    expect(
      packHandoffStatus({ thin: !!packReadiness(readyPack).thin, pathFull: true }).ready
    ).toBe(true)
  })

})

describe('mock ≠ produced ≠ delivered', () => {
  /**
   * These three hold today. They are pinned because each one is a boundary the
   * app states in prose and could lose in a refactor without any screen
   * changing.
   */
  it('an accepted Touchpoints mock produces no package file at all', () => {
    const project = projectFixture()
    project.touchpointApps = {
      businessCard: { done: true, check: { readable: true }, note: 'Signed off' },
    }
    const pack = packFor(project)
    expect(pack.touchpointApps.businessCard.done).toBe(true)
    // Nothing in packageAssets gained a business card by accepting the mock.
    expect(findProducedBusinessCard(pack.packageAssets)).toBeNull()
    const rows = deliverableChecklist(pack, packagePlan(pack, { assets: pack.packageAssets }))
    expect(rows.find((r) => r.id === 'businessCard').ok).toBe(false)
  })

  it('a produced card is real PDF bytes, and an image claiming to be one is not', () => {
    expect(
      isProducedBusinessCardArtifact({
        deliverable: 'businessCard',
        group: 'application',
        dataUrl: 'data:application/pdf;base64,JVBERi0=',
        /* Attribution and a mime type are what an UPLOAD carries, so they
           cannot answer where a file came from. Only a produce path stamps
           `producedBy`, so a row without it is package material rather than
           this app's output — see lib/brand/productionProvenance. Added here
           so the fixture is an actual produced card; the assertion below is
           unchanged and still rejects an image claiming to be one. */
        producedBy: 'businessCardProduce',
      })
    ).toBe(true)
    expect(
      isProducedBusinessCardArtifact({
        deliverable: 'businessCard',
        group: 'application',
        dataUrl: 'data:image/png;base64,AAAA',
      })
    ).toBe(false)
    // Held back for size: filed, but never counted as produced.
    expect(
      isProducedBusinessCardArtifact({
        deliverable: 'businessCard',
        group: 'application',
        heldBack: 'tooLarge',
        dataUrl: 'data:application/pdf;base64,JVBERi0=',
      })
    ).toBe(false)
  })

  it('production satisfies the bought item; nothing short of it does', () => {
    const project = projectFixture()
    project.packageAssets = [
      {
        id: 'bc',
        name: 'Sparrow business card',
        dataUrl: 'data:application/pdf;base64,JVBERi0=',
        group: 'application',
        item: 'businessCard',
        deliverable: 'businessCard',
        rights: 'clientOwned',
      },
    ]
    const pack = packFor(project)
    const rows = deliverableChecklist(pack, packagePlan(pack, { assets: pack.packageAssets }))
    expect(rows.find((r) => r.id === 'businessCard').ok).toBe(true)
  })

  it('a complete package is still not a delivery — only the row says delivered', () => {
    // Everything produced, everything verified, nothing published.
    expect(deliveryStage(null, false)).toBe('draft')
    expect(deliveryStage({ delivery_status: 'not_delivered' }, false)).toBe('draft')
    // Looking at what the client would get writes nothing server-side.
    expect(deliveryStage({ delivery_status: 'not_delivered' }, true)).toBe('preview')
    expect(deliveryStage({ delivery_status: 'delivered' }, false)).toBe('delivered')
  })
})

describe('the client’s copy explains itself after a reload', () => {
  /**
   * R3. The "their copy leaves out the moodboard" sentence lived in component
   * state, set once by the send and gone on the next reload — on a screen the
   * designer returns to for the rest of the project. It is not new state and it
   * was never worth storing: the delivered pack is the record, and the studio
   * view already fetches it.
   *
   * `deliveryGaps` reads the row. Same phrases as `buildDeliveryPack.dropped`,
   * from the same two constants, so the send-time sentence and the one a
   * designer sees a week later cannot describe the same fact differently.
   */
  const localPack = () => ({
    projectName: 'Sparrow',
    pins: [{ id: 'p1', visual: 'data:image/png;base64,AAAA' }],
    logoImage: 'data:image/svg+xml;base64,PHN2Zy8+',
  })
  const rowFor = (sent) => ({
    delivery_status: 'delivered',
    delivery_pack: { v: 1, pack: sent, book: null },
  })

  it('reports nothing when the client got everything', () => {
    expect(deliveryGaps(rowFor(localPack()), localPack())).toEqual([])
  })

  it('names the moodboard when the client’s copy has none', () => {
    const sent = { ...localPack(), pins: [] }
    expect(deliveryGaps(rowFor(sent), localPack())).toEqual(['the moodboard images'])
  })

  it('names both, in the order they were shed', () => {
    const sent = { ...localPack(), pins: [], logoImage: '' }
    expect(deliveryGaps(rowFor(sent), localPack())).toEqual([
      'the moodboard images',
      'the logo artwork',
    ])
  })

  /* THE RELOAD. Nothing is carried from the send — the row and the local pack
     are the only inputs, so a fresh mount answers identically. */
  it('says the same thing after a reload as it did at send time', () => {
    const pack = { ...localPack() }
    /* Heavy enough that the shed actually fires, so this is the real pair
       rather than a hand-built row. */
    pack.pins = [{ id: 'p1', visual: 'x'.repeat(DELIVERY_PACK_LIMIT) }]
    const { pack: sent, dropped } = buildDeliveryPack(pack)
    expect(dropped).toEqual(['the moodboard images'])

    // A later session: no memory of the send, just the row and the project.
    expect(deliveryGaps(rowFor(sent), pack)).toEqual(dropped)
  })

  it('says nothing about a delivery that was taken back', () => {
    const sent = { ...localPack(), pins: [] }
    const row = { ...rowFor(sent), delivery_status: 'not_delivered' }
    expect(deliveryGaps(row, localPack())).toEqual([])
  })

  it('survives a row with no pack, rather than inventing a gap', () => {
    expect(deliveryGaps({ delivery_status: 'delivered' }, localPack())).toEqual([])
    expect(deliveryGaps(null, localPack())).toEqual([])
    expect(deliveryGaps(rowFor(localPack()), null)).toEqual([])
  })
})
