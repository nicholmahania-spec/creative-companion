/**
 * A mark collected from cloud storage must be named by its bytes.
 *
 * These close the last gap left by the collect-at-export change. That change
 * fixed the real failure — a client package that shipped an `02_LOGO/` folder
 * with no logo in it — but it named what it collected from a claim rather than
 * from the file:
 *
 *   brand kit        `folder.file('logo.png', …)`, hardcoded, whatever came back
 *   client package   the plan's name, taken from the storage URL's own path
 *
 * `workspace-images` accepts png, jpeg, gif, webp, svg and avif. So a designer
 * whose mark is an SVG got `logo.png` holding `<svg`, and a client
 * double-clicking it gets a broken image — the same defect as the two `%PDF`
 * files named `.png` that started this whole line of work, reintroduced on the
 * one path that had no bytes to check at planning time.
 *
 * VERIFIED AGAINST THE REAL BUCKET, 2026-08-07: a public object URL on this
 * project's `workspace-images` answers a plain cross-origin GET with
 * `access-control-allow-origin: *` and `content-type: image/png`, so the
 * browser fetch these tests stub really does succeed in production. That was
 * the open question the collect-at-export commit recorded as unverifiable
 * here; it is verified now, and these tests cover what happens after the bytes
 * land rather than whether they land.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadClientPackage, downloadBrandKitZip } from '../book/exportFiles'

/* Storage keys carry an extension because the offload derives one from the
   bytes. Naming from it is a good guess and still only a guess — these say
   `.png` while the bytes say otherwise, which is the case the plan called
   provisional and never actually resolved. */
const URL_PNG =
  'https://abcdefgh.supabase.co/storage/v1/object/public/workspace-images/u/logo/9101.png'

const bytes = (...list) => new Uint8Array(list)
const PNG_BYTES = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0)
const JPEG_BYTES = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1)
const SVG_BYTES = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')
/* `ftypavif`. The bucket allows AVIF and the signature table has no entry for
   it, which is the case where guessing would be worse than deferring. */
const AVIF_BYTES = bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0)

/** Stand in for the network, so these test the naming and not the bucket. */
function stubFetch(body, { ok = true, status = 200 } = {}) {
  const spy = vi.fn(async () => ({
    ok,
    status,
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  }))
  vi.stubGlobal('fetch', spy)
  return spy
}

/** A save target that keeps the blob instead of writing it to a disk. */
function captureHandle() {
  const held = {}
  held.promise = Promise.resolve({
    createWritable: async () => ({
      write: (blob) => {
        held.blob = blob
      },
      close: async () => {},
    }),
  })
  return held
}

const pack = (over = {}) => ({
  projectName: 'Harbor & Hearth',
  palette: ['#1C1917', '#0F766E'],
  typeHeading: 'Plus Jakarta Sans Bold',
  typeBody: 'Plus Jakarta Sans Regular',
  detective: {},
  logoImage: URL_PNG,
  ...over,
})

/** Every path inside a written zip. */
async function pathsIn(blob) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  return Object.keys(zip.files).filter((p) => !zip.files[p].dir)
}

async function bytesAt(blob, path) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  return zip.file(path).async('uint8array')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the client package names a collected mark from its bytes', () => {
  it('renames when the storage url lied about the format', async () => {
    stubFetch(JPEG_BYTES)
    const held = captureHandle()
    const res = await downloadClientPackage(
      pack(),
      { includeBook: false, briefMarkdown: '# brief' },
      held.promise
    )
    expect(res.ok).toBe(true)

    const paths = await pathsIn(held.blob)
    const mark = paths.find((p) => /02_LOGO\/.*Logo_Primary/.test(p))
    expect(mark, 'the collected mark must be in the package').toBeTruthy()
    expect(mark).toMatch(/\.jpg$/)
    expect(mark).not.toMatch(/\.png$/)
    /* Renamed, not re-encoded — the client gets the designer's file. */
    expect(await bytesAt(held.blob, mark)).toEqual(JPEG_BYTES)
  })

  it('leaves the planned name alone when the bytes agree with it', async () => {
    stubFetch(PNG_BYTES)
    const held = captureHandle()
    await downloadClientPackage(pack(), { includeBook: false }, held.promise)
    const mark = (await pathsIn(held.blob)).find((p) => /02_LOGO\/.*Logo_Primary/.test(p))
    expect(mark).toMatch(/\.png$/)
  })

  it('keeps the planned name when the bytes say nothing, rather than guessing', async () => {
    stubFetch(AVIF_BYTES)
    const held = captureHandle()
    await downloadClientPackage(
      pack({ logoImage: URL_PNG.replace(/\.png$/, '.avif') }),
      { includeBook: false },
      held.promise
    )
    const mark = (await pathsIn(held.blob)).find((p) => /02_LOGO\/.*Logo_Primary/.test(p))
    /* The URL's own extension is the best thing left, and it is right here —
       the offload wrote the key from the very bytes that came back. */
    expect(mark).toMatch(/\.avif$/)
  })

  /* The property the collect-at-export change exists to protect. Renaming must
     not have cost it: a collection that fails is still reported, never
     downgraded to a package that looks complete. */
  it('still reports a failed collection instead of shipping a quiet gap', async () => {
    stubFetch(PNG_BYTES, { ok: false, status: 403 })
    const held = captureHandle()
    const res = await downloadClientPackage(pack(), { includeBook: false }, held.promise)
    expect(res.ok).toBe(true)
    const gap = res.missing.find((m) => /02_LOGO/.test(m.path))
    expect(gap, 'a refused collection must be named').toBeTruthy()
    expect(gap.reason).toMatch(/403/)
    expect((await pathsIn(held.blob)).some((p) => /Logo_Primary/.test(p))).toBe(false)
  })
})

describe('the brand kit names a collected mark from its bytes', () => {
  it('writes logo.svg for an svg mark, not logo.png holding markup', async () => {
    stubFetch(SVG_BYTES)
    const held = captureHandle()
    const res = await downloadBrandKitZip(pack(), held.promise, {})
    expect(res.ok).toBe(true)

    const paths = await pathsIn(held.blob)
    expect(paths.some((p) => /\/logo\.svg$/.test(p))).toBe(true)
    expect(paths.some((p) => /\/logo\.png$/.test(p))).toBe(false)
    expect(paths.some((p) => /logo-NOT-INCLUDED/.test(p))).toBe(false)
  })

  it('says so in a file rather than shipping a broken image when the fetch fails', async () => {
    stubFetch(PNG_BYTES, { ok: false, status: 404 })
    const held = captureHandle()
    await downloadBrandKitZip(pack(), held.promise, {})
    const paths = await pathsIn(held.blob)
    const note = paths.find((p) => /logo-NOT-INCLUDED\.txt$/.test(p))
    expect(note).toBeTruthy()
    expect(paths.some((p) => /\/logo\.(png|svg|jpg)$/.test(p))).toBe(false)
  })
})
