/**
 * Business-card application artifact — truth helpers only.
 *
 * Touchpoints mocks and ApplicationCheck readings are NOT artifacts.
 * A real business card is a packageAssets row with:
 *   group: 'application'
 *   deliverable: 'businessCard'
 *   dataUrl: real PDF (or image) bytes
 *
 * Linking is by deliverable on the existing packageAssets shape — no new
 * Touchpoints schema field.
 */

const PDF_DATA_URL = /^data:application\/pdf[;,]/i
const DATA_URL = /^data:/i

/**
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isBusinessCardPackageAsset(asset) {
  if (!asset || typeof asset !== 'object') return false
  if (asset.heldBack) return false
  if (asset.deliverable !== 'businessCard') return false
  const group = asset.group || 'application'
  if (group !== 'application') return false
  const url = String(asset.dataUrl || '')
  if (!url || !DATA_URL.test(url)) return false
  return true
}

/**
 * A produced application file (not a mock, not a colour sample).
 * Prefer PDF; any real data URL with the businessCard deliverable still counts
 * as filed work, but production always writes PDF.
 *
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isProducedBusinessCardArtifact(asset) {
  if (!isBusinessCardPackageAsset(asset)) return false
  return PDF_DATA_URL.test(String(asset.dataUrl || ''))
}

/**
 * @param {Array<object>|null|undefined} packageAssets
 * @returns {object|null}
 */
export function findProducedBusinessCard(packageAssets) {
  const list = Array.isArray(packageAssets) ? packageAssets : []
  return list.find((a) => isProducedBusinessCardArtifact(a)) || null
}

/**
 * @param {object|null|undefined} project
 * @returns {boolean}
 */
export function projectHasProducedBusinessCard(project) {
  return !!findProducedBusinessCard(project?.packageAssets)
}

/**
 * Blob → data URL for packageAssets storage (same channel ClientPackagePanel uses).
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
    r.onerror = () => reject(r.error || new Error('Could not read PDF'))
    r.readAsDataURL(blob)
  })
}

/**
 * Name for the package row — human label, not a claim about mock status.
 * @param {{ orgName?: string, contactName?: string }} [opts]
 */
export function businessCardAssetName({ orgName = '', contactName = '' } = {}) {
  const brand = String(orgName || '').trim() || 'Brand'
  const who = String(contactName || '').trim()
  return who ? `${brand} · ${who} · business card` : `${brand} · business card`
}
