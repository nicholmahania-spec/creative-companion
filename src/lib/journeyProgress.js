/**
 * Whether a path step has meaningful content (progress / is-done).
 * Shared by path bar + Deliver process strip.
 *
 * @param {string} stepId - JOURNEY_STEPS id
 * @param {{
 *   project?: object,
 *   moodItems?: array,
 *   tasks?: array,
 *   sparkIndex?: number,
 *   palette?: array,
 * }} ctx
 */
export function pathStepHasContent(stepId, ctx = {}) {
  const project = ctx.project || {}
  const mood = ctx.moodItems || []
  const tasks = ctx.tasks || []
  const sparkIndex = ctx.sparkIndex || 0
  const palette = ctx.palette || project.palette || []

  switch (stepId) {
    case 'define':
      return !!(
        (project.name && project.name !== 'My project') ||
        project.brief?.trim() ||
        project.detective?.goal?.trim() ||
        project.detective?.audience?.trim()
      )
    case 'research':
      return mood.length > 0
    case 'ideate':
      return !!(
        sparkIndex > 0 ||
        mood.some((m) => m.type === 'quote' || /spark/i.test(m.note || '')) ||
        (project.directions || []).some((d) =>
          String(d.title || d.note || '').trim()
        )
      )
    case 'sketch':
      return tasks.length > 0
    case 'design':
      return !!(
        project.tagline?.trim() ||
        palette.length >= 2 ||
        (project.designVersion && project.designVersion !== 'v1')
      )
    case 'review':
      return !!(
        project.feedbackNotes?.trim() ||
        (project.tagline?.trim() && mood.some((m) => m.inPack))
      )
    case 'deliver':
      return !!(
        project.handoffNote?.trim() ||
        project.learnings?.trim() ||
        project.tagline?.trim() ||
        mood.some((m) => m.inPack)
      )
    default:
      return false
  }
}

/**
 * @returns {{ id: string, label: string, done: boolean, view: string }[]}
 */
export function pathProgressSummary(steps, ctx) {
  return (steps || []).map((s) => ({
    id: s.id,
    label: s.label,
    num: s.num,
    view: s.view,
    done: pathStepHasContent(s.id, ctx),
  }))
}

/**
 * Labels of steps still empty (for “What’s missing” copy).
 * @param {function(string): string} [labelForId]
 */
export function pathMissingLabels(steps, ctx, labelForId) {
  return pathProgressSummary(steps, ctx)
    .filter((r) => !r.done)
    .map((r) => (labelForId ? labelForId(r.id) || r.label : r.label))
}

/**
 * First incomplete path step (ADHD “one next gap” jump).
 * @returns {{ id: string, label: string, num: string, view: string }|null}
 */
export function pathFirstGap(steps, ctx) {
  const rows = pathProgressSummary(steps, ctx)
  return rows.find((r) => !r.done) || null
}
