/**
 * The colour pairings that actually ship.
 *
 * `buildContrastMatrix` reads a palette. Roles are assigned separately and can
 * point at hexes that are in no palette at all — `mergeRolesIntoPalette` exists
 * because that drift is a known, documented problem in this codebase.
 *
 * So a reading taken over the bare palette can pass while the pairing the
 * designer actually assigned fails. Measured on a real workspace: palette
 * [#1C1917, #FFB8B8] reported "every pairing clears AA", while the assigned
 * Text #737373 on Background #FFB8B8 was 2.89:1 — below AA for body text and
 * below the 3:1 floor for large text too. A contrast tool that says "nothing to
 * fix" over an unreadable brand is worse than no contrast tool.
 *
 * The four pairings and their targets are lifted from `suggestRoleAaFixes`, so
 * the CLI and the app's own auto-fix cannot disagree about what needs to clear
 * what.
 */

/** Roles resolved the way the app resolves them: auto-mapped, then overridden. */
export function resolvedRoles(brandSystem, palette, colorRoles) {
  return brandSystem.buildColorSystem(palette, colorRoles).roles
}

/**
 * @returns {{id, label, fg, bg, fgLabel, bgLabel, ratio, need, ok, usableFor}[]}
 */
export function rolePairings(contrastMod, roles) {
  const PAIRS = [
    { id: 'text-on-quiet', fg: 'text', bg: 'quiet', need: 4.5, label: 'Body text on background' },
    { id: 'accent-on-quiet', fg: 'accent', bg: 'quiet', need: 3, label: 'Accent on background' },
    { id: 'text-on-cover', fg: 'text', bg: 'cover', need: 3, label: 'Text on primary' },
    { id: 'accent-on-cover', fg: 'accent', bg: 'cover', need: 3, label: 'Accent on primary' },
  ]
  const LABELS = { text: 'Text', quiet: 'Background', accent: 'Accent', cover: 'Primary' }

  return PAIRS.map((p) => {
    const fg = roles?.[p.fg]
    const bg = roles?.[p.bg]
    const cell = fg && bg ? contrastMod.contrastCell(fg, bg) : null
    if (!cell || cell.same) return null
    return {
      id: p.id,
      label: p.label,
      fg: cell.fg,
      bg: cell.bg,
      fgLabel: LABELS[p.fg],
      bgLabel: LABELS[p.bg],
      ratio: cell.ratio,
      need: p.need,
      ok: cell.ratio >= p.need,
      usableFor: cell.usableFor,
    }
  }).filter(Boolean)
}

/**
 * Palette plus role colours, so the grid covers every hex the brand can put on
 * screen. Roles go first — `dedupePalette` fills from the front and stops at
 * `max`, so appending them is how they get silently evicted.
 */
export function paletteWithRoles(colorMod, palette, roles) {
  return colorMod.mergeRolesIntoPalette(palette || [], roles || {}, 12)
}
