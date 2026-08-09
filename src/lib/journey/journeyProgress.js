import { getDetectiveProgress } from '../brief/detectiveBrief'

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
/**
 * Has this stop been completed — ever?
 *
 * Two of these conditions could go from true back to false through ordinary
 * work, and the tick vanished from the sidebar, the step rail and the home
 * dots at once, silently and non-locally:
 *
 *  - research required EVERY starred pin to have a note. Star a second pin
 *    and Research un-ticked until you wrote it. Doing more of the thing the
 *    stop measures took the mark away.
 *  - deliver required every comma-separated brandWords entry to be checked
 *    off, keyed by the word's own text — and brandWords is a client-visible
 *    brief field that mergeDetectiveAnswers overwrites. So a CLIENT
 *    re-submitting their brief could un-complete the designer's final stop,
 *    weeks later, from a different screen.
 *
 * Progress that can be taken away by continuing to work reads as punishment
 * for engaging, and with no visible cause the likely reading is "I broke
 * something" or "it lost my work" — neither of which has an action attached.
 * So completion latches: once met, `project.pathReached[stepId]` holds it.
 * Whatever is still outstanding is stated additively on the page itself, not
 * expressed as the loss of a mark.
 */
export function pathStepHasContent(stepId, ctx = {}) {
  /* The user's own verdict outranks both the latch and the live condition,
     in BOTH directions — see `pathDone` in the store.

     Every condition above is a proxy: Touchpoints reads `touchpointApps`,
     Identity reads craft signals. A mark drawn in Illustrator or a stage
     signed off over the phone is invisible to them, and Touchpoints has
     already shipped a bug where Strategy surfaces auto-ticked it before any
     work on this stop. So the app must be correctable in both directions.

     There is no third "marked done, no content" visual state and no asterisk.
     One tick, one meaning: a second grade of done is a new symbol to decode on
     every glance with no action attached, and a tick that shows but does not
     count is the same broken feedback loop as one that vanishes. */
  const verdict = ctx?.project?.pathDone?.[stepId]
  if (verdict === true) return true
  if (verdict === false) return false
  if (ctx?.project?.pathReached?.[stepId]) return true
  return pathStepMeetsCondition(stepId, ctx)
}

/**
 * The LIVE condition for a stop — true when its content is there right now.
 *
 * Kept separate from pathStepHasContent because a live condition can go from
 * true back to false through ordinary work, and the tick must not. Use this
 * only to decide when a stop has newly been reached; use pathStepHasContent
 * for anything the user sees.
 */
export function pathStepMeetsCondition(stepId, ctx = {}) {
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
      /* Touchpoints = application notes on this stop (touchpointApps), not
         Strategy checklists and not mere open desk tasks. At least one
         application from the brief list has a note or “looks right”.

         A CHECKED FILE COUNTS TOO, and that is the point of counting it.
         Dropping the finished business card on the row runs the colour check
         and is strictly stronger evidence that the designer looked at the
         surface than a typed sentence is. Asking them to then also write a
         note about the thing they just proved is the redundant admin this
         product exists to remove — "can the system remember this for the
         designer" (PRODUCT.md §33). */
      const apps = project.touchpointApps || {}
      const any = Object.keys(apps).some((id) => {
        const row = apps[id]
        if (!row || typeof row !== 'object') return false
        return !!(row.done || String(row.note || '').trim() || row.check)
      })
      return any
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
    case 'book': {
      /* The builder writes `bookBuilder` the first time it is touched. Every
         other signal the book could read — palette, type, mark — belongs to
         Identity and would tick this stop for work done three stops earlier,
         which is the auto-tick bug Touchpoints already shipped once. */
      return !!(project.bookBuilder && typeof project.bookBuilder === 'object')
    }
    case 'deliver': {
      /* Handoff or learnings = a real close. Brand-word checkboxes live under
         collapsed “Brand words” on Assets and must not silently gate the
         path tick (2026-08-03 audit). Optional ship polish only. */
      return !!(
        project.handoffNote?.trim() || project.learnings?.trim()
      )
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
      return '#detective-brandSurfaces, #detective-field-brandSurfaces, #detective-deliverablesPicked, #detective-clientName, #detective-goal, #detective-audience'
    case 'research':
      return '.board-upload-btn, .studio-view .btn-primary, #board-note'
    case 'ideate':
      return '#dir-title-a, .spark-actions .btn-primary'
    case 'sketch':
      return '.touchpoints-list textarea, .touchpoints-empty .btn-primary, #desk-capture'
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
