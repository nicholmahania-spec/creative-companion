/**
 * Zustand equality helpers — keep the App shell from re-rendering on every
 * Define keystroke (detective updates rewrite the projects array).
 */

/** Fields that change often while typing Define; ignore for shell re-renders. */
const SHELL_IGNORE = new Set([
  'detective',
  'discovery',
  'discoveryAnswers',
  'discoveryUpload',
  'discoveryShare',
  'defineOpenChapter',
])

/**
 * True when two project objects match for chrome (sidebar, header, deadline
 * chip). Detective / discovery form text is owned by Define / portal views.
 */
export function projectShellEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  if (a.id !== b.id) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const k of keys) {
    if (SHELL_IGNORE.has(k)) continue
    if (a[k] !== b[k]) return false
  }
  return true
}

/** Equality for the projects array used by App.jsx. */
export function projectsShellEqual(a, b) {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (!projectShellEqual(a[i], b[i])) return false
  }
  return true
}
