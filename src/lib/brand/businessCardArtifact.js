/**
 * Business-card application artifact — truth helpers only.
 *
 * Touchpoints mocks and ApplicationCheck readings are NOT artifacts.
 *
 * TWO DIFFERENT QUESTIONS, KEPT APART
 *
 *   isBusinessCardPackageAsset — is this file the business card the client
 *   bought? Answered by the designer's attribution. An upload out of
 *   Illustrator answers yes, and should.
 *
 *   isProducedBusinessCardArtifact — did THIS APP make these bytes? Answered
 *   only by the produce path's own stamp (see productionProvenance).
 *
 * They used to be one question with the second one's name. Attribution,
 * folder and mime were all an upload could carry, so a designer's own PDF
 * filed through Delivery made Touchpoints announce a production run that
 * never happened.
 *
 * Linking is still by deliverable on the existing packageAssets shape — no
 * new Touchpoints schema field.
 */

import { PRODUCERS, isProducedByApp } from './productionProvenance.js'

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
 * A file this app produced (not a mock, not a colour sample, not an upload).
 *
 * All three conditions have to hold at once, and the stamp is the one that
 * cannot be arrived at by accident:
 *   - filed as the business card (attribution),
 *   - carrying PDF bytes (production always writes PDF),
 *   - stamped by the business-card produce path (authorship).
 *
 * FAILS CLOSED. A row missing the stamp reads as package material and not as
 * produced output, which is the honest answer for both an upload and a row
 * written before the stamp existed. The alternative — assuming production
 * because nothing contradicts it — is the failure this function had.
 *
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isProducedBusinessCardArtifact(asset) {
  if (!isBusinessCardPackageAsset(asset)) return false
  if (!isProducedByApp(asset, PRODUCERS.businessCard)) return false
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
