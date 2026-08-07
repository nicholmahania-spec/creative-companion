import { describe, expect, it, vi } from 'vitest'
import { ingestFiles, ingestSummary, localByteKey } from './ingestFiles.js'
import { MAX_ASSET_BYTES } from './assetLibrary.js'

/**
 * The rule under test: no file is ever silently discarded.
 *
 * The drop plane previously accepted a drag, cleared its highlight and threw
 * the files away. Nothing written, nothing said. Every case below therefore
 * asserts the same invariant from a different angle — every file in produces
 * either an accepted row or a named refusal, and the two together account for
 * all of them. A test that only checked the happy path would have passed
 * against the version that discarded everything on the unhappy one.
 */

const file = (name, { size = 1024, type = 'image/png' } = {}) => ({
  name,
  size,
  type,
})

/* putAssetBytes is imported by the module, so it is mocked at module scope. */
vi.mock('./assetBytes.js', () => ({
  openAssetCache: vi.fn(async () => ({ fake: true })),
  putAssetBytes: vi.fn(async () => undefined),
}))

const { putAssetBytes, openAssetCache } = await import('./assetBytes.js')

const opts = { projectId: 'p1', now: 1_700_000_000_000 }

describe('every dropped file is accounted for', () => {
  it('files a plain image and writes its bytes first', async () => {
    putAssetBytes.mockClear()
    const res = await ingestFiles([file('mark.png')], { ...opts, db: {} })

    expect(res.accepted).toHaveLength(1)
    expect(res.refused).toHaveLength(0)
    expect(putAssetBytes).toHaveBeenCalledTimes(1)

    const row = res.accepted[0]
    expect(row.project_id).toBe('p1')
    expect(row.name).toBe('mark.png')
    expect(row.byte_size).toBe(1024)
    expect(row.local_key).toBe(localByteKey(row.id))
    /* Nothing has been uploaded, so claiming a remote copy would make
       assetByteState report a file that is not there. */
    expect(row.storage_path).toBeNull()
  })

  it('accounts for every file in a mixed drop', async () => {
    const files = [
      file('good.png'),
      file('huge.pdf', { size: MAX_ASSET_BYTES + 1, type: 'application/pdf' }),
      file('sketch.ai', { type: 'application/postscript' }),
      file('fine.svg', { type: 'image/svg+xml' }),
    ]
    const res = await ingestFiles(files, { ...opts, db: {} })

    // The invariant: nothing vanished.
    expect(res.accepted.length + res.refused.length).toBe(files.length)
    expect(res.accepted.map((a) => a.name)).toEqual(['good.png', 'fine.svg'])
    expect(res.refused.map((r) => r.name)).toEqual(['huge.pdf', 'sketch.ai'])
  })

  it('names the file in every refusal', async () => {
    const res = await ingestFiles(
      [file('a-very-large-thing.pdf', { size: MAX_ASSET_BYTES + 1, type: 'application/pdf' })],
      { ...opts, db: {} }
    )
    expect(res.refused[0].name).toBe('a-very-large-thing.pdf')
    expect(res.refused[0].reason).toMatch(/50 MB/)
  })

  it('refuses rather than files when the bytes cannot be written', async () => {
    putAssetBytes.mockRejectedValueOnce(new Error('quota'))
    const res = await ingestFiles([file('mark.png')], { ...opts, db: {} })

    /* The important half: no row. A row whose bytes never landed is a card
       with a name and a blank thumbnail, which reads as a corrupted
       deliverable. */
    expect(res.accepted).toHaveLength(0)
    expect(res.refused[0].reason).toMatch(/wouldn’t store|Nothing was saved/)
  })

  it('does not accept anything when no project is open, and says why', async () => {
    const res = await ingestFiles([file('a.png'), file('b.png')], {
      now: opts.now,
      db: {},
    })
    expect(res.accepted).toHaveLength(0)
    expect(res.refused).toHaveLength(2)
    expect(res.refused[0].reason).toMatch(/Open a project/)
  })

  it('keeps a file the browser could not type', async () => {
    /* An untyped file is the browser failing to guess, not the designer's
       error. Refusing it would discard work over a missing header. */
    const res = await ingestFiles(
      [file('unknown-thing', { type: '' }), file('octet', { type: 'application/octet-stream' })],
      { ...opts, db: {} }
    )
    expect(res.accepted).toHaveLength(2)
    expect(res.refused).toHaveLength(0)
  })

  it('gives two rows for the same file dropped twice', async () => {
    // A corrected v2 under the same filename must not be silently swallowed.
    const res = await ingestFiles([file('mark.png'), file('mark.png')], {
      ...opts,
      db: {},
    })
    expect(res.accepted).toHaveLength(2)
    expect(res.accepted[0].id).not.toBe(res.accepted[1].id)
  })

  it('opens its own cache when not handed one', async () => {
    openAssetCache.mockClear()
    await ingestFiles([file('mark.png')], opts)
    expect(openAssetCache).toHaveBeenCalled()
  })

  it('refuses everything rather than throwing when storage will not open', async () => {
    openAssetCache.mockRejectedValueOnce(new Error('no idb'))
    const res = await ingestFiles([file('mark.png')], { projectId: 'p1', now: opts.now })
    expect(res.accepted).toHaveLength(0)
    expect(res.refused).toHaveLength(1)
  })

  it('returns empty for an empty drop rather than erroring', async () => {
    expect(await ingestFiles([], opts)).toEqual({ accepted: [], refused: [] })
    expect(await ingestFiles(null, opts)).toEqual({ accepted: [], refused: [] })
  })
})

describe('what the designer is told', () => {
  const n = (count) => Array.from({ length: count }, (_, i) => ({ name: `f${i}`, reason: 'r' }))

  it('counts plainly, with no exclamation or praise', () => {
    expect(ingestSummary({ accepted: n(1) })).toBe('Filed 1 file')
    expect(ingestSummary({ accepted: n(3) })).toBe('Filed 3 files')
    expect(ingestSummary({ accepted: n(2), refused: n(1) })).toBe(
      'Filed 2, 1 couldn’t be filed'
    )
  })

  it('gives the actual reason when a single file is refused', () => {
    // One file, one reason — no need to make them go looking for it.
    expect(ingestSummary({ refused: [{ name: 'a.ai', reason: 'Send a PDF instead.' }] })).toBe(
      'Send a PDF instead.'
    )
  })

  it('says nothing when nothing happened', () => {
    expect(ingestSummary({})).toBe('')
  })

  it('never blames the designer', () => {
    const texts = [
      ingestSummary({ accepted: n(1) }),
      ingestSummary({ accepted: n(1), refused: n(2) }),
      ingestSummary({ refused: n(3) }),
    ]
    for (const t of texts) {
      expect(t).not.toMatch(/error|invalid|failed|wrong|!/i)
    }
  })
})
