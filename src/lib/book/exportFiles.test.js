import { describe, expect, it } from 'vitest'
import {
  buildBrandPackSnapshot,
  packReadiness,
  brandPackToMarkdown,
  brandPackToHtml,
  buildDirectionSheetMarkup,
  packBriefMarkdown,
  slugifyFilename,
  downloadBrandPackVectorPdf,
  downloadProjectOverviewPdf,
} from './exportFiles'

/* The pack's content streams are compressed, so raw byte-matching can only
   prove absence, not presence — parse the actual text layer instead. */
async function brandBookText(blob) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buf = new Uint8Array(await blob.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: buf }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    out += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return out
}

describe('slugifyFilename', () => {
  it('slugifies project names', () => {
    expect(slugifyFilename('Soft Signal Covers!')).toBe('soft-signal-covers')
  })
  it('falls back when empty', () => {
    expect(slugifyFilename('')).toBe('creative-companion')
    expect(slugifyFilename('???', 'pack')).toBe('pack')
  })
})

describe('buildBrandPackSnapshot', () => {
  it('builds a real empty-friendly pack from blank project pieces', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Test Pack',
        brief: 'Who: founders. Outcome: trust.',
        tagline: 'Quiet focus',
        voice: 'Calm direct',
        palette: ['#4F46E5', '#0D9488'],
      },
      tasks: [
        { id: 1, title: 'Write tagline', completed: false },
        { id: 2, title: 'Pick type pair', completed: true },
      ],
      moodItems: [
        {
          id: 9,
          type: 'color',
          note: 'Indigo calm',
          visual: '#4F46E5',
          inPack: true,
        },
      ],
    })

    expect(pack.projectName).toBe('Test Pack')
    expect(pack.tagline).toBe('Quiet focus')
    expect(pack.openTasks).toHaveLength(1)
    expect(pack.openTasks[0].title).toBe('Write tagline')
    expect(pack.doneCount).toBe(1)
    expect(pack.totalCount).toBe(2)
    expect(pack.progressPercent).toBe(50)
    expect(pack.palette).toEqual(['#4F46E5', '#0D9488'])
    expect(pack.pins[0].note).toBe('Indigo calm')
    expect(pack.studio).toBe('')
    expect(pack.exportedAt).toMatch(/^\d{4}-/)
  })

  /**
   * The bug this exists for: "Creative Companion" was hardcoded on five
   * client-facing surfaces and honoured on a sixth, so the checkbox claiming
   * to remove it worked on the book PDF and nowhere else. A designer could
   * find the control, understand it, tick it, and still ship the platform's
   * name on their client's direction sheet.
   *
   * Asserted per surface rather than on the shared helper, because the helper
   * was never the thing that was wrong — the call sites were, and four of them
   * did not call anything at all.
   */
  const surfaces = (studioName) => {
    const pack = buildBrandPackSnapshot({
      project: { name: 'Sparrow', palette: ['#111111'] },
      studioName,
    })
    return [brandPackToMarkdown(pack), packBriefMarkdown(pack), brandPackToHtml(pack)]
  }

  it('prints the studio name on every client-facing surface, never the app name', () => {
    for (const out of surfaces('Nichol Mahania Design')) {
      expect(out).toContain('Nichol Mahania Design')
      expect(out).not.toContain('Creative Companion')
    }
  })

  it('omits the credit segment entirely when no studio name is set', () => {
    const [md, brief, html] = surfaces('')
    for (const out of [md, brief, html]) {
      expect(out).not.toContain('Creative Companion')
      expect(out).not.toContain('·  ·')
    }
    /* No dangling separator where the credit used to be. Asserted against the
       footers specifically rather than the whole document — a first pass
       scanned every line for a leading "·" and caught the typography meta
       row (" · Plus Jakarta Sans Regular"), which is a legitimate separator
       and nothing to do with attribution. */
    expect(html).toContain('<footer class="direction-foot">Brand identity · ')
    expect(md).toMatch(/_Exported [^_]*[^ ·]_/)
    expect(brief).toContain('_brand pack_')
  })

  it('does not invent fake client names when empty', () => {
    const pack = buildBrandPackSnapshot({})
    expect(pack.projectName).toBe('Untitled project')
    expect(pack.brief).toBe('')
    expect(pack.openTasks).toEqual([])
    expect(pack.pins).toEqual([])
  })

  it('includes only starred pack pins (no fallback)', () => {
    const pack = buildBrandPackSnapshot({
      moodItems: [
        { id: 1, type: 'image', note: 'A', visual: '#111', inPack: false },
        { id: 2, type: 'image', note: 'B', visual: '#222', inPack: true },
      ],
    })
    expect(pack.pins).toHaveLength(1)
    expect(pack.pins[0].note).toBe('B')
    expect(pack.pinsStarredCount).toBe(1)
    expect(pack.pinsUsedFallback).toBe(false)
  })
})

describe('brandPackToMarkdown / brandPackToHtml', () => {
  const pack = buildBrandPackSnapshot({
    project: {
      name: 'Atlas',
      tagline: 'Maps for calm',
      brief: 'Design system for a focus app.',
      doUse: 'Soft contrast',
      /* Brief-owned: answered by the client, resolved at the pack boundary. */
      detective: { avoid: 'Neon chaos' },
      typeHeading: 'Display Bold',
      typeBody: 'Body Regular',
      palette: ['#112233'],
    },
    tasks: [{ id: 1, title: 'Lock type pair', completed: false }],
  })

  it('renders markdown with core sections', () => {
    const md = brandPackToMarkdown(pack)
    expect(md).toContain('# Atlas')
    expect(md).toContain('Maps for calm')
    expect(md).toContain('## Palette')
    expect(md).toContain('#112233')
    expect(md).toContain('Lock type pair')
    expect(md).toContain("## Don't")
  })

  it('renders standalone HTML offline pack', () => {
    const html = brandPackToHtml(pack)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Atlas')
    expect(html).toContain('Direction sheet')
    expect(html).toContain('#112233')
    expect(html).toContain('window.print')
  })
})

describe('buildDirectionSheetMarkup (preview-faithful PDF source)', () => {
  it('mirrors Export pack preview structure and classes', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Soft Signal',
        tagline: 'Quiet focus',
        brief: 'ADHD-friendly desk',
        doUse: 'Soft contrast',
        /* DESIGNER OVERRIDE, kept on purpose. `orgPhone`/`orgEmail`/`dontUse`
           resolve brief-first, but a designer-side value still wins — this is
           the fixture that exercises that branch through the real boundary
           rather than only through the resolver's own unit test. */
        dontUse: 'Neon',
        typeHeading: 'Display Bold',
        typeBody: 'Body Regular',
        palette: ['#4F46E5', '#0D9488'],
      },
      tasks: [{ id: 1, title: 'Lock type', completed: false }],
      moodItems: [
        {
          id: 2,
          type: 'color',
          note: 'Indigo',
          visual: '#4F46E5',
          inPack: true,
        },
      ],
    })
    const html = buildDirectionSheetMarkup(pack)
    expect(html).toContain('direction-sheet')
    expect(html).toContain('export-identity-cover')
    expect(html).toContain('Direction sheet')
    expect(html).toContain('Soft Signal')
    expect(html).toContain('Quiet focus')
    expect(html).toContain('direction-palette')
    expect(html).toContain('export-do-dont')
    expect(html).toContain('direction-pins')
    expect(html).toContain('direction-tasks')
    expect(html).toContain('Lock type')
    expect(html).toContain('Mood direction')
    expect(html).toContain('Open work')
  })
})

describe('designVersion bump helper is store-level', () => {
  it('snapshot includes designVersion and detective', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Ver',
        designVersion: 'v3',
        detective: { goal: 'G', audience: 'A' },
      },
    })
    expect(pack.designVersion).toBe('v3')
    expect(pack.detective?.goal).toBe('G')
  })
})

describe('packReadiness detective + handoff', () => {
  it('accepts detective goal as positioning signal', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Demo',
        brief: '',
        detective: { goal: 'Help families feel safe', audience: 'Parents' },
        palette: ['#111', '#222'],
        tagline: 'Safe',
        voice: 'Warm',
      },
      moodItems: [
        { id: 1, type: 'color', note: 'x', visual: '#111', inPack: true },
      ],
    })
    const r = packReadiness(pack)
    expect(r.checks.find((c) => c.id === 'detective')?.ok).toBe(true)
    expect(r.checks.find((c) => c.id === 'brief')?.ok).toBe(true)
    expect(r.checks.find((c) => c.id === 'handoff')?.ok).toBe(false)
    expect(r.thin).toBe(false)
  })
})

describe('vector pack snapshot fields', () => {
  it('includes colorRoles, logo lockup fields, and directions for brand book PDF', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Vector Pack Co',
        tagline: 'Sharp type',
        palette: ['#1C1917', '#0F766E'],
        colorRoles: { cover: '#1C1917', accent: '#0F766E' },
        logoImage: 'data:image/png;base64,abc',
        logoWordmark: 'Vector Co',
        logoClearspace: '½ mark height',
        logoDirection: 'Monoline mark',
        directions: [
          { id: 'a', label: 'A', title: 'Quiet', note: 'Soft', chosen: true },
        ],
      },
      moodItems: [
        {
          id: 1,
          type: 'color',
          note: 'Ink',
          visual: '#1C1917',
          inPack: true,
          packHero: true,
        },
      ],
    })
    expect(pack.colorRoles?.cover).toBe('#1C1917')
    expect(pack.logoImage).toContain('data:image')
    expect(pack.logoWordmark).toBe('Vector Co')
    expect(pack.logoClearspace).toMatch(/mark/)
    expect(pack.logoDirection).toMatch(/Monoline/)
    expect(pack.directions[0].chosen).toBe(true)
    expect(pack.pins[0].packHero).toBe(true)
  })

  it('includes messaging, imagery, and decision log in snapshot', () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Full Kit Co',
        messagingPromise: 'Calm care',
        messagingProof: '10 years',
        messagingPersonality: 'Warm expert',
        imageryStyle: 'Soft light',
        imageryDo: 'Real hands',
        imageryDont: 'Stock handshakes',
        logoMinSize: '24px',
        logoDonts: 'No stretch',
        decisionLog: [
          { kind: 'direction', label: 'B', title: 'Quiet teal', why: 'calm' },
        ],
      },
      palette: ['#111111', '#FAFAF9'],
    })
    expect(pack.messagingPromise).toMatch(/Calm/)
    expect(pack.imageryStyle).toMatch(/Soft/)
    expect(pack.logoMinSize).toBe('24px')
    expect(pack.decisionLog[0].label).toBe('B')
    const md = brandPackToMarkdown(pack)
    expect(md).toMatch(/Messaging pillars|Promise/)
    expect(md).toMatch(/Color system|CMYK|rgb/i)
    expect(md).toMatch(/Type scale/)
    expect(md).toMatch(/Imagery/)
  })
})

describe('downloadProjectOverviewPdf quality', () => {
  it('filled mode omits empty fields and blank mode includes AcroForm pages', async () => {
    const sparse = {
      name: 'My project',
      detective: {
        engagementType: 'extend',
      },
    }
    const filled = await downloadProjectOverviewPdf(sparse, {
      returnBlobOnly: true,
      blank: false,
    })
    expect(filled.ok).toBe(true)
    expect(filled.mode).toBe('filled')
    // One answered field → single short page, not a 2-page dash graveyard
    expect(filled.pages).toBe(1)

    const blank = await downloadProjectOverviewPdf(sparse, {
      returnBlobOnly: true,
      blank: true,
    })
    expect(blank.ok).toBe(true)
    expect(blank.mode).toBe('blank')
    expect(blank.pages).toBeGreaterThanOrEqual(2)
    expect(blank.pages).toBeLessThanOrEqual(3)
  })

  it('filled mode with no answers is a one-page note, not empty dashes', async () => {
    const empty = await downloadProjectOverviewPdf(
      { name: 'Empty Co', detective: {} },
      { returnBlobOnly: true, blank: false }
    )
    expect(empty.ok).toBe(true)
    expect(empty.pages).toBe(1)
  })
})

describe('downloadBrandPackVectorPdf quality', () => {
  it('skips empty chapters, avoids fake contact, and keeps WinAnsi-safe text', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'My project',
        tagline: '',
        palette: ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9'],
        colorRoles: {
          cover: '#1C1917',
          text: '#FFFFFF',
          accent: '#A8A29E',
          quiet: '#FAFAF9',
        },
        typeHeading: 'Plus Jakarta Sans Bold',
        typeBody: 'Plus Jakarta Sans Regular',
        designVersion: 'v1',
        orgEmail: '',
        orgWebsite: '',
      },
      tasks: [],
      moodItems: [],
    })

    const result = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    expect(result.ok).toBe(true)
    /* Thin pack: cover, then one page each for logo, color and type (each
       opening with a header band, not a separate divider page), then the
       closing and the writing rules the app supplies defaults for. No
       foundations, no imagery, no applications, no brief — nothing is drawn
       for content that isn't there. The floor dropped when section dividers
       became header bands (five full pages reclaimed on a full book); what the
       range still guards is that empty sections cost nothing. */
    expect(result.pages).toBeGreaterThanOrEqual(5)
    expect(result.pages).toBeLessThanOrEqual(9)

    const buf = Buffer.from(await result.blob.arrayBuffer())
    const text = buf.toString('latin1')
    // Never invent placeholder contact on the business-card specimen
    expect(text).not.toMatch(/hello@brand\.example/)
    expect(text).not.toMatch(/you@example\.com/)
  })

  /* Phase 1 listed eight items and shipped five. These three were the gap:
     16 (the plan and one CTA), 18 (writing guidelines), 19 (print and
     finish). Each is asserted against a real generated PDF rather than
     against the source, because "the field exists" is exactly the check that
     passed for Promise and Proof while the page rendered nothing. */
  it('prints the plan and the one action on Direction', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Harbor & Hearth',
        palette: ['#1B3A2F', '#C4A574', '#E8DCC8', '#F7F3EC'],
        detective: {
          messagingPlan: 'Call for a quote, we visit, you get a fixed price.',
          messagingCta: 'Book a visit.',
        },
      },
      tasks: [],
      moodItems: [],
    })
    expect(pack.messagingPlan).toMatch(/fixed price/)
    expect(pack.messagingCta).toBe('Book a visit.')

    const result = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    const text = await brandBookText(result.blob)
    expect(text).toMatch(/THE PLAN/)
    expect(text).toMatch(/THE ONE ACTION/)
    expect(text).toMatch(/Book a visit/)

    // And the written leave-behind must not disagree with the book.
    const md = brandPackToMarkdown(pack)
    expect(md).toMatch(/The one action:\*\* Book a visit/)
  })

  it('prints a writing rule even for a project saved before the keys existed', async () => {
    // No writingCase/writingCaps anywhere — the v5-migration hole.
    const pack = buildBrandPackSnapshot({
      project: { name: 'Legacy Co', palette: ['#111111', '#FAFAF9'] },
      tasks: [],
      moodItems: [],
    })
    expect(pack.writingCase).toBe('sentence')

    const result = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    const text = await brandBookText(result.blob)
    expect(text).toMatch(/WRITING/)
    expect(text).toMatch(/sentence case/i)
    expect(text).toMatch(/ALL CAPS/)
  })

  it('honours a title-case choice instead of printing the default', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Titled Co',
        palette: ['#111111', '#FAFAF9'],
        writingCase: 'title',
        writingCaps: 'never',
      },
      tasks: [],
      moodItems: [],
    })
    const result = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    const text = await brandBookText(result.blob)
    expect(text).toMatch(/title case/i)
    expect(text).toMatch(/Never set copy in ALL CAPS/)
    expect(text).not.toMatch(/capital on the first word only/i)
  })

  it('prints print and finish specs, and omits them when unfilled', async () => {
    const filled = buildBrandPackSnapshot({
      project: {
        name: 'Press Co',
        palette: ['#111111', '#FAFAF9'],
        printPantone: '871C on the cream',
        printStock: '350gsm uncoated',
        printFinish: 'Matt lamination, spot UV on the mark',
      },
      tasks: [],
      moodItems: [],
    })
    const a = await downloadBrandPackVectorPdf(filled, null, {
      returnBlobOnly: true,
    })
    const textA = await brandBookText(a.blob)
    expect(textA).toMatch(/PANTONE MATCH/)
    expect(textA).toMatch(/350gsm uncoated/)
    expect(textA).toMatch(/spot UV/)

    /* An empty ruled row in a deliverable reads as "we never did this" — the
       same omit rule the Agreed brief section follows. */
    const bare = buildBrandPackSnapshot({
      project: { name: 'Press Co', palette: ['#111111', '#FAFAF9'] },
      tasks: [],
      moodItems: [],
    })
    const b = await downloadBrandPackVectorPdf(bare, null, {
      returnBlobOnly: true,
    })
    const textB = await brandBookText(b.blob)
    expect(textB).not.toMatch(/PANTONE MATCH/)
    expect(textB).not.toMatch(/PAPER STOCK/)
  })

  /* Phase 4 — the Applications page renders what the client named. Asserted
     against real PDFs because the failure mode is visual: the old page did
     not error, it just showed a bakery an app screen and an app an
     unbranded carrier bag. */
  const packFor = (detective) =>
    buildBrandPackSnapshot({
      project: {
        name: 'Harbor & Hearth',
        tagline: 'Brew slow.',
        palette: ['#1B3A2F', '#C4A574', '#E8DCC8', '#F7F3EC'],
        detective,
      },
      tasks: [],
      moodItems: [],
    })

  it('shows an app-only brand an app, and no carrier bag', async () => {
    const pack = packFor({ brandSurfaces: ['app', 'website'] })
    const r = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    const text = await brandBookText(r.blob)
    // \b so this cannot pass by matching the page head "Applications".
    expect(text).toMatch(/\bAPP\b/)
    expect(text).toMatch(/WEBSITE/)
    expect(text).not.toMatch(/PACKAGING/)
    expect(text).not.toMatch(/SIGNAGE/)
  })

  it('shows a packaging brand packaging, and no app screen', async () => {
    const pack = packFor({ brandSurfaces: ['packaging', 'signage'] })
    const text = await brandBookText(
      (await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true }))
        .blob
    )
    expect(text).toMatch(/PACKAGING/)
    expect(text).toMatch(/SIGNAGE/)
    expect(text).not.toMatch(/\bAPP\b/)
  })

  it('treats print as including the business card', async () => {
    const pack = packFor({ brandSurfaces: ['print'] })
    const text = await brandBookText(
      (await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true }))
        .blob
    )
    expect(text).toMatch(/BUSINESS CARD/)
    expect(text).toMatch(/PRINT/)
  })

  it('falls back to the old four when the client named nothing', async () => {
    // A book for an older project must not come out emptier than yesterday.
    const pack = packFor({})
    const text = await brandBookText(
      (await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true }))
        .blob
    )
    expect(text).toMatch(/BUSINESS CARD/)
    expect(text).toMatch(/SOCIAL POST/)
    expect(text).toMatch(/PACKAGING/)
    expect(text).toMatch(/SIGNAGE/)
  })

  it('tells the client the page answers their own brief', async () => {
    const named = await brandBookText(
      (
        await downloadBrandPackVectorPdf(packFor({ brandSurfaces: ['app'] }), null, {
          returnBlobOnly: true,
        })
      ).blob
    )
    expect(named).toMatch(/places you said this brand lives/)

    const generic = await brandBookText(
      (
        await downloadBrandPackVectorPdf(packFor({}), null, {
          returnBlobOnly: true,
        })
      ).blob
    )
    expect(generic).toMatch(/how the brand shows up in the world/)
  })

  it('lays out all nine mocks without dropping or doubling any', async () => {
    /* The layout loop pages when a row will not fit. The bug class to guard
       against is the one that hit the Direction tiles: a row offset computed
       and then discarded, so two mocks paint on the same spot. Text
       extraction cannot see overlap, but it can prove every label was
       emitted exactly once and none were lost to a page break. */
    const pack = packFor({
      brandSurfaces: [
        'print',
        'social',
        'website',
        'app',
        'email',
        'packaging',
        'merch',
        'signage',
      ],
    })
    const r = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    const text = await brandBookText(r.blob)

    const labels = [
      'BUSINESS CARD',
      'PRINT',
      'SOCIAL POST',
      'WEBSITE',
      'APP',
      'EMAIL',
      'PACKAGING',
      'MERCH',
      'SIGNAGE',
    ]
    for (const label of labels) {
      const hits = text.match(new RegExp(`\\b${label}\\b`, 'g')) || []
      expect(hits.length, `${label} appeared ${hits.length} times`).toBe(1)
    }
    // Nine mocks cannot fit on one page — it must have continued.
    expect(text).toMatch(/Continued\./)
  })

  it('renders the agreed-brief section with the question and answer, and no form hints', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Harbor & Hearth',
        tagline: 'Brew slow. Bring home.',
        palette: ['#1B3A2F', '#C4A574', '#E8DCC8', '#F7F3EC'],
        colorRoles: {
          cover: '#1B3A2F',
          text: '#1B3A2F',
          accent: '#C4A574',
          quiet: '#F7F3EC',
        },
        typeHeading: 'Plus Jakarta Sans Bold',
        typeBody: 'Plus Jakarta Sans Regular',
        designVersion: 'v1',
        /* A handoff note so the book actually has a Handoff page: the
           cross-reference below is a property OF that page, and the book no
           longer draws one for a project with nothing to hand off. */
        handoffNote: 'Ship the lockups and the token file.',
        detective: {
          clientName: 'Harbor & Hearth Co.',
          goal: 'Look like a neighborhood staple, not a trend cafe.',
        },
      },
      tasks: [],
      moodItems: [],
    })

    const result = await downloadBrandPackVectorPdf(pack, null, {
      returnBlobOnly: true,
    })
    expect(result.ok).toBe(true)

    // The pack's content streams are compressed (jsPDF `compress: true`), so
    // raw byte-matching can only prove absence, not presence — parse the
    // actual text layer instead.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const buf = new Uint8Array(await result.blob.arrayBuffer())
    const doc = await pdfjs.getDocument({ data: buf }).promise
    let fullText = ''
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      fullText += content.items.map((it) => it.str).join(' ') + '\n'
    }

    expect(fullText).toMatch(/Agreed brief/)
    // The question and the client's answer render.
    expect(fullText).toMatch(/Business name/)
    expect(fullText).toMatch(/Harbor & Hearth Co\./)

    /* The form's worked-example tips must NOT render. They are the grey
       examples that sit under the fields to help the designer answer, and they
       were being printed in italics above the client's own words — so every
       book carried "e.g. Sarah Whitton, Owner" and "e.g. you@studio.com" in
       its appendix, a fictional person and a stranger's address in the
       client's document. This assertion is inverted from what it used to
       claim, deliberately: the old contract was that a question is never asked
       bare, and the cost of that was leaking the app's scaffolding into the
       deliverable. */
    expect(fullText).not.toMatch(/Trading name is fine/)
    expect(fullText).not.toMatch(/e\.g\. Sarah Whitton/)
    expect(fullText).not.toMatch(/you@studio\.com/)
    // Handoff points at the section instead of duplicating it.
    expect(fullText).toMatch(/Full agreed brief/)
  })
})

describe('packBriefMarkdown', () => {
  it('builds a short client brief', () => {
    const md = packBriefMarkdown({
      projectName: 'Soft Signal',
      tagline: 'Calm covers',
      brief: 'For designers who scatter.',
      palette: ['#1C1917', '#0F766E'],
      pins: [{ note: 'Mood A' }],
    })
    expect(md).toMatch(/Soft Signal/)
    expect(md).toMatch(/Calm covers/)
    expect(md).toMatch(/#1C1917/)
    expect(md).toMatch(/Mood A/)
    expect(md.length).toBeLessThan(800)
  })
})
