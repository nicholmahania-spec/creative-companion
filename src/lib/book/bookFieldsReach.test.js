import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { buildBrandPackSnapshot, downloadBrandPackVectorPdf } from './exportFiles'

/**
 * Every field the book shows you must reach the book the client receives.
 *
 * `logoDirection` had an editor on the Design page, rendered on the artboard
 * and on the book's notes page — and was printed nowhere in the PDF. It was
 * the only field in the whole book that never reached the deliverable, which
 * is the Promise/Proof defect pointing the other way: not a panel bound to a
 * field nothing writes, but a field you write that nothing prints.
 *
 * Two guards, because either alone can be fooled. The first parses real
 * generated output, so it fails if the drawing stops happening. The second
 * greps the generator, so a field added to the book on screen and forgotten
 * in the PDF fails at the point it is forgotten, without waiting for someone
 * to write a rendering test for it.
 */

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

describe('the logo direction reaches the client', () => {
  it('prints on the Logo page of the generated PDF', async () => {
    const pack = buildBrandPackSnapshot({
      project: {
        name: 'Harbor & Hearth',
        logoWordmark: 'Harbor & Hearth',
        logoDirection: 'A quiet monogram that survives a one-inch stamp.',
        palette: ['#1C1917', '#0F766E', '#A8A29E'],
      },
      tasks: [],
      moodItems: [],
    })

    const result = await downloadBrandPackVectorPdf(pack, null, { returnBlobOnly: true })
    expect(result.ok).toBe(true)

    const text = await brandBookText(result.blob)
    expect(text).toContain('survives a one-inch stamp')
  }, 60_000)

  it('is not silently dropped when the generator changes', () => {
    /* A cheap structural backstop for the expensive test above: the field has
       to be read by name somewhere in the generator. If a refactor removes the
       draw, this fails immediately rather than only when someone reruns a
       60-second PDF render. */
    const src = readFileSync(new URL('./brandBookPdf.js', import.meta.url), 'utf8')
    expect(src).toMatch(/logoDirection/)
  })
})

/**
 * The general form of the same rule, which the docstring above always claimed
 * and only ever enforced for one field.
 *
 * "Every field the book shows you must reach the book the client receives" was
 * written after logoDirection was found with an editor, an on-screen render
 * and no printing. The two guards below it check exactly that one field. Any
 * other field could acquire an editor and print nowhere, and did: typeWhy
 * asked "Why these fonts" on the Identity page and reached no artifact of any
 * kind — caught here as an exemption, then resolved 2026-08-01 by printing it
 * on the book's type page (it now appears in brandBookPdf.js), which is why it
 * is no longer in EXEMPT below.
 *
 * So this checks the set rather than the instance: every field with an editor
 * must appear in something a client receives. Exemptions are listed with their
 * reason, because an unexplained exemption is how the original single-field
 * version of this rule stayed single-field.
 */
const SRC_ROOT = new URL('../..', import.meta.url).pathname

function allSource() {
  const out = []
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.jsx?$/.test(e.name) && !/\.test\./.test(e.name)) out.push(full)
    }
  }
  walk(SRC_ROOT)
  return out
}

/** Things a client actually receives. */
const CLIENT_ARTIFACTS = [
  'lib/book/brandBookPdf.js',
  'lib/book/exportFiles.js',
  'lib/projectTerms.js',
  'lib/brandSystem.js',
  'lib/book/caseStudy.js',
  'components/StationeryKit.jsx',
  /* Composes the surface list the book prints from. `designerSurfaces` — the
     surfaces the designer added at Touchpoints rather than the client naming
     them in the brief — reaches the pack through `allBrandSurfaces` here, so
     this file is part of the route to a client artifact even though it draws
     nothing itself. */
  'lib/journey/touchpoints.js',
]

const EXEMPT = {
  /* The designer's private notes. NEVER printed — that is the entire point of
     the field, and privacy here is structural rather than promised:
     buildBrandPackSnapshot copies named fields only, so nothing that reaches a
     client can pick it up. If this ever appears in a client artifact, the bug
     is the artifact, not this exemption. */
  privateNotes: 'private by design — must never reach a client artifact',
  /* Where the client buys the fonts and what the licence permits. These DO
     reach the client, through the typography sheet in the package
     (lib/deliver/packageFiles.js) rather than through the book — the package
     is a client artifact this list predates. */
  typeSource: 'printed in the package typography sheet, not the book',
  typeLicenceNote: 'printed in the package typography sheet, not the book',
  fontFilesLicensed: 'decides whether the package ships font files at all',
  /* Drives the Identity completion gate (journeyProgress.js) and the palette
     health read. Internal rationale — deliberately not printed. */
  colorRoleWhy: 'feeds a completion gate, not a deliverable',
  /* Optional Assets ship polish — not path-done (audit 2026-08-03). */
  deliverWordsChecked: 'optional ship polish checkboxes, not a deliverable',
  /* UI resume only — which Mark/Color/Type/Handover screen was last. */
  identitySubstep: 'resume position on Identity, not a deliverable field',
  /* `touchpointApps` was exempted here until 2026-08-05. It is no longer
     written through `updateBrandField` at all — it is plain project state read
     by journeyProgress — so it never reaches this check, and the exemption was
     documentation for a decision that no longer applies. Removed rather than
     kept "just in case": that is precisely the stale-exemption case the last
     test in this file exists to catch, and it was failing on it. */
  /* `logoClientChose` was exempted here until 2026-08-08. Its text box is
     gone: which route was chosen is now the starred concept in
     `logoConcepts`, which is the actual thing rather than a note about it.
     The stored field stays for projects that already filled it in, but
     nothing writes it any more, so it never reaches this check — the same
     stale-exemption case `touchpointApps` hit above, and the reason the last
     test in this file exists. */
}
describe('every editable brand field reaches something the client gets', () => {
  const sources = allSource().map((p) => readFileSync(p, 'utf8'))
  const writable = [
    ...new Set(
      sources
        .join('\n')
        .match(/updateBrandField\??\.?\(?\s*\(?\s*'[a-zA-Z0-9_]+'/g)
        ?.map((m) => m.match(/'([a-zA-Z0-9_]+)'/)[1]) || []
    ),
  ]

  const artifactText = CLIENT_ARTIFACTS.map((rel) =>
    readFileSync(join(SRC_ROOT, rel), 'utf8')
  ).join('\n')

  it('finds the editable fields it is meant to check', () => {
    expect(writable.length).toBeGreaterThan(20)
  })

  it('prints every field it lets you write', () => {
    const unreached = writable.filter(
      (f) => !EXEMPT[f] && !new RegExp(`\\b${f}\\b`).test(artifactText)
    )
    expect(
      unreached,
      'These have an editor but reach no client artifact. Print them, remove\n' +
        'them, or add them to EXEMPT with the reason:\n  ' +
        unreached.join('\n  ')
    ).toEqual([])
  })

  /* An exemption for a field that no longer exists is stale documentation
     pretending to be a decision. */
  it('has no exemption for a field that is gone', () => {
    const stale = Object.keys(EXEMPT).filter((f) => !writable.includes(f))
    expect(stale).toEqual([])
  })
})
