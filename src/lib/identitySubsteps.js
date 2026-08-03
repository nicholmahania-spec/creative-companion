/**
 * Identity path stop — internal screens (one job each).
 * Single source for DesignView sub-nav, resume, and App rail Continue.
 *
 * Path stays five stops; these are NOT path steps.
 */

export const IDENTITY_SUBSTEPS = [
  { id: 'logo', label: 'Mark' },
  { id: 'essentials', label: 'Words' },
  { id: 'colors', label: 'Colour' },
  { id: 'type', label: 'Type' },
  { id: 'preview', label: 'Preview' },
]

export const IDENTITY_SUBSTEP_IDS = IDENTITY_SUBSTEPS.map((s) => s.id)

/** Map readiness / legacy section ids → Identity sub-screen id. */
const DEEP_LINK_MAP = {
  messaging: 'essentials',
  voice: 'essentials',
  imagery: 'preview',
  pins: 'preview',
  stationery: 'preview',
}

/**
 * @param {string | null | undefined} raw
 * @returns {string} valid sub-step id
 */
export function resolveIdentitySubstep(raw) {
  if (!raw) return 'logo'
  const mapped = DEEP_LINK_MAP[raw] || raw
  return IDENTITY_SUBSTEP_IDS.includes(mapped) ? mapped : 'logo'
}

/**
 * @param {string | null | undefined} currentId
 * @returns {{ id: string, label: string } | null}
 */
export function nextIdentitySubstep(currentId) {
  const id = resolveIdentitySubstep(currentId)
  const idx = IDENTITY_SUBSTEP_IDS.indexOf(id)
  if (idx < 0 || idx >= IDENTITY_SUBSTEPS.length - 1) return null
  return IDENTITY_SUBSTEPS[idx + 1]
}

/**
 * @param {string | null | undefined} currentId
 * @returns {{ id: string, label: string } | null}
 */
export function prevIdentitySubstep(currentId) {
  const id = resolveIdentitySubstep(currentId)
  const idx = IDENTITY_SUBSTEP_IDS.indexOf(id)
  if (idx <= 0) return null
  return IDENTITY_SUBSTEPS[idx - 1]
}
