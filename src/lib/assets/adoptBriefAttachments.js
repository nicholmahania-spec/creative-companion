/**
 * Adopt client Brief images into the private Asset Library after the studio
 * accepts the submitted Brief.
 *
 * Public client uploads cannot safely be used as Asset Library storage: they
 * have no owner-scoped private object key and are deliberately readable by
 * the client. The accepted image is therefore copied once into brand-assets;
 * the old public URL remains on the Brief only so legacy previews continue to
 * work. `assetRef` is the canonical identity from this point onward.
 *
 * PARTIAL SUCCESS IS THE NORMAL CASE, not an edge one — three images where the
 * second one's host times out is an ordinary afternoon. So every attachment is
 * accounted for individually: the ones that were preserved are returned and
 * committed, the ones that were not are named with a reason, and neither
 * outcome is inferred from the other. `adoptionSummary` below turns that into
 * the one sentence the designer sees.
 *
 * The rule this exists to enforce: NEVER report "filed" for a durable
 * operation that did not complete. The designer's next action depends on it —
 * a client's artwork believed to be privately preserved, but actually still
 * sitting only on a public intake URL, is a promise the studio has made on the
 * app's word.
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

/**
 * One sentence for what the adoption actually did.
 *
 * Counts, plainly, in the same register as `ingestSummary`: no exclamation, no
 * "success", and a refusal stated as a fact about a file rather than as
 * something the designer got wrong. A client's server refusing a download is
 * not a mistake anyone made.
 *
 * Returns '' when there was nothing to do — an empty string is the signal not
 * to speak at all. A Brief with no attachments must not produce a toast about
 * attachments.
 *
 * @param {{assets?: object[], hydratedAssets?: object[], failed?: {reason?: string}[]}} result
 * @returns {{line: string, ok: boolean}}
 */
export function adoptionSummary({ assets = [], hydratedAssets = [], failed = [] } = {}) {
  /* Newly copied AND already-preserved both count as kept: from the
     designer's side "this image is safe with the project" is one fact, and
     splitting it would invite the question "what's the difference?" at a
     moment when the answer does not matter. */
  const kept = assets.length + hydratedAssets.length
  const lost = failed.length

  if (!kept && !lost) return { line: '', ok: true }
  if (kept && !lost) {
    return {
      line: kept === 1 ? 'Kept 1 client image with the project' : `Kept ${kept} client images with the project`,
      ok: true,
    }
  }
  if (!kept) {
    /* One failure gets its own reason — it is specific, actionable and
       already written as a sentence. Several get a count, because a stack of
       reasons on a toast is a wall nobody reads. */
    const only = String(failed[0]?.reason || '').trim()
    return {
      line: lost === 1 && only ? only : `${lost} client images could not be kept with the project`,
      ok: false,
    }
  }
  return {
    line: `Kept ${kept}, ${lost} could not be kept with the project`,
    ok: false,
  }
}
