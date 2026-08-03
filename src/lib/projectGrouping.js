/**
 * One ordering + client grouping for the project lists (sidebar and Home),
 * so a project sits in the same place on every surface (#17) and repeat
 * clients cluster (#4). Pure so it can be unit-tested away from React.
 *
 * Reviewed by adhd-executive-function-advisor (Return wall, 2026-08-03):
 * - Order is deterministic so a row moves only on a real event (new project,
 *   completion, new unread) — never on re-render or mere open:
 *     1. needs-you (hasUnreadClient) first
 *     2. in-progress (not pathFull)
 *     3. completed / pathFull sunk
 *     4. store index as stable final tiebreaker
 * - Unclienten projects (blank detective.clientName) go UNLABELED at the top,
 *   where fresh/abandoned work is easiest to return to — never under a
 *   "No client" label, which reads as a deficiency.
 * - Named-client groups follow, in the order their first project appears in
 *   the deterministic ordering.
 *
 * @param {Array} projectsSummary per-project summaries
 *   ({ project, pathFull, hasUnreadClient?, ... })
 * @param {Array} activeProjects  the non-archived projects, in store order
 * @returns {Array<{key:string, clientName:string|null, projects:Array}>}
 */
export function groupProjectsByClient(projectsSummary, activeProjects) {
  const clientOf = (s) => (s.project?.detective?.clientName || '').trim()
  const storeIdx = new Map((activeProjects || []).map((p, i) => [p.id, i]))
  const ordered = [...(projectsSummary || [])].sort((a, b) => {
    const aNeed = a.hasUnreadClient ? 0 : 1
    const bNeed = b.hasUnreadClient ? 0 : 1
    if (aNeed !== bNeed) return aNeed - bNeed
    const aDone = a.pathFull ? 1 : 0
    const bDone = b.pathFull ? 1 : 0
    if (aDone !== bDone) return aDone - bDone // in-progress first, done sunk
    return (storeIdx.get(a.project.id) ?? 0) - (storeIdx.get(b.project.id) ?? 0)
  })

  const noClient = ordered.filter((s) => !clientOf(s))
  const byClient = new Map()
  for (const s of ordered) {
    const k = clientOf(s)
    if (!k) continue
    if (!byClient.has(k)) byClient.set(k, [])
    byClient.get(k).push(s)
  }

  const groups = []
  if (noClient.length) {
    groups.push({ key: '__none__', clientName: null, projects: noClient })
  }
  for (const [k, list] of byClient) {
    groups.push({ key: k, clientName: k, projects: list })
  }
  return groups
}

/**
 * Client headings earn their place only when ≥2 named clients actually
 * collide. A single-client or no-client studio renders a flat list with no
 * heading tax (advisor: grouping chrome must appear only when there's a real
 * ambiguity for it to resolve).
 */
export function showClientHeadings(groups) {
  return (groups || []).filter((g) => g.clientName).length >= 2
}
