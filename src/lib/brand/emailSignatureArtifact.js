/**
 * Email-signature application artifact — truth helpers only.
 *
 * Touchpoints mocks and ApplicationCheck readings are NOT artifacts.
 * A real email signature is a packageAssets row with:
 *   group: 'application'
 *   deliverable: 'emailSignature'
 *   dataUrl: real PNG bytes
 *
 * Linking is by deliverable on the existing packageAssets shape — no new
 * Touchpoints schema field.
 */

const PNG_DATA_URL = /^data:image\/png[;,]/i
const DATA_URL = /^data:/i

/**
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isEmailSignaturePackageAsset(asset) {
  if (!asset || typeof asset !== 'object') return false
  if (asset.heldBack) return false
  if (asset.deliverable !== 'emailSignature') return false
  const group = asset.group || 'application'
  if (group !== 'application') return false
  const url = String(asset.dataUrl || '')
  if (!url || !DATA_URL.test(url)) return false
  return true
}

/**
 * Produced application file: PNG data URL with emailSignature deliverable.
 *
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isProducedEmailSignatureArtifact(asset) {
  if (!isEmailSignaturePackageAsset(asset)) return false
  return PNG_DATA_URL.test(String(asset.dataUrl || ''))
}

/**
 * @param {Array<object>|null|undefined} packageAssets
 * @returns {object|null}
 */
export function findProducedEmailSignature(packageAssets) {
  const list = Array.isArray(packageAssets) ? packageAssets : []
  return list.find((a) => isProducedEmailSignatureArtifact(a)) || null
}

/**
 * @param {object|null|undefined} project
 * @returns {boolean}
 */
export function projectHasProducedEmailSignature(project) {
  return !!findProducedEmailSignature(project?.packageAssets)
}

/**
 * Blob → data URL for packageAssets (same channel as business card / panel).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) {
      reject(new Error('No blob'))
      return
    }
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(r.error || new Error('Could not read PNG'))
    r.readAsDataURL(blob)
  })
}

/**
 * Name for the package row — human label, not a claim about mock status.
 * @param {{ orgName?: string, contactName?: string }} [opts]
 */
export function emailSignatureAssetName({ orgName = '', contactName = '' } = {}) {
  const brand = String(orgName || '').trim() || 'Brand'
  const who = String(contactName || '').trim()
  return who
    ? `${brand} · ${who} · email signature`
    : `${brand} · email signature`
}
