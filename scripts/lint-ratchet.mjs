#!/usr/bin/env node
/**
 * ESLint as a ratchet: the error count may fall, never rise.
 *
 * WHY NOT JUST FAIL ON ANY ERROR. This config had never been run — eslint was
 * not installed and there was no lint script — so the first execution reported
 * 208 problems across a working, shipping app. Gating CI on zero would mean
 * either a single enormous risky sweep through code that currently works, or
 * (far more likely) turning the gate off again and being exactly where we
 * started. A budget that only moves down gets the benefit immediately and pays
 * the debt off in the normal course of touching files.
 *
 * WHAT IS ALREADY AT ZERO, and stays there: `no-undef`. That rule is the whole
 * reason this exists. Its first run found `cloudSync.js` calling `appUrl()`
 * without importing it, so requesting a password reset threw a ReferenceError
 * — invisible to the build, invisible to 905 unit tests. The same shape had
 * just shipped into the Touchpoints screen (`projectPalette is not defined`)
 * behind a clean build and a green suite, because nothing renders those views.
 * A free identifier is not a style opinion; it is a crash that has not
 * happened yet. So it is enforced absolutely, separately from the budget.
 *
 * HOW TO SATISFY THIS when it fails on you:
 *   - `no-undef` at all → fix it. It is a real bug or a missing import.
 *     Do not add it to the budget.
 *   - budget exceeded → you added errors. Fix them, or fix an equal number
 *     elsewhere. Do NOT raise the number.
 *   - you cleaned some up → lower BUDGET in the same commit. That is what
 *     makes the ratchet hold; otherwise the slack silently refills.
 */
import { ESLint } from 'eslint'

/** Measured 2026-08-05. Lowered 140→139 when the readability rewrite removed
    orphaned code. A ceiling, not a target — lower it whenever you gain ground. */
const BUDGET = 137

/** Rules that are never allowed, whatever the budget says. */
const ZERO_TOLERANCE = new Set([
  'no-undef', // a free identifier is a crash that has not happened yet
  'no-const-assign',
  'no-dupe-keys',
  'no-unreachable',
])

const eslint = new ESLint()
const results = await eslint.lintFiles(['.'])

let errors = 0
const banned = []
for (const file of results) {
  for (const m of file.messages) {
    if (m.severity !== 2) continue
    errors++
    if (ZERO_TOLERANCE.has(m.ruleId)) {
      const rel = file.filePath.replace(`${process.cwd()}/`, '')
      banned.push(`  ${rel}:${m.line}  ${m.ruleId}  ${m.message.split('\n')[0]}`)
    }
  }
}

if (banned.length) {
  console.error(
    `\n✘ ${banned.length} error(s) in rules that are never allowed:\n` +
      banned.join('\n') +
      '\n\nThese are bugs, not style. Fix them — do not budget them.\n'
  )
  process.exit(1)
}

if (errors > BUDGET) {
  console.error(
    `\n✘ ESLint errors rose to ${errors}, above the budget of ${BUDGET}.\n` +
      '  The budget only moves DOWN. Fix what you added, or fix an equal\n' +
      '  number elsewhere — do not raise the number.\n'
  )
  process.exit(1)
}

const slack = BUDGET - errors
console.log(
  `✓ ESLint: ${errors} errors, budget ${BUDGET}` +
    (slack > 0
      ? `\n  ${slack} under budget — lower BUDGET in scripts/lint-ratchet.mjs to ${errors} to keep the ground you gained.`
      : '')
)
