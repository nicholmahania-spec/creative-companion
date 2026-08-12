import { describe, expect, it } from 'vitest'
import { adoptBriefAttachments, adoptionSummary } from './adoptBriefAttachments.js'

const PROJECT_A = 'project-a'
const PROJECT_B = 'project-b'
const URL = 'https://example.test/client-upload/logo.png'
const notFound = async () => ({ ok: true, asset: null })

function response(type = 'image/png', bytes = 'logo') {
  return { ok: true, blob: async () => new Blob([bytes], { type }) }
}

describe('adoptBriefAttachments', () => {
  it('makes an accepted Brief image one client source asset without package or provenance side effects', async () => {
    const saves = []
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Existing logo.png', url: URL }],
      fetchFile: async () => response(),
      durableStore: {
        findBriefSource: notFound,
        save: async (asset, file) => {
          saves.push({ asset, file })
          return { ok: true, asset: { ...asset, storage_path: 'owner/project-a/logo.png' } }
        },
      },
      makeId: () => 'brief-logo',
      now: 0,
    })

    expect(saves).toHaveLength(1)
    expect(result.failed).toEqual([])
    expect(result.assets).toEqual([
      expect.objectContaining({
        id: 'brief-logo', project_id: PROJECT_A, role: 'source', origin: 'client',
        source_app: 'brief', source_ref: URL,
      }),
    ])
    expect(result.links).toEqual([{ url: URL, assetRef: { kind: 'asset', id: 'brief-logo' } }])
    expect(result.assets[0]).not.toHaveProperty('packageAssets')
    expect(result.assets[0]).not.toHaveProperty('provenanceLinks')
  })

  it('adopts an attachment only once across reload/retry and reuses its canonical asset ref', async () => {
    const existing = {
      id: 'brief-logo', project_id: PROJECT_A, role: 'source', origin: 'client',
      source_app: 'brief', source_ref: URL,
    }
    const fetchFile = async () => {
      throw new Error('must not fetch an existing source')
    }
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Existing logo.png', url: URL }],
      assets: [existing],
      fetchFile,
      durableStore: { save: async () => { throw new Error('must not save an existing source') } },
    })

    expect(result.assets).toEqual([])
    expect(result.hydratedAssets).toEqual([])
    expect(result.failed).toEqual([])
    expect(result.links).toEqual([{ url: URL, assetRef: { kind: 'asset', id: 'brief-logo' } }])
  })

  it('does not adopt a project A source into project B', async () => {
    const existingA = {
      id: 'brief-logo', project_id: PROJECT_A, role: 'source', origin: 'client',
      source_app: 'brief', source_ref: URL,
    }
    const result = await adoptBriefAttachments({
      projectId: PROJECT_B,
      attachments: [{ name: 'Existing logo.png', url: URL }],
      assets: [existingA],
      fetchFile: async () => response(),
      durableStore: {
        findBriefSource: notFound,
        save: async (asset) => ({ ok: true, asset: { ...asset, storage_path: 'owner/project-b/logo.png' } }),
      },
      makeId: () => 'brief-logo-b',
    })

    expect(result.assets[0]).toMatchObject({ id: 'brief-logo-b', project_id: PROJECT_B })
    expect(result.links[0].assetRef.id).toBe('brief-logo-b')
  })

  it('keeps a legacy attachment usable when its private adoption cannot run', async () => {
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Legacy logo.png', url: URL }],
    })

    expect(result).toEqual({ assets: [], hydratedAssets: [], links: [], failed: [] })
  })

  it('rejects a non-image public response instead of creating an invalid source asset', async () => {
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Not an image.pdf', url: URL }],
      fetchFile: async () => response('application/pdf'),
      durableStore: { findBriefSource: notFound, save: async () => ({ ok: true, asset: {} }) },
    })

    expect(result.assets).toEqual([])
    expect(result.links).toEqual([])
    expect(result.failed).toEqual([{ url: URL, reason: 'The original attachment is not an image.' }])
  })

  it('resolves a persisted source before fetching bytes when memory is empty', async () => {
    const persisted = {
      id: 'persisted-logo', project_id: PROJECT_A, role: 'source', origin: 'client',
      source_app: 'brief', source_ref: URL, storage_path: 'owner/project-a/persisted-logo.png',
    }
    const findBriefSource = async () => ({ ok: true, asset: persisted })
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Existing logo.png', url: URL }],
      assets: [],
      fetchFile: async () => { throw new Error('must not fetch before durable lookup') },
      durableStore: {
        findBriefSource,
        save: async () => { throw new Error('must not save before durable lookup') },
      },
    })

    expect(result.assets).toEqual([])
    expect(result.hydratedAssets).toEqual([persisted])
    expect(result.links).toEqual([{ url: URL, assetRef: { kind: 'asset', id: 'persisted-logo' } }])
  })

  it('uses an existing canonical assetRef before copying bytes', async () => {
    const persisted = {
      id: 'canonical-logo', project_id: PROJECT_A, role: 'source', origin: 'client', source_app: 'brief',
    }
    const seen = []
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Existing logo.png', url: URL, assetRef: { kind: 'asset', id: 'canonical-logo' } }],
      durableStore: {
        findBriefSource: async (_projectId, query) => {
          seen.push(query)
          return { ok: true, asset: persisted }
        },
        save: async () => { throw new Error('must not copy a canonical source') },
      },
      fetchFile: async () => { throw new Error('must not fetch a canonical source') },
    })

    expect(seen).toEqual([{ assetRef: { kind: 'asset', id: 'canonical-logo' }, sourceRef: URL }])
    expect(result.links[0].assetRef.id).toBe('canonical-logo')
  })

  it('fails safely before a byte copy when durable lookup is unavailable', async () => {
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Existing logo.png', url: URL }],
      durableStore: {
        findBriefSource: async () => ({ ok: false, asset: null }),
        save: async () => { throw new Error('must not copy after failed lookup') },
      },
      fetchFile: async () => { throw new Error('must not fetch after failed lookup') },
    })

    expect(result.assets).toEqual([])
    expect(result.links).toEqual([])
    expect(result.failed).toEqual([
      { url: URL, reason: 'Could not check whether this source was already preserved.' },
    ])
  })
})

/**
 * PARTIAL FAILURE, AND SAYING SO.
 *
 * The audit found this result discarded at its only call site, which turned
 * every failure — including the one where the whole durable path was broken —
 * into silence. A designer who accepts a Brief and is told nothing concludes
 * the artwork was filed. These prove the two halves of the fix: successes are
 * kept whatever else happened, and the sentence the designer sees never
 * reports work that did not happen.
 */
describe('a partly successful adoption keeps what worked and names what did not', () => {
  const GOOD = 'https://example.test/client-upload/good.png'
  const BAD = 'https://example.test/client-upload/bad.png'

  const run = () =>
    adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [
        { name: 'Good.png', url: GOOD },
        { name: 'Bad.png', url: BAD },
      ],
      fetchFile: async (url) => (url === GOOD ? response() : { ok: false }),
      durableStore: {
        findBriefSource: notFound,
        save: async (asset) => ({ ok: true, asset: { ...asset, storage_path: 'owner/p/a.png' } }),
      },
      makeId: () => 'brief-good',
      now: 0,
    })

  it('preserves the successful copy', async () => {
    const result = await run()
    expect(result.assets.map((a) => a.source_ref)).toEqual([GOOD])
    expect(result.links).toEqual([{ url: GOOD, assetRef: { kind: 'asset', id: 'brief-good' } }])
  })

  it('identifies the failed item with a reason, by url', async () => {
    const result = await run()
    expect(result.failed).toEqual([
      { url: BAD, reason: 'The original image could not be read.' },
    ])
  })

  it('does not link the failed attachment to an asset that was never made', async () => {
    const result = await run()
    expect(result.links.some((l) => l.url === BAD)).toBe(false)
  })

  it('reports a durable project that does not exist yet, rather than filing nothing quietly', async () => {
    /* `save` refusing because the project has never been pushed is the one
       failure a designer can act on directly, so its sentence travels all the
       way out instead of being flattened into a count. */
    const result = await adoptBriefAttachments({
      projectId: PROJECT_A,
      attachments: [{ name: 'Logo.png', url: GOOD }],
      fetchFile: async () => response(),
      durableStore: {
        findBriefSource: notFound,
        save: async () => ({ ok: false, error: 'This project has not been sent to the cloud yet.' }),
      },
      now: 0,
    })
    expect(result.assets).toEqual([])
    expect(adoptionSummary(result).line).toBe('This project has not been sent to the cloud yet.')
    expect(adoptionSummary(result).ok).toBe(false)
  })
})

describe('adoptionSummary', () => {
  it('says nothing when there was nothing to do', () => {
    /* A Brief with no attachments must not produce a toast about
       attachments. An empty line is the signal not to speak. */
    expect(adoptionSummary({})).toEqual({ line: '', ok: true })
  })

  it('counts newly copied and already-preserved images as one fact', () => {
    expect(adoptionSummary({ assets: [{}], hydratedAssets: [{}] })).toEqual({
      line: 'Kept 2 client images with the project',
      ok: true,
    })
  })

  it('uses the singular for one', () => {
    expect(adoptionSummary({ assets: [{}] }).line).toBe('Kept 1 client image with the project')
  })

  it('never says filed when nothing was filed', () => {
    const said = adoptionSummary({ failed: [{ reason: 'The original image could not be read.' }] })
    expect(said.ok).toBe(false)
    expect(said.line).not.toMatch(/kept|filed|saved/i)
  })

  it('reports both sides when some worked and some did not', () => {
    const said = adoptionSummary({ assets: [{}], failed: [{ reason: 'x' }, { reason: 'y' }] })
    expect(said).toEqual({ line: 'Kept 1, 2 could not be kept with the project', ok: false })
  })

  it('does not stack reasons when several failed', () => {
    const said = adoptionSummary({ failed: [{ reason: 'x' }, { reason: 'y' }] })
    expect(said.line).toBe('2 client images could not be kept with the project')
  })

  it('stays in the non-punitive register', () => {
    const lines = [
      adoptionSummary({ assets: [{}] }).line,
      adoptionSummary({ failed: [{ reason: 'x' }, { reason: 'y' }] }).line,
      adoptionSummary({ assets: [{}], failed: [{ reason: 'x' }] }).line,
    ]
    for (const line of lines) {
      expect(line).not.toMatch(/fail|error|invalid|!|success/i)
    }
  })
})
