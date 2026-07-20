/**
 * Stock blank-project palette (matches useAppStore.defaultProjectPalette).
 * Alone, it must not mark Design “done.”
 */
export const STOCK_PROJECT_PALETTE = [
  '#1C1917',
  '#0F766E',
  '#A8A29E',
  '#FAFAF9',
]

/** @param {string[]} palette */
export function isStockProjectPalette(palette = []) {
  if (!Array.isArray(palette) || palette.length !== STOCK_PROJECT_PALETTE.length)
    return false
  const norm = (h) => String(h || '').trim().toUpperCase()
  const a = palette.map(norm).sort()
  const b = STOCK_PROJECT_PALETTE.map(norm).sort()
  return a.every((v, i) => v === b[i])
}

function hasExplicitColorRoles(project = {}) {
  const r = project.colorRoles
  if (!r || typeof r !== 'object') return false
  return Object.values(r).some((v) => String(v || '').trim())
}

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
  const palette = ctx.palette || project.palette || []

  switch (stepId) {
    case 'define':
      return !!(
        (project.name && project.name !== 'My project') ||
        project.brief?.trim() ||
        project.detective?.goal?.trim() ||
        project.detective?.audience?.trim()
      )
    case 'research': {
      // Prefer ★ leave-behind pin; 2+ unstarred pins still count as research progress
      const hasStar = mood.some((m) => m.inPack)
      return hasStar || mood.length >= 2
    }
    case 'ideate': {
      // Honest fill: direction shortlist or Ideate spark pin (not Research notes)
      const hasDirection = (project.directions || []).some((d) =>
        String(d.title || d.note || '').trim()
      )
      const hasSparkPin = mood.some(
        (m) =>
          m.type === 'spark' ||
          m.fromSpark === true ||
          (m.type === 'quote' && m.fromSpark)
      )
      return !!(hasDirection || hasSparkPin)
    }
    case 'sketch':
      return tasks.length > 0
    case 'design': {
      // Craft signals only — stock default palette alone does not count
      const paletteCraft =
        palette.length >= 2 && !isStockProjectPalette(palette)
      return !!(
        project.tagline?.trim() ||
        project.voice?.trim() ||
        project.logoImage ||
        String(project.logoWordmark || '').trim() ||
        hasExplicitColorRoles(project) ||
        paletteCraft
      )
    }
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
  research: 'Star a pin ★ or add 2+ refs',
  ideate: 'A/B/C title or pin a spark note',
  sketch: 'Capture one finishable step',
  design: 'Tagline, voice, logo, or your own palette',
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
