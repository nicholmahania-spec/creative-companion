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
import { hasProducedProjectType } from './journeyProgress'

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
      /* Factory type pair is not established craft — see hasProducedProjectType. */
      if (
        hasProducedProjectType(project.typeHeading, project.typeBody) &&
        clean(project.typeHeading)
      ) {
        bits.push('type')
      }
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
      const withEvidence = apps.filter((id) => {
        const row = proofs[id]
        return row && (row.done || clean(row.note) || row.check)
      }).length
      /* ARTIFACT HONESTY: evidence = mock accept / note / colour sample —
         not "complete" or "covered" as finished applications. Counts only,
         never a fraction (see module header). */
      return {
        line: withEvidence
          ? `Evidence on ${plural(withEvidence, 'surface', 'surfaces')} · ${plural(apps.length, 'surface', 'surfaces')}`
          : plural(apps.length, 'surface', 'surfaces'),
      }
    }
    case 'ideate': {
      /* Says what is on the stop, never how close to finished it is — the
         rule this whole module exists for. A titled route is the unit; the
         rough dump is the thing you have before you have one. */
      const named = (project.directions || []).filter((d) =>
        clean(d?.title)
      ).length
      if (named) {
        const chosen = (project.directions || []).some(
          (d) => d?.chosen && clean(d?.title)
        )
        return {
          line: `${plural(named, 'route', 'routes')}${chosen ? ', one chosen' : ''}`,
        }
      }
      const rough = (project.roughIdeas || []).filter((r) =>
        clean(typeof r === 'string' ? r : r?.text || r?.title)
      ).length
      if (rough) return { line: `${plural(rough, 'rough idea', 'rough ideas')}` }
      return { line: 'No routes yet' }
    }
    case 'book': {
      /* bookBuilder exists after first touch — not a finished client book. */
      const built = project.bookBuilder && typeof project.bookBuilder === 'object'
      return { line: built ? 'Builder opened' : 'Builder not opened yet' }
    }
    case 'deliver': {
      /* Note text only — never claim Handed off / Delivered without a ship event. */
      if (clean(project.handoffNote) || clean(project.learnings))
        return { line: 'Handoff note written' }
      return { line: 'No handoff note yet' }
    }
    default:
      return { line: '' }
  }
}
