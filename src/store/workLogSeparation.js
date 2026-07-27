/**
 * Keep the work clock's record out of the invoice.
 *
 * A clock is a note you keep to yourself; an invoice is a claim you make to
 * another person. `logWorkedTime` writes to `workLog` and never to `timeLog`,
 * but that alone only governs new writes. This lifts any measured (`auto`)
 * row that is already sitting in `timeLog` — from an older client, a stale
 * tab, or a synced payload — back over to `workLog` where it belongs.
 *
 * Returns the SAME array reference when there is nothing to do, so callers
 * can skip a state update, and so applying it twice is a no-op.
 */
export function liftMeasuredRows(projects) {
  if (!Array.isArray(projects)) return projects
  let changed = false
  const next = projects.map((p) => {
    const time = Array.isArray(p?.timeLog) ? p.timeLog : []
    const measured = time.filter((e) => e?.auto)
    if (!measured.length) return p
    changed = true
    return {
      ...p,
      timeLog: time.filter((e) => !e?.auto),
      workLog: [...(Array.isArray(p.workLog) ? p.workLog : []), ...measured],
    }
  })
  return changed ? next : projects
}
