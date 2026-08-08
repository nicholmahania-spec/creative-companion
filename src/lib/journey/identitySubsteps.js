/**
 * Identity workspace — the tool screens, and only the tool screens.
 *
 * Path stays five stops; these are NOT path steps.
 *
 * WHAT CHANGED AND WHY (2026-08-08, owner). This list was
 * Mark → Words → Colour → Type → Preview. Two of those five were not
 * activities:
 *
 *   **Words** was ten text inputs and zero tools, and five of the ten
 *   restated answers the client had already given in the brief. It has no
 *   successor screen — the tagline, positioning, voice, promise, proof,
 *   personality and do/don't are edited IN PLACE on the artboard, where they
 *   sit next to the mark and the palette they have to work with. The store
 *   fields are all unchanged; only the form is gone.
 *
 *   **Preview** was a destination you had to navigate to in order to see your
 *   own work. A preview is not a task. The artboard is now present on every
 *   screen below, which is what PRD §12 asked for and what the split broke.
 *
 * **Handover** is new, and it is the honest name for what was scattered
 * across the bottom of Mark and Preview: clearspace, minimum size, misuse,
 * imagery, writing and print. Documentation of decisions already made,
 * gathered in one place, after the work rather than in front of it.
 */

export const IDENTITY_SUBSTEPS = [
  { id: 'logo', label: 'Mark' },
  { id: 'colors', label: 'Color' },
  { id: 'type', label: 'Type' },
  { id: 'handover', label: 'Handover' },
]

export const IDENTITY_SUBSTEP_IDS = IDENTITY_SUBSTEPS.map((s) => s.id)

/**
 * Readiness / legacy section ids → the screen that now owns them.
 *
 * Every id that ever shipped keeps landing somewhere real. A pointer that
 * resolves to a generic place is worse than no pointer: it teaches the user
 * that "continue where you left off" cannot be trusted, which is the one
 * affordance that gets them back into work after a gap.
 *
 * The words now live on the artboard, which renders on every screen — so
 * their deep links land on Mark (the default) and `artboardFocus` below tells
 * the view to draw attention to the sheet rather than to a form field.
 */
const DEEP_LINK_MAP = {
  essentials: 'logo',
  words: 'logo',
  voice: 'logo',
  messaging: 'logo',
  tagline: 'logo',
  positioning: 'logo',
  pins: 'logo',
  preview: 'logo',
  imagery: 'handover',
  stationery: 'handover',
  writing: 'handover',
  print: 'handover',
}

/** Deep-link ids whose target is the artboard, not a panel on the tool side. */
const ARTBOARD_LINKS = new Set([
  'essentials',
  'words',
  'voice',
  'messaging',
  'tagline',
  'positioning',
  'pins',
  'preview',
])

/**
 * @param {string | null | undefined} raw
 * @returns {boolean} true when the deep link is asking for the artboard
 */
export function isArtboardDeepLink(raw) {
  return ARTBOARD_LINKS.has(String(raw || ''))
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
