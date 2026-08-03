/**
 * `!important` is a ratchet: it may fall, never rise.
 *
 * CLAUDE.md has said "do not add another" for a long time and the count kept
 * climbing anyway, because a rule nothing checks is a suggestion. This makes
 * it mechanical.
 *
 * The cost is not theoretical. `shell.css` carries 458 of these, and the
 * journey navigation is where they pile up — 8 rules for
 * `.journey-sidebar .journey-step`, 5 for `.journey-sidebar .journey-bar-list`.
 * That is what let a `width: max-content !important`, written for the
 * 768-860px horizontal strip, also apply to the 390px drawer and clip three
 * of five journey stages inside the panel opened to see them. No single rule
 * was wrong; they were wrong together, and no one could see the stack.
 *
 * HOW TO SATISFY THIS TEST when it fails on you:
 *
 *   Do NOT raise the budget. The budget only moves down.
 *
 *   An `!important` is a bet that you cannot find the rule you are fighting.
 *   Find it. `grep -n "your-selector" src/styles/*.css` and look at how many
 *   blocks come back — if it is more than two, the fix is almost always to
 *   narrow or merge one of them, not to out-shout it.
 *
 * WHEN YOU REMOVE SOME: lower the number here in the same commit. That is
 * what makes the ratchet hold — otherwise the slack silently refills.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join, relative } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Measured 2026-07-31. These are ceilings, not targets.
 * A file absent from this map is budgeted at zero — new stylesheets start
 * clean, which is the one place this debt is cheap to not acquire.
 */
const BUDGET = {
  'src/styles/shell.css': 442,
  'src/styles/lazy-buddy.css': 55,
  'src/styles/lazy-settings.css': 36,
  'src/styles/lazy-design.css': 18,
  'src/styles/lazy-sketch.css': 0,
  'src/styles/lazy-worklog.css': 0,
  'src/styles/lazy-define.css': 18,
  'src/styles/lazy-deliver.css': 18,
  'src/styles/lazy-mood.css': 7,
  'src/styles/lazy-ideate.css': 8,
  // All six are inside `prefers-reduced-motion` — an accessibility override
  // that has to beat whatever animation it is switching off. These are the
  // legitimate use and are not a reduction target.
  'src/styles/lazy-motion.css': 6,
  'src/styles/brand-book-builder.css': 0,
  'src/styles/lazy-review.css': 1,
}

const TOTAL_BUDGET = Object.values(BUDGET).reduce((a, b) => a + b, 0)

function cssFiles(dir = join(repoRoot, 'src'), out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) cssFiles(abs, out)
    else if (entry.endsWith('.css')) out.push(abs)
  }
  return out
}

/**
 * Declarations only — comments are stripped first.
 *
 * Counting raw occurrences made the figure 672 when the real number was 663:
 * nine of them were the phrase appearing inside explanatory comments, several
 * of which are comments *warning* about the practice. Worse, an uncorrected
 * counter can be satisfied by adding a real override while deleting a comment
 * that mentions one, which is the exact opposite of the intent.
 */
function countImportant(abs) {
  const withoutComments = readFileSync(abs, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  return (withoutComments.match(/!important/g) || []).length
}

describe('!important ratchet', () => {
  const files = cssFiles()

  it('finds the stylesheets at all', () => {
    // Guards the guard — a bad walk would make every assertion below vacuous.
    expect(files.length).toBeGreaterThan(10)
  })

  it('no file exceeds its budget', () => {
    const over = []
    for (const abs of files) {
      const rel = relative(repoRoot, abs).split('\\').join('/')
      const count = countImportant(abs)
      const budget = BUDGET[rel] ?? 0
      if (count > budget) over.push({ rel, count, budget })
    }
    expect(
      over,
      over
        .map(
          (o) =>
            `${o.rel}: ${o.count} !important (budget ${o.budget}). ` +
            `Fix the base rule instead — do not raise the budget.`
        )
        .join('\n')
    ).toEqual([])
  })

  it('the total does not rise', () => {
    const total = files.reduce((s, f) => s + countImportant(f), 0)
    expect(total).toBeLessThanOrEqual(TOTAL_BUDGET)
  })

  it('budgets are not padded above the real counts', () => {
    /* A budget set higher than reality is pre-approved room to grow, which
       defeats the ratchet quietly. If a count drops, this fails and the
       number gets tightened in the same commit as the removal. */
    const slack = []
    for (const [rel, budget] of Object.entries(BUDGET)) {
      const count = countImportant(join(repoRoot, rel))
      if (count < budget) slack.push(`${rel}: ${count} now, budget still ${budget}`)
    }
    expect(
      slack,
      `Budget is above the real count — tighten it here:\n${slack.join('\n')}`
    ).toEqual([])
  })
})
