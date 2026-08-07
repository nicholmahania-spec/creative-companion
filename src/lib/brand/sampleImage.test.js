import { afterEach, describe, expect, it } from 'vitest'
import { SAMPLE_MAX_EDGE, sampleImageColours } from './sampleImage.js'

/**
 * The sampler's own constants, guarded.
 *
 * `SAMPLE_MAX_EDGE` was named in PHASES.md as uncovered: an audit mutated six
 * sampling constants and the acceptance suite stayed green for all of them,
 * because that suite replays STORED hex/coverage vectors and never
 * re-executes the sampling stage that produced them. Two of those holes were
 * closed at the time; this is one of the two that were not.
 *
 * The environment is `node`, so `sampleImageColours` short-circuits on
 * `typeof document === 'undefined'` and cannot be exercised at all without a
 * stub. That absence is why the constant was never covered — not an oversight
 * about what to assert. So the DOM surface it actually touches is stubbed
 * here: `Image` for decode, and a canvas that RECORDS the size it was asked
 * for. What the constant does is decide that size, so that is what is
 * asserted, rather than asserting the number equals itself.
 */

const original = {
  document: globalThis.document,
  Image: globalThis.Image,
}

afterEach(() => {
  globalThis.document = original.document
  globalThis.Image = original.Image
})

/** Stub the two DOM things the sampler uses; report the canvas size it set. */
function stubDom({ width, height, pixel = [200, 30, 40, 255] }) {
  const sized = {}
  globalThis.Image = class {
    constructor() {
      this.naturalWidth = width
      this.naturalHeight = height
      queueMicrotask(() => this.onload?.())
    }
    set src(_v) {}
  }
  globalThis.document = {
    createElement: () => ({
      set width(v) {
        sized.w = v
      },
      get width() {
        return sized.w
      },
      set height(v) {
        sized.h = v
      },
      get height() {
        return sized.h
      },
      getContext: () => ({
        imageSmoothingEnabled: true,
        drawImage: () => {},
        getImageData: (_x, _y, w, h) => ({
          data: new Uint8ClampedArray(w * h * 4).map((_, i) => pixel[i % 4]),
        }),
      }),
    }),
  }
  return sized
}

describe('SAMPLE_MAX_EDGE governs the sampled size', () => {
  it('scales the longest edge down to the constant, keeping aspect ratio', async () => {
    const sized = stubDom({ width: 1600, height: 800 })
    await sampleImageColours('data:image/png;base64,x')

    /* LITERALS, deliberately. The first version of this asserted
       `sized.w === SAMPLE_MAX_EDGE`, which is a tautology: it passed with the
       constant mutated to 320 and to 80, so it guarded nothing. 160 is a
       CALIBRATED value — the Phase 6 acceptance run measured the sampler's
       noise floor and false-positive rate at this resolution — so changing it
       invalidates that measurement and should have to be done on purpose,
       here, in the open. */
    expect(sized.w).toBe(160)
    expect(sized.h).toBe(80)
    expect(SAMPLE_MAX_EDGE).toBe(160)
  })

  it('never upscales a small image', async () => {
    /* `Math.min(1, maxEdge / longest)` is the guard. Without it a 40px mark
       would be blown up to 160 and sampled from invented pixels. */
    const sized = stubDom({ width: 40, height: 20 })
    await sampleImageColours('data:image/png;base64,x')
    expect(sized.w).toBe(40)
    expect(sized.h).toBe(20)
  })

  it('never collapses an extreme aspect ratio to zero', async () => {
    /* A 2000x3 rule would round to height 0 and sample nothing at all. */
    const sized = stubDom({ width: 2000, height: 3 })
    await sampleImageColours('data:image/png;base64,x')
    expect(sized.w).toBe(160)
    expect(sized.h).toBeGreaterThanOrEqual(1)
  })

  it('says it could not read a zero-dimension image rather than reading clean', async () => {
    /* An SVG with no intrinsic size decodes fine and reports 0x0. Silence
       here would be indistinguishable from "this artwork is fine". */
    stubDom({ width: 0, height: 0 })
    const out = await sampleImageColours('data:image/svg+xml;base64,x')
    expect(out.readable).toBe(false)
    expect(out.reason).toBe('no-dimensions')
    expect(out.colours).toEqual([])
  })
})
