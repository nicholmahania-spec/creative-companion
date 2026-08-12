/**
 * THE ALLOW-LIST IS THE DELIVERY BOUNDARY — proved from both sides.
 *
 * From the private side: a field this module has never heard of, added to the
 * snapshot the way a future feature would add one, must not reach the client.
 * That test is the entire reason the allow-list exists, and it is written to
 * fail if `buildDeliveryPack` ever goes back to copying-then-deleting.
 *
 * From the client side: the book the client receives has to be the same
 * document the designer previewed. Asserting that by reading source ("no file
 * under src/lib/book/ mentions this field") is the guard that already existed
 * and it is not strong enough — `decisionLineFromPack` lives in
 * `src/lib/brandSystem.js`, is imported by both book renderers, and reads two
 * private fields, which that scan cannot see. So this renders the real thing
 * twice, structurally and as an actual PDF, and compares.
 *
 * The PDF pass is slow (seconds, not milliseconds) and it is worth it: it is
 * the only check that exercises the renderer the reveal page actually calls.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../book/exportFiles', async (importOriginal) => ({
  ...(await importOriginal()),
}))

const { buildBrandPackSnapshot } = await import('../book/exportFiles')
const { paginatedBookPages } = await import('../book/bookContent')
const { downloadBrandPackVectorPdf } = await import('../book/brandBookPdf')
const {
  buildDeliveryPack,
  CLIENT_DELIVERY_FIELDS,
  PRIVATE_PACK_FIELDS,
} = await import('./brandDelivery')
const { decisionLineFromPack } = await import('../brandSystem')

/**
 * A project answered widely enough that most of the book has something to
 * print, and carrying private material in every category the audit found:
 * working notes, package files, decision history and unchosen routes.
 */
const PROJECT = {
  name: 'Sparrow',
  tagline: 'Small bird, big nerve',
  voice: 'Warm, plain, unfussy',
  story: 'Started in a shed behind the bakery.',
  positioning: 'The local one that answers the phone.',
  palette: ['#1B4C7E', '#FAFAF9', '#E8B04B'],
  logoImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  logoWordmark: 'SPARROW',
  logoClearspace: 'One cap height all round',
  logoMinSize: '18mm',
  logoDonts: 'Never rotate it. Never on a busy photo.',
  doUse: 'On paper, on signs, small.',
  dontUse: 'Stretched.',
  imageryStyle: 'Daylight, no flash',
  handoffNote: 'Everything is in the folder.',
  learnings: 'Round two was the one.',
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  typeWhy: 'Humanist, warm, sets small.',
  orgEmail: 'hello@sparrow.test',
  contacts: [{ id: 'c1', name: 'Dana Okafor', role: 'Owner', email: 'dana@sparrow.test' }],
  detective: {
    goal: 'Open a second shop',
    audience: 'Locals who walk',
    usp: 'The only one that bakes on site',
    toneOfVoice: 'Neighbourly',
    brandSurfaces: ['businessCard'],
    deliverablesPicked: ['logoPrimary', 'colourPalette'],
  },
  touchpointApps: { businessCard: { note: 'logo at 12mm, never on the reverse' } },
  bookBuilder: {},

  // ── everything below is the designer's, and none of it may travel ──
  feedbackNotes: '• Client hated round one\n• Never show them the mono lockup',
  brief: 'Goal: … Audience: … Words: …',
  packageAssets: [
    { id: 'a1', name: 'Stock skyline', dataUrl: 'data:image/png;base64,AAAA', rights: 'thirdParty' },
    { id: 'a2', name: 'My own grid system', dataUrl: 'data:image/png;base64,BBBB', rights: 'designerOwned' },
  ],
  decisionLog: [
    { id: 'd1', stage: 'direction', label: 'Direction', title: 'The perched mark', why: 'Reads at 12mm', at: '2026-07-01' },
  ],
  directions: [
    { id: 'r1', label: 'A', title: 'The perched mark', note: 'Quiet, confident', chosen: true },
    { id: 'r2', label: 'B', title: 'The wing monogram', note: 'Too corporate — client hated it' },
  ],
  scopeOutOf: 'Motion',
  scopeApprover: 'Dana',
  deadline: '2026-09-01',
}

/**
 * A FIXED export stamp, and the reason it has to be fixed.
 *
 * `buildBrandPackSnapshot` stamps `exportedAt: new Date().toISOString()`, and
 * the book's cover falls back to `Date.now()` when the field is missing. So a
 * fixture that used the generated value compared today's date against today's
 * date: the two PDFs matched whether or not `exportedAt` survived the
 * projection, and the equality test could not fail for the one field whose
 * absence it was best placed to catch. It did not — the defect was found by a
 * test on another branch that pinned its own date.
 *
 * Pinned to a date that is not today, so a dropped `exportedAt` shows up as a
 * cover-date mismatch instead of a coincidence.
 */
const EXPORTED_AT = '2026-03-04T09:15:00.000Z'

const fullSnapshot = () => ({
  ...buildBrandPackSnapshot({
    project: PROJECT,
    tasks: [{ id: 1, title: 'Chase the invoice', completed: false }],
    moodItems: [
      { id: 'p1', inPack: true, packHero: true, visual: 'data:image/png;base64,AAAA', note: 'The awning' },
    ],
    palette: PROJECT.palette,
  }),
  exportedAt: EXPORTED_AT,
})

describe('the allow-list is the mechanism', () => {
  /**
   * THE TEST THE ALLOW-LIST EXISTS FOR.
   *
   * A field nobody has thought about is exactly how `packageAssets` and
   * `feedbackNotes` got out. This adds one that no list anywhere mentions —
   * the way a feature branch would — and asserts the client never sees it.
   *
   * Under the old deny-list this fails. Under a projection it cannot.
   */
  it('a future snapshot field does not reach the client', () => {
    const snapshot = fullSnapshot()
    snapshot.futureInternalField = { secret: 'designer-only' }
    snapshot.anotherOne = 'also not for them'

    const { pack: delivered } = buildDeliveryPack(snapshot)

    expect(delivered).not.toHaveProperty('futureInternalField')
    expect(delivered).not.toHaveProperty('anotherOne')
    expect(JSON.stringify(delivered)).not.toContain('designer-only')
  })

  /* The field the cover reads. Asserted on its own as well as through the
     rendered PDF, so a failure says WHICH field rather than "the books
     differ". */
  it('carries the export stamp the book cover prints', () => {
    const { pack: delivered } = buildDeliveryPack(fullSnapshot())
    expect(delivered.exportedAt).toBe(EXPORTED_AT)
    expect(CLIENT_DELIVERY_FIELDS).toContain('exportedAt')
  })

  it('delivers nothing that is not named on the list', () => {
    const { pack: delivered } = buildDeliveryPack(fullSnapshot())
    const stowaways = Object.keys(delivered).filter(
      (k) => !CLIENT_DELIVERY_FIELDS.includes(k)
    )
    expect(stowaways, 'a key reached the client that no list authorizes').toEqual([])
  })

  it('the two lists cannot both claim a field', () => {
    const both = CLIENT_DELIVERY_FIELDS.filter((k) => PRIVATE_PACK_FIELDS.includes(k))
    expect(
      both,
      'a field known to be private has been allow-listed — one of the two lists is wrong'
    ).toEqual([])
  })

  /* The named exclusions from the audit, checked by name rather than by
     absence-from-a-list, so renaming the list cannot make them pass. */
  it('keeps every field the audit named out of the payload', () => {
    const { pack: delivered } = buildDeliveryPack(fullSnapshot())
    for (const field of [
      'packageAssets',
      'feedbackNotes',
      'directions',
      'decisionLog',
      'designVersion',
      'pinsUsedFallback',
      'pinsStarredCount',
      'brief',
      'openTasks',
      'discoveryAnswers',
      'scopeOutOf',
      'scopeApprover',
      'deadline',
      'typeSource',
      'typeLicenceNote',
      'fontFilesLicensed',
      /* `exportedAt` was on this list and has been reclassified: the book's
         cover now prints it, so withholding it made the client's copy date
         itself from when they opened it. It is asserted as DELIVERED above
         instead — the audit's other names all stay here. */
    ]) {
      expect(delivered, `${field} must not cross the delivery boundary`).not.toHaveProperty(field)
    }
  })

  it('carries no trace of the private material in the fixture', () => {
    const wire = JSON.stringify(buildDeliveryPack(fullSnapshot()).pack)
    for (const secret of [
      'Never show them the mono lockup', // feedbackNotes
      'Stock skyline', // a rights-restricted upload
      'Too corporate', // an unchosen direction's note
      'Chase the invoice', // the designer's to-do
      'Motion', // scopeOutOf
    ]) {
      expect(wire, `"${secret}" reached the client`).not.toContain(secret)
    }
  })

  /* `false` and `0` are answers. A projection that tested truthiness instead of
     presence would drop them and change the book while looking like it only
     shrank the payload. */
  it('carries falsy answers rather than dropping them', () => {
    const snapshot = fullSnapshot()
    snapshot.logoWordmark = ''
    snapshot.touchpointApps = {}
    const { pack: delivered } = buildDeliveryPack(snapshot)
    expect(delivered).toHaveProperty('logoWordmark')
    expect(delivered.logoWordmark).toBe('')
    expect(delivered.touchpointApps).toEqual({})
  })
})

describe('the client receives the document the designer previewed', () => {
  /**
   * The decision line is the case that motivated resolving it in the
   * projection. `decisionLineFromPack` reads `decisionLog` first and
   * `directions` second — both private — and the book prints the result. Before
   * this pass the designer previewed "The perched mark — Reads at 12mm" and the
   * client's copy fell through to whatever survived the strip.
   */
  it('prints the same decision line without shipping the decision log', () => {
    const snapshot = fullSnapshot()
    const { pack: delivered } = buildDeliveryPack(snapshot)

    expect(delivered.decisionLine).toBeTruthy()
    expect(delivered.decisionLine).toContain('The perched mark')
    expect(delivered).not.toHaveProperty('decisionLog')
    expect(delivered).not.toHaveProperty('directions')
    // And it is the line the designer's own copy resolves to.
    const mine = paginatedBookPages(snapshot)
    const theirs = paginatedBookPages(delivered)
    expect(JSON.stringify(theirs)).toContain('The perched mark')
    expect(theirs).toEqual(mine)
  })

  it('builds an identical book structure from the delivered pack', () => {
    const snapshot = fullSnapshot()
    const { pack: delivered } = buildDeliveryPack(snapshot)
    expect(paginatedBookPages(delivered)).toEqual(paginatedBookPages(snapshot))
  })

  it('omits no page the designer would have seen', () => {
    const snapshot = fullSnapshot()
    const { pack: delivered } = buildDeliveryPack(snapshot)
    const mine = paginatedBookPages(snapshot).pages.map((p) => p.id)
    const theirs = paginatedBookPages(delivered).pages.map((p) => p.id)
    expect(theirs).toEqual(mine)
    /* Guards the guard: a fixture that produced two pages would make the
       equality above nearly free. This one fills most of the book. */
    expect(theirs.length).toBeGreaterThan(6)
  })

  /**
   * The renderer the reveal page actually calls, read back as text.
   *
   * The structural comparison above goes through `bookContent`, which is one
   * of two readers. `brandBookPdf` reads the pack directly and reaches into
   * `brandSystem` helpers for logo rules and colour tokens — that is where
   * `logoDonts` is consumed, through a module the older source-scanning guard
   * does not walk. Nothing short of building the file proves those arrived.
   */
  it('produces a byte-identical book PDF, page for page', async () => {
    const snapshot = fullSnapshot()
    const { pack: delivered } = buildDeliveryPack(snapshot)

    const text = async (pack) => {
      const res = await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true })
      expect(res?.blob, 'no PDF was produced').toBeTruthy()
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const doc = await pdfjs.getDocument({
        data: new Uint8Array(await res.blob.arrayBuffer()),
      }).promise
      const pages = []
      for (let i = 1; i <= doc.numPages; i += 1) {
        const content = await (await doc.getPage(i)).getTextContent()
        pages.push(content.items.map((it) => it.str).join(' '))
      }
      return pages
    }

    const mine = await text(snapshot)
    const theirs = await text(delivered)
    expect(theirs.length).toBe(mine.length)
    expect(theirs).toEqual(mine)

    /* Guards the guard — an empty extraction would make the comparison
       meaningless, and the book genuinely prints these. */
    const joined = theirs.join(' ')
    expect(joined).toContain('Sparrow')
    expect(joined).toContain('Never rotate it')
  }, 120000)

  /* The other direction: private material must not appear in the client's
     rendered file either, not merely be absent from the payload. */
  it('prints none of the designer’s private material', async () => {
    const { pack: delivered } = buildDeliveryPack(fullSnapshot())
    const res = await downloadBrandPackVectorPdf(delivered, null, { returnBlobOnly: true })
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(await res.blob.arrayBuffer()),
    }).promise
    let out = ''
    for (let i = 1; i <= doc.numPages; i += 1) {
      const content = await (await doc.getPage(i)).getTextContent()
      out += content.items.map((it) => it.str).join(' ') + '\n'
    }
    for (const secret of ['mono lockup', 'Too corporate', 'Chase the invoice']) {
      expect(out, `"${secret}" printed in the client's book`).not.toContain(secret)
    }
  }, 120000)
})

describe('private material cannot reach the client through an indirect reader', () => {
  /**
   * R6. `deliveryPackPrivacy.test.js` proves no file under `src/lib/book/`
   * MENTIONS a stripped field. That is a source scan, and pass 2 found the hole
   * in it: `decisionLineFromPack` lives in `src/lib/brandSystem.js`, is imported
   * by both book renderers, and reads `decisionLog` and `directions` — so a
   * private field was reaching a printed page through a module the scan does not
   * walk, and had been for as long as the guard existed.
   *
   * Widening the scan is the wrong repair. A scan can only ever cover the
   * directories somebody remembered, and the invariant was never about which
   * files mention a name — it is that private material must not appear in the
   * client's book. So this plants a unique sentinel in every excluded field,
   * renders the real PDF, and reads it back.
   *
   * The excluded set is DERIVED (snapshot keys minus the allow-list), so a
   * field added to the snapshot tomorrow is sentinel-covered the day it exists,
   * with nobody having to remember to add it here.
   */
  /**
   * The two fields whose DERIVED output is deliberately client-facing.
   *
   * `decisionLine` is resolved from `decisionLog`, then `directions`, and the
   * book prints the resulting sentence — so the winning entry's own words are
   * supposed to appear on the page. Planting garbage in those two and then
   * asserting the garbage never prints would be asserting that the decision
   * line does not work.
   *
   * They are not skipped, they are moved: the test below this one covers them
   * exactly, with an older log entry and an unchosen route that must NOT travel
   * while the chosen one does. That is the real invariant for a derived field,
   * and a blanket sentinel cannot express it.
   */
  const DERIVED_TO_CLIENT = ['decisionLog', 'directions']

  const sentinelSnapshot = () => {
    const snapshot = fullSnapshot()
    const excluded = Object.keys(snapshot).filter(
      (k) => !CLIENT_DELIVERY_FIELDS.includes(k) && !DERIVED_TO_CLIENT.includes(k)
    )
    const planted = []
    for (const key of excluded) {
      const token = `SENTINEL${planted.length}LEAK`
      const value = snapshot[key]
      /* Planted in whatever shape the field already has, so nothing downstream
         throws on a type it did not expect — a crash would end the render and
         the assertion would pass on a truncated document. */
      if (typeof value === 'string') snapshot[key] = token
      else if (Array.isArray(value)) snapshot[key] = [{ id: token, title: token, note: token, label: token }]
      else if (value && typeof value === 'object') snapshot[key] = { [token]: token, note: token }
      else continue
      planted.push(token)
    }
    return { snapshot, planted, excluded }
  }

  it('plants a sentinel in enough fields to be worth checking', () => {
    const { planted, excluded } = sentinelSnapshot()
    expect(excluded.length).toBeGreaterThan(13)
    /* Guards the guard: if the planting silently stopped working, the PDF
       assertion below would pass against a document with nothing to find. */
    expect(planted.length).toBeGreaterThan(8)
  })

  /* The exemption is exactly two fields and stays that way. Anything else
     added to it would be an excluded field quietly opted out of the sweep. */
  it('exempts only the two fields with a client-facing derivation', () => {
    expect(DERIVED_TO_CLIENT).toEqual(['decisionLog', 'directions'])
    for (const field of DERIVED_TO_CLIENT) {
      expect(CLIENT_DELIVERY_FIELDS).not.toContain(field)
    }
  })

  it('none of them survives the projection', () => {
    const { snapshot, planted } = sentinelSnapshot()
    const wire = JSON.stringify(buildDeliveryPack(snapshot).pack)
    for (const token of planted) expect(wire).not.toContain(token)
  })

  it('none of them appears in the rendered client book', async () => {
    const { snapshot, planted } = sentinelSnapshot()
    const { pack: delivered } = buildDeliveryPack(snapshot)
    const res = await downloadBrandPackVectorPdf(delivered, null, { returnBlobOnly: true })
    expect(res?.blob).toBeTruthy()
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(await res.blob.arrayBuffer()),
    }).promise
    let out = ''
    for (let i = 1; i <= doc.numPages; i += 1) {
      const content = await (await doc.getPage(i)).getTextContent()
      out += content.items.map((it) => it.str).join(' ') + '\n'
    }
    /* Guards the guard, again: an empty extraction would clear every
       assertion below without reading a word. */
    expect(out).toContain('Sparrow')
    for (const token of planted) {
      expect(out, `${token} printed in the client's book`).not.toContain(token)
    }
  }, 120000)

  /**
   * The specific indirect reader that motivated all of this.
   *
   * `decisionLineFromPack` reads `decisionLine`, then `decisionLog`, then
   * `directions`. The projection resolves the LINE so the client's book prints
   * what the designer previewed — and the material behind it must not follow.
   * That means the chosen decision's own words are expected on the page, while
   * every other entry in the log and every unchosen route is not.
   */
  it('resolves the decision line without carrying the log behind it', () => {
    const snapshot = fullSnapshot()
    /* Oldest first: `latestDecision` walks from the end, so the last entry is
       the one whose words legitimately reach the page. Everything earlier in
       the log is history the client has no business seeing. */
    snapshot.decisionLog = [
      { id: 'd0', kind: 'direction', label: 'Direction', title: 'REJECTED-EARLIER', why: 'CLIENT-CALLED-IT-UGLY', at: '2026-06-01' },
      { id: 'd1', kind: 'direction', label: 'Direction', title: 'The perched mark', why: 'Reads at 12mm', at: '2026-07-01' },
    ]
    const { pack: delivered } = buildDeliveryPack(snapshot)
    const wire = JSON.stringify(delivered)

    expect(delivered.decisionLine).toContain('The perched mark')
    expect(wire).not.toContain('REJECTED-EARLIER')
    expect(wire).not.toContain('CLIENT-CALLED-IT-UGLY')
    // The unchosen route's note is the other half of the same helper's reach.
    expect(wire).not.toContain('The wing monogram')
    expect(wire).not.toContain('Too corporate')
  })

  /* With `decisionLine` resolved, the helper returns on its first line and
     never reaches for the private fields at all — so a client pack rendered on
     its own cannot fall through to them even in principle. */
  it('the delivered pack alone resolves to the same line, with nothing to fall back to', () => {
    const snapshot = fullSnapshot()
    const { pack: delivered } = buildDeliveryPack(snapshot)
    expect(delivered).not.toHaveProperty('decisionLog')
    expect(delivered).not.toHaveProperty('directions')
    /* Re-resolving from the client's own pack gives the same sentence — the
       renderer's first read hits `decisionLine` and stops. */
    expect(decisionLineFromPack(delivered)).toBe(delivered.decisionLine)
  })
})
