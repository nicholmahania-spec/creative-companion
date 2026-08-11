/**
 * Resolve real packageAssets rows for a Touchpoints surface.
 *
 * Production still writes via BusinessCardProduce / EmailSignatureProduce.
 * This module only READS packageAssets — no second storage model.
 *
 * surface id → deliverable is the existing produce-path map, not a new
 * Touchpoints schema.
 */

import {
  isProducedBusinessCardArtifact,
  findProducedBusinessCard,
} from './businessCardArtifact.js'
import {
  isProducedEmailSignatureArtifact,
  findProducedEmailSignature,
} from './emailSignatureArtifact.js'

/** Surfaces that currently have an in-app produce path. */
export const PRODUCIBLE_SURFACES = Object.freeze({
  businessCard: {
    deliverable: 'businessCard',
    kindLabel: 'PDF',
    emptyHint:
      'Produce a real business-card PDF into the client package. Contact details come from Delivery · Stationery.',
  },
  email: {
    deliverable: 'emailSignature',
    kindLabel: 'PNG',
    emptyHint:
      'Produce a real email-signature PNG into the client package.',
  },
})

/**
 * @param {string} surfaceId
 * @returns {{ deliverable: string, kindLabel: string, emptyHint: string } | null}
 */
export function produceMetaForSurface(surfaceId) {
  return PRODUCIBLE_SURFACES[surfaceId] || null
}

/**
 * All real produced files for a surface (tolerate more than one row).
 * @param {object} [project]
 * @param {string} surfaceId
 * @returns {object[]}
 */
export function producedAssetsForSurface(project = {}, surfaceId) {
  const meta = produceMetaForSurface(surfaceId)
  if (!meta) return []
  const list = Array.isArray(project.packageAssets) ? project.packageAssets : []
  if (surfaceId === 'businessCard') {
    return list.filter((a) => isProducedBusinessCardArtifact(a))
  }
  if (surfaceId === 'email') {
    return list.filter((a) => isProducedEmailSignatureArtifact(a))
  }
  return list.filter(
    (a) =>
      a &&
      !a.heldBack &&
      a.deliverable === meta.deliverable &&
      (a.group || 'application') === 'application' &&
      /^data:/i.test(String(a.dataUrl || ''))
  )
}

/**
 * Primary produced file for a surface (existing single-find helpers).
 * @param {object} [project]
 * @param {string} surfaceId
 */
export function primaryProducedAsset(project = {}, surfaceId) {
  if (surfaceId === 'businessCard') {
    return findProducedBusinessCard(project.packageAssets)
  }
  if (surfaceId === 'email') {
    return findProducedEmailSignature(project.packageAssets)
  }
  return producedAssetsForSurface(project, surfaceId)[0] || null
}

/**
 * Quiet honesty — never package verification language.
 * @param {boolean} hasFile
 */
export function trayHonestyLine(hasFile) {
  return hasFile
    ? 'Real package material · not verified package truth · Delivery owns the ZIP'
    : 'Nothing produced yet · schematic above is not a file'
}
