/**
 * Adopt client Brief images into the private Asset Library after the studio
 * accepts the submitted Brief.
 *
 * Public client uploads cannot safely be used as Asset Library storage: they
 * have no owner-scoped private object key and are deliberately readable by
 * the client. The accepted image is therefore copied once into brand-assets;
 * the old public URL remains on the Brief only so legacy previews continue to
 * work. `assetRef` is the canonical identity from this point onward.
 */
import { normaliseIngest } from './assetLibrary.js'

const text = (value) => String(value ?? '').trim()

const uuid = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  return `brief-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function fileFromBlob(blob, name) {
  if (typeof File !== 'undefined') {
    return new File([blob], name, { type: blob.type || 'application/octet-stream' })
  }
  return Object.assign(blob, { name })
}

function existingSource(assets, projectId, attachment) {
  const refId = text(attachment?.assetRef?.id)
  if (refId) {
    const byRef = (assets || []).find(
      (asset) => asset?.id === refId && asset?.project_id === projectId
    )
    if (byRef) return byRef
  }
  const publicUrl = text(attachment?.url)
  return (assets || []).find(
    (asset) =>
      asset?.project_id === projectId &&
      asset?.role === 'source' &&
      asset?.origin === 'client' &&
      asset?.source_app === 'brief' &&
      asset?.source_ref === publicUrl
  )
}

/**
 * @param {{ projectId: string, attachments: Array<{name?: string, url?: string, assetRef?: object}>, assets?: object[], durableStore?: {save: Function, findBriefSource: Function}, fetchFile?: Function, now?: number, makeId?: Function }} args
 * @returns {Promise<{assets: object[], hydratedAssets: object[], links: Array<{url: string, assetRef: object}>, failed: Array<{url: string, reason: string}>}>}
 */
export async function adoptBriefAttachments({
  projectId,
  attachments = [],
  assets = [],
  durableStore,
  fetchFile = (...args) => fetch(...args),
  now = Date.now(),
  makeId = uuid,
} = {}) {
  const accepted = []
  const hydratedAssets = []
  const links = []
  const failed = []
  const known = [...(assets || [])]

  if (!projectId || !durableStore?.save) {
    return { assets: accepted, hydratedAssets, links, failed }
  }

  for (const attachment of attachments || []) {
    const url = text(attachment?.url)
    if (!url) continue

    const existing = existingSource(known, projectId, attachment)
    if (existing) {
      links.push({ url, assetRef: { kind: 'asset', id: existing.id } })
      continue
    }

    try {
      /* Check durable metadata BEFORE fetching/copying public bytes. The
         library view may never have been opened on this device, so memory is
         not evidence that the source does not already exist. */
      if (typeof durableStore.findBriefSource !== 'function') {
        throw new Error('Could not check whether this source was already preserved.')
      }
      const lookup = await durableStore.findBriefSource(projectId, {
        assetRef: attachment?.assetRef,
        sourceRef: url,
      })
      if (!lookup?.ok) {
        throw new Error('Could not check whether this source was already preserved.')
      }
      if (lookup.asset) {
        hydratedAssets.push(lookup.asset)
        known.push(lookup.asset)
        links.push({ url, assetRef: { kind: 'asset', id: lookup.asset.id } })
        continue
      }

      const response = await fetchFile(url)
      if (!response?.ok) throw new Error('The original image could not be read.')
      const blob = await response.blob()
      const mimeType = text(blob?.type).toLowerCase()
      if (!mimeType.startsWith('image/')) {
        throw new Error('The original attachment is not an image.')
      }
      const name = text(attachment?.name) || 'Client brief image'
      const id = makeId()
      const normalised = normaliseIngest({
        id,
        name,
        projectId,
        mimeType,
        byteSize: blob.size,
        category: 'other',
        sourceApp: 'brief',
        sourceRef: url,
        role: 'source',
        origin: 'client',
      })
      if (!normalised.ok) throw new Error(normalised.errors[0] || 'The image could not be filed.')

      const asset = {
        ...normalised.asset,
        id,
        created_at: new Date(now).toISOString(),
      }
      const saved = await durableStore.save(asset, fileFromBlob(blob, name))
      if (!saved?.ok || !saved.asset) {
        throw new Error(saved?.error || 'The original image could not be preserved.')
      }
      const durableAsset = saved.asset
      accepted.push(durableAsset)
      known.push(durableAsset)
      links.push({ url, assetRef: { kind: 'asset', id: durableAsset.id } })
    } catch (error) {
      failed.push({
        url,
        reason: error?.message || 'The original image could not be preserved.',
      })
    }
  }

  return { assets: accepted, hydratedAssets, links, failed }
}
