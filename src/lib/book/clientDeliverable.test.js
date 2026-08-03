import { describe, expect, it } from 'vitest'
import { buildBrandPackSnapshot, downloadBrandPackVectorPdf } from './exportFiles'

/**
 * What reaches the client must be theirs, and only theirs.
 *
 * Two defects shipped in the brand book, both invisible from inside the app
 * because both only appear in the generated file:
 *
 * 1. Every brief field's worked-example tip was printed in italics above the
 *    client's real answer, so the appendix carried "e.g. Sarah Whitton, Owner"
 *    and "e.g. you@studio.com" — a fictional person and a stranger's address
 *    in the client's own document. The generator added the "e.g." prefix on
 *    purpose, so this was a decision, not a slip.
 *
 * 2. The cover hard-broke a single long word: "Aurora Bakehouse" set as
 *    "Aurora Bak / ehouse". `splitTextToSize` breaks mid-word when a word is
 *    wider than the cap, and the cap is nine zero-widths while letters are
 *    wider than a zero.
 *
 * Asserted on the generated text layer, because neither is visible anywhere
 * else — the preview on screen is drawn by different code.
 */

const packFor = (name) =>
  buildBrandPackSnapshot({
    project: {
      name,
      logoWordmark: name,
      palette: ['#1C1917', '#0F766E', '#A8A29E'],
      detective: { clientName: name, goal: 'Look like a staple, not a trend.' },
    },
    tasks: [],
    moodItems: [],
  })

async function bookText(name) {
  const res = await downloadBrandPackVectorPdf(packFor(name), null, { returnBlobOnly: true })
  expect(res.ok).toBe(true)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await res.blob.arrayBuffer()) }).promise
  let out = ''
  for (let i = 1; i <= doc.numPages; i += 1) {
    const c = await (await doc.getPage(i)).getTextContent()
    out += c.items.map((it) => it.str).join(' ') + '\n'
  }
  return out
}

/** The cover's own lines, before the contents row. */
async function coverLines(name) {
  const res = await downloadBrandPackVectorPdf(packFor(name), null, { returnBlobOnly: true })
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await res.blob.arrayBuffer()) }).promise
  const c = await (await doc.getPage(1)).getTextContent()
  return c.items.map((i) => i.str.trim()).filter(Boolean)
}

describe("the client's book carries no example hints", () => {
  it('prints no worked example from the form', async () => {
    const text = await bookText('Harbor & Hearth')
    /* The exact strings a client was seeing. Named rather than pattern-matched
       so a future edit to the schema cannot quietly reintroduce one. */
    expect(text).not.toMatch(/Sarah Whitton/)
    expect(text).not.toMatch(/you@studio\.com/)
    expect(text).not.toMatch(/small-batch coffee roastery/)
    expect(text).not.toMatch(/new parents buying gifts/)
    // And the generator's own prefix.
    expect(text).not.toMatch(/\be\.g\./)
  }, 60_000)
})

describe('the cover never breaks a name mid-word', () => {
  /* "Bakehouse" is the case that failed: one word, longer than the cap. The
     others are the controls — they broke correctly at their spaces, which is
     how the fault was localised to long single words rather than to wrapping
     in general. */
  const names = ['Aurora Bakehouse', 'Harbor & Hearth', 'Fernbrook Ferments', 'Sparrow', 'Kelp & Kin']

  names.forEach((name) => {
    it(`sets "${name}" without cutting a word`, async () => {
      const lines = await coverLines(name)
      const words = name.split(/\s+/)
      words.forEach((w) => {
        /* Every word of the name must appear whole on some line. A hard break
           leaves "Bak" on one line and "ehouse" on the next, so no line
           contains the word itself. */
        const whole = lines.some((l) => l.includes(w))
        expect(whole, `"${w}" was split across lines: ${JSON.stringify(lines)}`).toBe(true)
      })
    }, 60_000)
  })
})
