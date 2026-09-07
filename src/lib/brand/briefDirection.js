/**
 * What the brief already settled, resolved for one Identity screen.
 *
 * Pure: the view renders this, tests pin it. See `BriefDirection.jsx` for
 * why the block exists and why it is scoped to the screen.
 */
import { splitBriefWords } from './strategySeed'

/** Brief field → the label a designer reads on the bench. */
export const BRIEF_LINE_LABELS = Object.freeze({
  feel: 'Should feel',
  brandWords: 'Values',
  audience: 'Customers',
  competitors: 'Competitors',
  avoid: 'Avoid',
  accessibilityNeeds: 'Accessibility',
  existingAssets: 'Existing artwork',
})

/** Which brief lines bear on which Identity screen. */
export const BRIEF_LINES_BY_SUBSTEP = Object.freeze({
  logo: ['feel', 'brandWords', 'competitors', 'existingAssets'],
  colors: ['feel', 'avoid', 'accessibilityNeeds'],
  type: ['audience', 'feel', 'accessibilityNeeds'],
  handover: ['audience', 'existingAssets'],
})

const clean = (v) => String(v ?? '').trim()

/**
 * The lines this screen shows, resolved from the brief. Exported so a test
 * can pin the resolution without rendering.
 *
 * @param {object} project
 * @param {string} substep
 * @returns {{ words: string[], lines: Array<{ id: string, label: string, value: string }> }}
 */
export function briefDirection(project, substep) {
  const d = project?.detective || {}
  const words = (Array.isArray(project?.strategyAttributes)
    ? project.strategyAttributes
    : []
  )
    .map((a) => clean(a?.label))
    .filter(Boolean)
    .slice(0, 12)
  const ids = BRIEF_LINES_BY_SUBSTEP[substep] || BRIEF_LINES_BY_SUBSTEP.logo
  const chip = new Set(words.map((w) => w.toLowerCase()))
  /* An answer that has already become chips is not repeated as a line:
     "reassured, warm" under a row of chips reading reassured · warm says the
     same thing twice. A sentence answer splits into no words, so it stays. */
  const alreadyChips = (value) => {
    const split = splitBriefWords(value)
    return split.length > 0 && split.every((w) => chip.has(w.toLowerCase()))
  }
  const lines = ids
    .map((id) => ({ id, label: BRIEF_LINE_LABELS[id], value: clean(d[id]) }))
    .filter((l) => l.value && !alreadyChips(l.value))
  return { words, lines }
}

