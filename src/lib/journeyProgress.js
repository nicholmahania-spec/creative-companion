import { getDetectiveProgress } from './detectiveBrief'

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

/** Explicit color roles count only once every assigned role has its "why" filled. */
function hasJustifiedColorRoles(project = {}) {
  if (!hasExplicitColorRoles(project)) return false
  const roles = project.colorRoles || {}
  const why = project.colorRoleWhy || {}
  const assigned = Object.keys(roles).filter((k) => String(roles[k] || '').trim())
  return assigned.length > 0 && assigned.every((r) => String(why[r] || '').trim())
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
    case 'define': {
      // Honest fill: path "done" matches detective required core (Start with
      // these), not project display name or a placeholder brief alone —
      // naming a project on onboard must not skip the real brief.
      return !!getDetectiveProgress(project.detective || {}).requiredReady
    }
    case 'research': {
      // Once anything is starred, every starred pin needs its "why" filled —
      // 2+ unstarred pins alone still count as early progress.
      const starred = mood.filter((m) => m.inPack)
      if (starred.length > 0) {
        return starred.every((m) => String(m.note || '').trim())
      }
      return mood.length >= 2
    }
    case 'ideate': {
      // Align with Send · Sketch (title + choose) and the UI: why is optional.
      // Rough list, a titled direction, or a spark pin all count as real work.
      const hasDirection = (project.directions || []).some((d) =>
        String(d.title || '').trim()
      )
      const hasSparkPin = mood.some(
        (m) =>
          m.type === 'spark' ||
          m.fromSpark === true ||
          (m.type === 'quote' && m.fromSpark)
      )
      const hasRough = (project.roughIdeas || []).some((r) =>
        String(typeof r === 'string' ? r : r?.text || r?.title || '').trim()
      )
      return !!(hasDirection || hasSparkPin || hasRough)
    }
    case 'sketch': {
      /* Touchpoints is about WHERE the brand appears — it renders the
         application mocks chosen by the brief's `brandSurfaces` (see
         lib/touchpoints.js). It used to be `tasks.length >= 1`, which was
         written when this stop meant something else and survived the rename.
         Onboarding asks for a first step, which creates exactly one task, so
         every brand-new project opened with Touchpoints already ticked done.

         A stage that reports done before any work exists is worse than one
         that reports nothing: it removes the thing the rail is for, which is
         knowing where you actually are without reconstructing it. And a tick
         you did not earn makes every other tick worth less.

         `touchpointsFor` is not used here on purpose — it falls back to a
         legacy set when nothing is picked, so its length can never be zero.
         The honest question is whether anyone answered. */
      const surfaces = project.detective?.brandSurfaces
      const deliverables = project.detective?.deliverablesPicked
      return (
        (Array.isArray(surfaces) && surfaces.length > 0) ||
        (Array.isArray(deliverables) && deliverables.length > 0)
      )
    }
    case 'design': {
      // Craft signals only — stock default palette alone does not count
      const paletteCraft =
        palette.length >= 2 && !isStockProjectPalette(palette)
      return !!(
        project.tagline?.trim() ||
        project.voice?.trim() ||
        project.logoImage ||
        String(project.logoWordmark || '').trim() ||
        hasJustifiedColorRoles(project) ||
        paletteCraft
      )
    }
    case 'review':
      return !!(
        project.feedbackNotes?.trim() ||
        (project.tagline?.trim() && mood.some((m) => m.inPack))
      )
    case 'deliver': {
      const hasNote = !!(
        project.handoffNote?.trim() || project.learnings?.trim()
      )
      const words = String(project.detective?.brandWords || '')
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean)
      if (!words.length) return hasNote
      const checked = project.deliverWordsChecked || {}
      return hasNote && words.every((w) => checked[w])
    }
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
/** Loose id match so number/string projectIds still scope (persist/import). */
export function sameProjectId(a, b) {
  if (a == null || b == null) return a == b
  return String(a) === String(b)
}

export function buildPathProgressCtx(st = {}) {
  const pid = st.currentProjectId
  const project =
    (st.projects || []).find((p) => sameProjectId(p.id, pid)) || null
  const moodItems = (st.moodItems || []).filter(
    (m) => m.projectId == null || sameProjectId(m.projectId, pid)
  )
  const tasks = (st.tasks || []).filter(
    (t) => t.projectId == null || sameProjectId(t.projectId, pid)
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
      return '#detective-clientName, #detective-goal, #detective-audience'
    case 'research':
      return '.board-upload-btn, .studio-view .btn-primary, #board-note'
    case 'ideate':
      return '#dir-title-a, .spark-actions .btn-primary'
    case 'sketch':
      return '#desk-capture, #step-why, #current-step'
    case 'design':
      return '#brand-tagline, #brand-brief, .system-acc-tab'
    case 'review':
      return '#feedback-notes'
    case 'deliver':
      return '#handoff-note, #learnings-note'
    default:
      return null
  }
}

/** English fill hints — single source; i18n pathFillHint falls back here. */

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
