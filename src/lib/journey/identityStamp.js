/**
 * Identity version stamp — "is there identity work I haven't saved a version of?"
 *
 * Two timestamps live on the project and nothing else is needed to answer it:
 *
 *   identityEditedAt — written by every store action that changes an identity
 *                      field (see IDENTITY_WRITER_ACTIONS below).
 *   identitySavedAt  — written by bumpDesignVersion, which is the moment a
 *                      versionService snapshot is taken.
 *
 * Both are stored as real ISO strings. NEITHER IS EVER SHOWN. The owner has
 * stated they have no concept of time and numbers do not register, so a clock
 * time or a version number on screen is noise that has to be translated before
 * it means anything. The UI reads `identityStampState` and renders a sentence.
 *
 * Why this comparison and not "has the client seen it": nothing in this app
 * records a client having been shown the identity. `portalSeen` runs the other
 * way (it tracks the designer seeing the client's activity). A chip reading
 * "the client hasn't seen this version" would therefore be bound to a field
 * nothing writes — the Promise/Proof failure the build rule exists to stop.
 * The saved-version comparison uses only records that already exist.
 */

/**
 * Identity fields — the ones whose edits mean "the identity moved".
 *
 * Listed for reference and for the test that keeps the store's instrumented
 * actions honest. Deliberately NOT used to diff project objects at runtime:
 * the writer actions stamp the time directly, so there is no second code path
 * that could disagree with them about what counts as an identity change.
 */
export const IDENTITY_FIELDS = [
  'tagline',
  'positioning',
  'voice',
  'typeHeading',
  'typeBody',
  'typeWhy',
  'logoImage',
  'logoWordmark',
  'logoDirection',
  'logoClientChose',
  'logoClearspace',
  'logoMinSize',
  'logoDonts',
  'palette',
  'paletteTokens',
  'colorRoles',
  'colorRoleWhy',
]

/**
 * The store actions that must stamp `identityEditedAt`.
 *
 * The ~40 view-level call sites that edit identity all funnel through these
 * nine, so this is the complete wiring surface. Instrumenting the views
 * instead would mean forty places to forget one.
 * `identityStamp.test.js` asserts each of these still writes the stamp.
 */
export const IDENTITY_WRITER_ACTIONS = [
  'updateBrandField',
  'setProjectPalette',
  'setPaletteTokens',
  'updatePaletteColor',
  'addPaletteColor',
  'removePaletteColor',
  'setColorRole',
  'setLogoImage',
  'setLogoDirection',
]

/** ms since epoch, or null when absent/unparseable. */
function at(value) {
  if (!value) return null
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

/**
 * @param {object} project
 * @returns {'none'|'unsaved'|'saved'}
 *   none    — no identity work recorded yet
 *   unsaved — identity has been edited since the last saved version
 *   saved   — the last saved version is current
 */
export function identityStampState(project = {}) {
  const edited = at(project?.identityEditedAt)
  const saved = at(project?.identitySavedAt)
  if (!edited) return 'none'
  if (!saved) return 'unsaved'
  // Equal timestamps mean the save captured that edit — a bump writes both in
  // the same set, and two edits inside one millisecond must not read as unsaved.
  return edited > saved ? 'unsaved' : 'saved'
}

/**
 * The sentence shown on screen. Words only — no version number, no clock time,
 * no relative duration ("3 days ago" is still a number doing the work).
 *
 * Worded so the subject is the work, never the person: "Edits", not "you
 * changed". A status that names the user as the agent of a deviation reads as
 * a verdict on them, and there is no edit that fixes a sentence about you.
 * Avoided throughout: out of date, stale, unsynced, pending, behind.
 */
export function identityStampLabel(state) {
  switch (state) {
    case 'unsaved':
      return 'Edits since the last saved version'
    case 'saved':
      return 'Saved — nothing new since'
    default:
      return 'No identity work yet'
  }
}

/** Convenience for the UI — state and its sentence in one read. */
export function identityStamp(project = {}) {
  const state = identityStampState(project)
  return { state, label: identityStampLabel(state) }
}
