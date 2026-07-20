/**
 * ADHD session resume — survive reload mid-break / mid-timer / mid-path.
 * Absolute timestamps (endsAt) so background tabs stay honest.
 */

import { journeyIdForView } from './journey'
import { pathGapFocusSelector } from './journeyProgress'

export const DESK_SESSION_KEY = 'cc-desk-session-v1'

const PATH_VIEWS = new Set([
  'project',
  'studio',
  'spark',
  'flow',
  'brand',
  'review',
  'finish',
])

const ALL_VIEWS = new Set([
  ...PATH_VIEWS,
  'insights',
  'calendar',
  'settings',
])

/**
 * @typedef {{
 *   v: number,
 *   activeView?: string|null,
 *   projectId?: string|number|null,
 *   forcedBreak?: object|null,
 *   focus?: object|null,
 *   updatedAt?: number,
 * }} DeskSession
 */

/** @returns {DeskSession|null} */
export function loadDeskSession() {
  try {
    const raw = localStorage.getItem(DESK_SESSION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || typeof p !== 'object') return null
    return p
  } catch {
    return null
  }
}

/** Merge-patch desk session snapshot. */
export function saveDeskSession(partial = {}) {
  try {
    const prev = loadDeskSession() || { v: 1 }
    const next = {
      ...prev,
      ...partial,
      v: 1,
      updatedAt: Date.now(),
    }
    localStorage.setItem(DESK_SESSION_KEY, JSON.stringify(next))
    return next
  } catch {
    return null
  }
}

export function clearForcedBreakSession() {
  const prev = loadDeskSession() || { v: 1 }
  try {
    localStorage.setItem(
      DESK_SESSION_KEY,
      JSON.stringify({
        ...prev,
        forcedBreak: null,
        updatedAt: Date.now(),
      })
    )
  } catch {
    /* ignore */
  }
}

export function clearFocusSession() {
  const prev = loadDeskSession() || { v: 1 }
  try {
    localStorage.setItem(
      DESK_SESSION_KEY,
      JSON.stringify({
        ...prev,
        focus: null,
        updatedAt: Date.now(),
      })
    )
  } catch {
    /* ignore */
  }
}

/**
 * Build a forced-break snapshot with absolute endsAt.
 * @param {object} fb
 * @param {number} [now]
 */
export function serializeForcedBreak(fb, now = Date.now()) {
  if (!fb) return null
  const leftSec = Math.max(0, Number(fb.leftSec) || 0)
  const totalSec = Math.max(leftSec, Number(fb.totalSec) || leftSec)
  const endsAt =
    Number(fb.endsAt) > 0 ? Number(fb.endsAt) : now + leftSec * 1000
  return {
    endsAt,
    totalSec,
    workMinutes: Number(fb.workMinutes) || 0,
    breakMinutes: Number(fb.breakMinutes) || Math.ceil(totalSec / 60),
    reason: fb.reason || 'pomodoro',
    planItems: Array.isArray(fb.planItems) ? fb.planItems : [],
    completedIds: Array.isArray(fb.completedIds) ? fb.completedIds : [],
    resumeView: fb.resumeView || null,
  }
}

/**
 * @param {object|null} saved
 * @param {number} [now]
 * @returns {{ active: object } | { expired: true, resumeView: string|null } | null}
 */
export function hydrateForcedBreak(saved, now = Date.now()) {
  if (!saved || typeof saved !== 'object') return null
  const endsAt = Number(saved.endsAt) || 0
  if (!endsAt) return null
  const leftSec = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const resumeView =
    saved.resumeView && ALL_VIEWS.has(saved.resumeView)
      ? saved.resumeView
      : null
  if (leftSec <= 0) {
    return { expired: true, resumeView }
  }
  return {
    active: {
      endsAt,
      totalSec: Math.max(leftSec, Number(saved.totalSec) || leftSec),
      leftSec,
      workMinutes: Number(saved.workMinutes) || 0,
      breakMinutes:
        Number(saved.breakMinutes) || Math.ceil((Number(saved.totalSec) || leftSec) / 60),
      reason: saved.reason || 'pomodoro',
      planItems: Array.isArray(saved.planItems) ? saved.planItems : [],
      completedIds: Array.isArray(saved.completedIds) ? saved.completedIds : [],
      resumeView,
    },
  }
}

/**
 * Recompute leftSec from endsAt (tab sleep safe).
 * @returns {object|null} updated break or null if done
 */
export function tickForcedBreak(fb, now = Date.now()) {
  if (!fb) return null
  const endsAt =
    Number(fb.endsAt) > 0
      ? Number(fb.endsAt)
      : now + Math.max(0, Number(fb.leftSec) || 0) * 1000
  const leftSec = Math.max(0, Math.ceil((endsAt - now) / 1000))
  if (leftSec <= 0) return { ...fb, endsAt, leftSec: 0 }
  return { ...fb, endsAt, leftSec }
}

/**
 * @param {{ running?: boolean, endsAt?: number|null, leftSec?: number, source?: string|null }} focus
 */
export function serializeFocus(focus, now = Date.now()) {
  if (!focus) return null
  const leftSec = Math.max(0, Number(focus.leftSec) || 0)
  if (focus.running) {
    const endsAt =
      Number(focus.endsAt) > 0 ? Number(focus.endsAt) : now + leftSec * 1000
    return {
      running: true,
      endsAt,
      leftSec: Math.max(0, Math.ceil((endsAt - now) / 1000)),
      source: focus.source || null,
    }
  }
  return {
    running: false,
    endsAt: null,
    leftSec,
    source: focus.source || null,
  }
}

/**
 * @returns {{ leftSec: number, running: boolean, source: string|null, ended: boolean }|null}
 */
export function hydrateFocus(saved, now = Date.now()) {
  if (!saved || typeof saved !== 'object') return null
  const source = saved.source || null
  if (saved.running && Number(saved.endsAt) > 0) {
    const leftSec = Math.max(0, Math.ceil((Number(saved.endsAt) - now) / 1000))
    if (leftSec <= 0) {
      return { leftSec: 0, running: false, source, ended: true }
    }
    return {
      leftSec,
      running: true,
      source,
      ended: false,
      endsAt: Number(saved.endsAt),
    }
  }
  const leftSec = Math.max(0, Number(saved.leftSec) || 0)
  if (!leftSec && !saved.running) return null
  return {
    leftSec,
    running: false,
    source,
    ended: false,
    endsAt: null,
  }
}

export function isPathView(view) {
  return PATH_VIEWS.has(view)
}

/** Label map for resume banner (EN fallback; UI may i18n). */
export const VIEW_RESUME_LABELS = {
  project: 'Define',
  studio: 'Research',
  spark: 'Ideate',
  flow: 'Sketch',
  brand: 'Design',
  review: 'Review',
  finish: 'Deliver',
  insights: 'Insights',
  calendar: 'Calendar',
  settings: 'Settings',
}

/**
 * Focus the first matching path-gap field after a view jump.
 * @param {string} viewOrStepId - path view ('flow') or step id ('sketch')
 * @param {{ delayMs?: number }} [opts]
 * @returns {boolean} whether a selector was scheduled
 */
export function focusPathGapField(viewOrStepId, { delayMs = 140 } = {}) {
  if (typeof document === 'undefined') return false
  let stepId = viewOrStepId
  if (PATH_VIEWS.has(viewOrStepId) || ALL_VIEWS.has(viewOrStepId)) {
    stepId = journeyIdForView(viewOrStepId) || viewOrStepId
  }
  const sel = pathGapFocusSelector(stepId)
  if (!sel) return false
  const run = () => {
    try {
      const el = document.querySelector(sel)
      if (!el) return
      if (typeof el.focus === 'function') {
        el.focus({ preventScroll: false })
      }
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    } catch {
      /* ignore */
    }
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      setTimeout(run, delayMs)
    })
  } else {
    setTimeout(run, delayMs)
  }
  return true
}

/**
 * Build resume banner payload from desk session + project context.
 */
export function buildResumeBanner({
  session = null,
  projectName = '',
  nextStepTitle = '',
  decisionLine = '',
  activeView = null,
} = {}) {
  const view =
    (session?.activeView && ALL_VIEWS.has(session.activeView)
      ? session.activeView
      : null) ||
    (activeView && ALL_VIEWS.has(activeView) ? activeView : null) ||
    (nextStepTitle ? 'flow' : 'project')

  const breakHydrate = hydrateForcedBreak(session?.forcedBreak)
  const focusHydrate = hydrateFocus(session?.focus)

  let mode = 'reload' // default soft resume
  if (breakHydrate?.active) mode = 'break-active'
  else if (breakHydrate?.expired) mode = 'break-done'
  else if (focusHydrate?.running) mode = 'timer-running'
  else if (focusHydrate?.ended) mode = 'timer-ended'

  return {
    name: projectName || 'Project',
    step: nextStepTitle || '',
    view,
    viewLabel: VIEW_RESUME_LABELS[view] || view,
    decisionLine: decisionLine || '',
    mode,
    rejoinTimer: !!(focusHydrate?.running && focusHydrate.leftSec > 0),
    focusLeftSec: focusHydrate?.leftSec || 0,
    afterBreak: mode === 'break-done',
  }
}
