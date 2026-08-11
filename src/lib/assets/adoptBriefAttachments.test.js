import { describe, expect, it } from 'vitest'
import { adoptBriefAttachments } from './adoptBriefAttachments.js'

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
