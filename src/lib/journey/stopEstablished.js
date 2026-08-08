/**
 * What each workspace already holds, said in one line.
 *
 * THE PROBLEM THIS REPLACES. The Desk rail listed the stops you had not
 * finished, minus the current gap, minus any you had skipped — a leftovers
 * list. Three things were wrong with it:
 *
 *   1. It was a SECOND process map. The sidebar already lists all five
 *      (DESIGN_GRAMMAR G3 bans a second map of the same chapters).
 *   2. It was completion debt wearing navigation's clothes: a stop appeared
 *      only while it was outstanding and vanished on completion, so the list
 *      was a to-do and the only way to clear an inapplicable stop was to
 *      press "Skip this one" — an acknowledgement whose whole purpose was to
 *      prune a list that should not have existed.
 *   3. On a phone it was the ONLY route to a workspace from the Desk. The
 *      horizontal step rail renders only on path views (`journeyActive`), and
 *      the sidebar becomes a centered dialog behind the menu button below
 *      768px. So the leftovers list was standing in for navigation the Desk
 *      never had.
 *
 * All five are listed now, always, in path order, and each says what is
 * ESTABLISHED there rather than whether it is finished. "6 starred, 14 pins"
 * is a fact about the work; a tick is a verdict about you.
 */
import { getDetectiveProgress } from '../brief/detectiveBrief'
import { touchpointsFor } from '../journey/touchpoints'

const clean = (v) => String(v ?? '').trim()
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

/**
 * @param {string} stepId
 * @param {{project?: object, moodItems?: array, palette?: array}} ctx
 * @returns {{ line: string, swatches?: string[], mark?: string }}
 *   `line` is always present. `swatches`/`mark` let the Identity card show
 *   the brand itself instead of describing it.
 */
export function stopEstablished(stepId, ctx = {}) {
  const project = ctx.project || {}
  const mood = Array.isArray(ctx.moodItems) ? ctx.moodItems : []

  switch (stepId) {
    case 'define': {
      const p = getDetectiveProgress(project.detective || {})
      if (!p.filledCount) return { line: 'Not started' }
      const sent =
        project.discoveryShareStatus === 'submitted'
          ? ' · client answered'
          : project.discoveryShareId || project.clientPortalId
            ? ' · sent'
            : ''
      /* The count, never `5 of 35`. A denominator turns "what is
         established" into "what is outstanding" — 30 unanswered questions
         reported as a standing debt on the screen whose job is orientation.
         Owner, 2026-08-08: no progress fractions on these cards. */
      return { line: `${plural(p.filledCount, 'answer', 'answers')}${sent}` }
    }
    case 'research': {
      const starred = mood.filter((m) => m.inPack).length
      if (!mood.length) return { line: 'Nothing pinned' }
      return {
        line: starred
          ? `${plural(starred, 'starred', 'starred')} · ${plural(mood.length, 'pin', 'pins')}`
          : plural(mood.length, 'pin', 'pins'),
      }
    }
    case 'design': {
      /* Shows the brand, not a sentence about it. `palette` is passed in
         already resolved, and the stock four are filtered by the caller —
         a placeholder palette on this card would read as a decision. */
      const swatches = Array.isArray(ctx.palette) ? ctx.palette.slice(0, 5) : []
      const bits = []
      if (project.logoImage) bits.push('mark')
      if (clean(project.typeHeading)) bits.push('type')
      if (clean(project.tagline)) bits.push('tagline')
      return {
        line: bits.length ? bits.join(' · ') : 'Nothing set yet',
        swatches,
        mark: project.logoImage || '',
      }
    }
    case 'sketch': {
      const apps = touchpointsFor(
        project.detective?.brandSurfaces,
        project.detective?.deliverablesPicked
      )
      if (!apps.length) return { line: 'No surfaces named yet' }
      const proofs = project.touchpointApps || {}
      const noted = apps.filter((id) => {
        const row = proofs[id]
        return row && (row.done || clean(row.note) || row.check)
      }).length
      /* Same rule as the brief: state what exists. Both numbers are facts
         about the work — how many surfaces this brand has, and how many you
         have covered — but never as a fraction of one over the other. */
      return {
        line: noted
          ? `${plural(noted, 'covered', 'covered')} · ${plural(apps.length, 'surface', 'surfaces')}`
          : plural(apps.length, 'surface', 'surfaces'),
      }
    }
    case 'deliver': {
      if (clean(project.handoffNote) || clean(project.learnings))
        return { line: 'Handed off' }
      return { line: 'Not delivered yet' }
    }
    default:
      return { line: '' }
  }
}
