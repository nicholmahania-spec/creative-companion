/**
 * Email-signature application artifact — truth helpers only.
 *
 * Touchpoints mocks and ApplicationCheck readings are NOT artifacts.
 *
 * Same two-questions split the business card carries, for the same reason:
 * attribution says which bought item a file IS, and only the produce path's
 * stamp says the app MADE it. See businessCardArtifact and
 * productionProvenance for the failure that separating them fixed.
 *
 * Linking is still by deliverable on the existing packageAssets shape — no
 * new Touchpoints schema field.
 */

import { PRODUCERS, isProducedByApp } from './productionProvenance.js'

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
 * A file this app produced: PNG bytes, filed as the email signature, and
 * stamped by the email-signature produce path.
 *
 * Fails closed for the same reason the business card does — an unstamped row
 * is package material whose authorship the app cannot establish.
 *
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isProducedEmailSignatureArtifact(asset) {
  if (!isEmailSignaturePackageAsset(asset)) return false
  if (!isProducedByApp(asset, PRODUCERS.emailSignature)) return false
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
