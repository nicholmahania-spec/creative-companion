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
 * Build path progress ctx from Zustand-like store state (project-scoped).
 * Single filter path for gap jump + React memos.
 * @param {{
 *   projects?: array,
 *   currentProjectId?: string|number|null,
 *   moodItems?: array,
 *   tasks?: array,
 *   sparkIndex?: number,
 * }} st
 */
export function buildPathProgressCtx(st = {}) {
  const pid = st.currentProjectId
  const project =
    (st.projects || []).find((p) => p.id === pid) || null
  const moodItems = (st.moodItems || []).filter(
    (m) => m.projectId == null || m.projectId === pid
  )
  const tasks = (st.tasks || []).filter(
    (t) => t.projectId == null || t.projectId === pid
  )
  return {
    project,
    moodItems,
    tasks,
    sparkIndex: st.sparkIndex || 0,
    palette: project?.palette || [],
  }
}

/**
 * @returns {{ id: string, label: string, done: boolean, view: string, num?: string }[]}
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

/**
 * Best focus target after jumping to a gap step (querySelector id).
 * @param {string} stepId
 * @returns {string|null}
 */
export function pathGapFocusSelector(stepId) {
  switch (stepId) {
    case 'define':
      return '#detective-goal, #project-name, #project-brief'
    case 'research':
      return '.board-upload-btn, .studio-view .btn-primary, #board-note'
    case 'ideate':
      return '#dir-title-a, .spark-actions .btn-primary'
    case 'sketch':
      return '#desk-capture, #step-why, #current-step'
    case 'design':
      return '#brand-brief, #design-version, .system-acc-tab'
    case 'review':
      return '#feedback-notes'
    case 'deliver':
      return '#handoff-note, #learnings-note'
    default:
      return null
  }
}

/** English fill hints — single source; i18n pathFillHint falls back here. */
export const PATH_FILL_HINTS = {
  define: 'Name, goal, or audience',
  research: 'Pin at least one ref',
  ideate: 'Spark, A/B/C, or pin a spark note',
  sketch: 'Capture one finishable step',
  design: 'Tagline, palette, or version bump',
  review: 'Feedback notes or leave-behind pin',
  deliver: 'Handoff, learnings, or leave-behind',
  default: 'Add a little content',
}

/**
 * Short “how to fill this step” line (EN). Prefer pathFillHint(locale, id) in UI.
 * @param {string} stepId
 * @returns {string}
 */
export function pathStepFillHint(stepId) {
  return PATH_FILL_HINTS[stepId] || PATH_FILL_HINTS.default
}

/**
 * Focus first matching selector after a short delay (post-nav).
 * @param {string|null} selectorList - comma-separated CSS selectors
 * @param {number} [delayMs]
 */
export function focusPathGapTarget(selectorList, delayMs = 120) {
  if (!selectorList || typeof document === 'undefined') return
  window.setTimeout(() => {
    const parts = String(selectorList)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const sel of parts) {
      const el = document.querySelector(sel)
      if (el && typeof el.focus === 'function') {
        try {
          el.focus({ preventScroll: false })
          el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
        } catch {
          el.focus?.()
        }
        return
      }
    }
  }, delayMs)
}
