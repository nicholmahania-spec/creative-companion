/**
 * Surface identity → representation → renderer seam.
 *
 * Touchpoints Stage shows ONE surface at a time. How that surface is drawn
 * is a representation, not the surface itself. Today every surface uses the
 * schematic representation. Later: composite, image, rendered mockup,
 * real-file preview — without a second architecture.
 *
 * Discovery already proved composed-stimulus identity separate from rendering.
 * This module is the same idea for applications. It is NOT a mockup factory.
 */

import {
  mapPaletteRoles,
  normalizeHex,
  bestTextOn,
  fontFamilyFromLabel,
} from '../color.js'
import { touchpointLabel, TOUCHPOINT_SPECS } from '../journey/touchpoints.js'
import { effectiveWord } from './briefWords.js'

/** Representation kinds the stage may eventually host. Only schematic now. */
export const REPRESENTATION_KINDS = Object.freeze({
  SCHEMATIC: 'schematic',
  // Future — do not implement renderers yet:
  // ATOMIC: 'atomic-sample',
  // COMPOSITE: 'composite',
  // IMAGE: 'image',
  // RENDERED: 'rendered',
  // REAL_FILE: 'real-file',
})

/**
 * Natural stage geometry for each surface — proportion + max stage size.
 * Filmstrip thumbs stay on TouchpointMockThumb aspect map; this is for the
 * active specimen on the proofing table.
 */
export const SPECIMEN_GEOMETRY = Object.freeze({
  businessCard: {
    aspect: '3.5 / 2',
    maxWidth: 'min(42rem, 72vw)',
    maxHeight: 'min(24rem, 48vh)',
    frame: 'card',
  },
  print: {
    aspect: '210 / 297',
    maxWidth: 'min(24rem, 42vw)',
    maxHeight: 'min(34rem, 70vh)',
    frame: 'sheet',
  },
  social: {
    aspect: '1 / 1',
    maxWidth: 'min(28rem, 48vh)',
    maxHeight: 'min(28rem, 48vh)',
    frame: 'post',
  },
  website: {
    aspect: '16 / 10',
    maxWidth: 'min(52rem, 78vw)',
    maxHeight: 'min(32rem, 58vh)',
    frame: 'browser',
  },
  app: {
    aspect: '9 / 19.5',
    maxWidth: 'min(17rem, 36vw)',
    maxHeight: 'min(36rem, 72vh)',
    frame: 'phone',
  },
  email: {
    aspect: '4 / 3',
    maxWidth: 'min(36rem, 62vw)',
    maxHeight: 'min(26rem, 52vh)',
    frame: 'message',
  },
  packaging: {
    aspect: '3 / 4',
    maxWidth: 'min(22rem, 40vw)',
    maxHeight: 'min(30rem, 64vh)',
    frame: 'pack',
  },
  merch: {
    aspect: '4 / 5',
    maxWidth: 'min(24rem, 44vw)',
    maxHeight: 'min(30rem, 64vh)',
    frame: 'tee',
  },
  signage: {
    aspect: '16 / 9',
    maxWidth: 'min(48rem, 78vw)',
    maxHeight: 'min(28rem, 52vh)',
    frame: 'sign',
  },
})

const DEFAULT_GEOMETRY = Object.freeze({
  aspect: '4 / 3',
  maxWidth: '32rem',
  maxHeight: '24rem',
  frame: 'sheet',
})

/**
 * Which representation the stage should use for this surface right now.
 * Always schematic until richer material is deliberately wired.
 *
 * @param {string} surfaceId
 * @param {{ preferredKind?: string }} [opts]
 * @returns {{ kind: string, surfaceId: string }}
 */
export function representationForSurface(surfaceId, opts = {}) {
  const id = String(surfaceId || '')
  const preferred = opts.preferredKind
  const kind =
    preferred && Object.values(REPRESENTATION_KINDS).includes(preferred)
      ? preferred
      : REPRESENTATION_KINDS.SCHEMATIC
  return { kind, surfaceId: id }
}

/**
 * @param {string} surfaceId
 * @returns {typeof DEFAULT_GEOMETRY & { aspect: string }}
 */
export function specimenGeometry(surfaceId) {
  return SPECIMEN_GEOMETRY[surfaceId] || DEFAULT_GEOMETRY
}

/**
 * Read-only material the specimen needs from canonical Identity + Brief.
 * Never a writer. Never invents strategy.
 *
 * @param {object} [project]
 * @param {string[]} [palette]
 */
export function applicationBrandMaterial(project = {}, palette = []) {
  const roles = mapPaletteRoles(
    Array.isArray(palette) && palette.length ? palette : project.palette || []
  )
  const cover =
    normalizeHex(project.colorRoles?.cover) || roles.cover || '#1C1917'
  const accent =
    normalizeHex(project.colorRoles?.accent) || roles.accent || '#0F766E'
  const quiet =
    normalizeHex(project.colorRoles?.quiet) || roles.quiet || '#F5F5F4'
  const text =
    normalizeHex(project.colorRoles?.text) || roles.text || '#0C0A09'
  const background =
    normalizeHex(project.colorRoles?.background) ||
    roles.background ||
    quiet ||
    '#FAFAF9'

  const name =
    String(
      project.logoWordmark ||
        project.name ||
        project.detective?.clientName ||
        'Brand'
    ).trim() || 'Brand'
  const tag = String(project.tagline || '').trim()
  const logo = project.logoImage || ''
  const headingFont = fontFamilyFromLabel(project.typeHeading)
  const bodyFont = fontFamilyFromLabel(project.typeBody)

  const contacts = Array.isArray(project.contacts) ? project.contacts : []
  const contact = contacts[0] || null
  const phone = effectiveWord(project, 'orgPhone').value
  const email = effectiveWord(project, 'orgEmail').value
  const website = String(project.orgWebsite || '').trim()
  const address = String(project.orgAddress || '').trim()

  return {
    cover,
    accent,
    quiet,
    text,
    background,
    textOnCover: bestTextOn(cover) || '#FFFFFF',
    textOnAccent: bestTextOn(accent) || '#FFFFFF',
    name,
    tag,
    logo,
    headingFont,
    bodyFont,
    contact,
    phone,
    email,
    website,
    address,
  }
}

/**
 * Quiet honesty line under the specimen — never "produced" or "verified".
 * @param {string} surfaceId
 */
export function specimenHonestyLine(surfaceId) {
  const label = touchpointLabel(surfaceId)
  const spec = TOUCHPOINT_SPECS[surfaceId]
  if (spec) return `Schematic · ${label} · ${spec} · not a produced file`
  return `Schematic · ${label} · not a produced file`
}
