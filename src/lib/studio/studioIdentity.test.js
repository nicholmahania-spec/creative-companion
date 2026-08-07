import { afterEach, describe, expect, it } from 'vitest'
import {
  LOGO_MAX_EDGE,
  MAX_LOGO_CHARS,
  hasStudioIdentity,
  logoProblemText,
  prepareStudioLogo,
  resolveStudioName,
} from './studioIdentity.js'

/**
 * The cap is the reason this module exists, so the cap is what is tested.
 *
 * `prefs` rides inside `PERSISTED_KEYS`, and the store serialises the WHOLE
 * workspace through one `localStorage.setItem`. An oversized logo therefore
 * does not fail alone — it fails the write carrying every project, decision
 * and approval, and the store's quota message blames mood board images. So
 * "the logo is small" is a correctness property here, not a nicety.
 *
 * Assertions use literal numbers rather than the exported constants. A test
 * written as `expect(w).toBe(LOGO_MAX_EDGE)` passes for ANY value of
 * LOGO_MAX_EDGE, including one large enough to reintroduce the bug — it
 * asserts the constant equals itself. Mutating the constant must fail this
 * file, so the numbers are spelled out.
 *
 * Environment is `node`, so every DOM surface the module touches is stubbed:
 * FileReader, Image, and a canvas that records the size it was asked for and
 * returns a string whose LENGTH is controllable, since length is the quantity
 * under test.
 */

const original = {
  document: globalThis.document,
  Image: globalThis.Image,
  FileReader: globalThis.FileReader,
}

afterEach(() => {
  globalThis.document = original.document
  globalThis.Image = original.Image
  globalThis.FileReader = original.FileReader
})

/**
 * @param encodedLengthFor  given the canvas edge, how long the data URL is.
 *                          Lets a test say "big source, still too big at every
 *                          step" or "shrinks under the cap on the second try".
 */
function stubDom({ width, height, encodedLengthFor = () => 1000 }) {
  const sizes = []
  globalThis.FileReader = class {
    readAsDataURL() {
      queueMicrotask(() => {
        this.result = 'data:image/png;base64,AAAA'
        this.onload?.()
      })
    }
  }
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = width
      this.naturalHeight = height
      queueMicrotask(() => this.onload?.())
    }
    set src(_v) {}
  }
  globalThis.document = {
    createElement: () => {
      const c = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toDataURL: () => {
          sizes.push({ w: c.width, h: c.height })
          const len = encodedLengthFor(Math.max(c.width, c.height))
          return `data:image/png;base64,${'A'.repeat(Math.max(0, len - 22))}`
        },
      }
      return c
    },
  }
  return sizes
}

const png = { type: 'image/png' }

describe('studio logo, size-capped before the store sees it', () => {
  it('scales a large logo down to a 400px longest edge', async () => {
    const sizes = stubDom({ width: 3000, height: 1500 })
    const res = await prepareStudioLogo(png)
    expect(res.ok).toBe(true)
    // 3000x1500 at 400 longest edge -> 400x200. Literal, not the constant.
    expect(sizes[0]).toEqual({ w: 400, h: 200 })
    expect(res.width).toBe(400)
    expect(res.height).toBe(200)
  })

  it('keeps aspect ratio when height is the longest edge', async () => {
    const sizes = stubDom({ width: 500, height: 2000 })
    await prepareStudioLogo(png)
    expect(sizes[0]).toEqual({ w: 100, h: 400 })
  })

  it('never enlarges a logo that is already small', async () => {
    const sizes = stubDom({ width: 80, height: 40 })
    await prepareStudioLogo(png)
    expect(sizes[0]).toEqual({ w: 80, h: 40 })
  })

  it('retries smaller when the first encode is over the cap', async () => {
    // Over the cap until the edge drops to 300 (the 0.75 step of 400).
    const sizes = stubDom({
      width: 3000,
      height: 3000,
      encodedLengthFor: (edge) => (edge > 300 ? 500_000 : 40_000),
    })
    const res = await prepareStudioLogo(png)
    expect(res.ok).toBe(true)
    expect(sizes.map((s) => s.w)).toEqual([400, 300])
    expect(res.chars).toBe(40_000)
  })

  it('rejects rather than storing something over the cap', async () => {
    const sizes = stubDom({
      width: 4000,
      height: 4000,
      encodedLengthFor: () => 500_000,
    })
    const res = await prepareStudioLogo(png)
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('too-large')
    expect(res.dataUrl).toBe('')
    // Every step was attempted before giving up.
    expect(sizes.length).toBeGreaterThan(1)
  })

  it('accepts a result sitting exactly on the cap', async () => {
    stubDom({ width: 100, height: 100, encodedLengthFor: () => 100_000 })
    const res = await prepareStudioLogo(png)
    expect(res.ok).toBe(true)
    expect(res.chars).toBe(100_000)
  })

  it('rejects one character over the cap', async () => {
    stubDom({ width: 100, height: 100, encodedLengthFor: () => 100_001 })
    const res = await prepareStudioLogo(png)
    expect(res.ok).toBe(false)
  })

  it('guards the constants themselves against being loosened', () => {
    // If either of these changes, the assertions above are no longer
    // describing the shipped behaviour and must be revisited deliberately.
    expect(LOGO_MAX_EDGE).toBe(400)
    expect(MAX_LOGO_CHARS).toBe(100_000)
    // The cap must stay a small fraction of the ~5MB localStorage budget,
    // because it shares that budget with the entire workspace.
    expect(MAX_LOGO_CHARS).toBeLessThan(5_000_000 * 0.05)
  })

  it('turns away a file that is not an image', async () => {
    stubDom({ width: 10, height: 10 })
    const res = await prepareStudioLogo({ type: 'application/pdf' })
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('unsupported-type')
  })

  it('reports a decode failure instead of storing a broken value', async () => {
    stubDom({ width: 0, height: 0 })
    const res = await prepareStudioLogo(png)
    expect(res.ok).toBe(false)
    expect(res.dataUrl).toBe('')
  })
})

describe('problem text', () => {
  it('explains a rejected file without blaming the designer', () => {
    const text = logoProblemText('too-large')
    expect(text).toBeTruthy()
    expect(text.toLowerCase()).not.toMatch(/error|invalid|failed|wrong/)
  })

  it('has a sentence for every reason prepareStudioLogo can return', () => {
    for (const reason of [
      'unsupported-type',
      'too-large',
      'read-failed',
      'decode-failed',
      'no-canvas',
      'encode-failed',
    ]) {
      expect(logoProblemText(reason), reason).toBeTruthy()
    }
  })
})

describe('the studio name already typed into the invoice', () => {
  it('prefers an explicit studio name', () => {
    expect(
      resolveStudioName({ studioName: 'Mahania Studio', invoiceFrom: 'Other Ltd' })
    ).toBe('Mahania Studio')
  })

  it('falls back to the first line of the invoice identity', () => {
    // The exact failure this exists for: the app asked once, in Invoice, then
    // printed no credit because a second field was empty.
    expect(
      resolveStudioName({
        studioName: '',
        invoiceFrom: 'Mahania Studio\n12 Fore Street\nBodmin',
      })
    ).toBe('Mahania Studio')
  })

  it('skips blank leading lines rather than returning empty', () => {
    expect(resolveStudioName({ invoiceFrom: '\n\n  Mahania Studio\nBodmin' })).toBe(
      'Mahania Studio'
    )
  })

  it('returns empty when there is genuinely nothing to credit', () => {
    expect(resolveStudioName({})).toBe('')
    expect(resolveStudioName({ studioName: '   ', invoiceFrom: '  \n ' })).toBe('')
  })

  it('knows when a logo alone is enough to credit', () => {
    expect(hasStudioIdentity({})).toBe(false)
    expect(hasStudioIdentity({ studioLogo: 'data:image/png;base64,AAA' })).toBe(true)
    expect(hasStudioIdentity({ invoiceFrom: 'Mahania Studio' })).toBe(true)
  })
})
