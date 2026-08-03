import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JOURNEY_STEPS } from './journey'

/**
 * The e2e specs must derive the path too.
 *
 * Ten of them kept a private copy — "Step 1: Define", "Step 3: Ideate",
 * "Step 7: Deliver", headings 'Design'/'Sketch'/'Review' — so the rename to
 * five stops turned the suite red while the app was correct, and it stayed
 * red long enough to be treated as background noise. That is exactly the
 * failure `journeySingleSource.test.js` guards against in src; this is the
 * same rule reaching the tests, which CLAUDE.md calls out by name after
 * processGuide.test.js and clientInbox.test.js froze the old order.
 *
 * Deliberately a source grep, not a runtime check: it costs nothing, runs in
 * `npm test` rather than the 20-minute browser suite, and fails on the line
 * that reintroduced the copy.
 */

const E2E_DIR = new URL('../../../e2e', import.meta.url).pathname

/**
 * Words that named a path stop and now name nothing.
 *
 * Not every retired stop belongs here. Ideate and Review stopped being path
 * stops in the same rename but still exist as Tools with those exact names,
 * so specs are right to say them — they just have to reach them through the
 * Tools menu instead of the step nav. Listing them would make this guard
 * demand the wrong fix.
 */
const RETIRED = ['Define', 'Sketch', 'Deliver']
const CURRENT = JOURNEY_STEPS.map((s) => s.label)

function specs() {
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith('.spec.js'))
    .map((f) => ({ name: f, text: readFileSync(join(E2E_DIR, f), 'utf8') }))
}

/** Comments explain history; only executable lines are the concern. */
function code(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
}

describe('e2e specs derive the journey', () => {
  it('finds spec files to check', () => {
    expect(specs().length).toBeGreaterThan(5)
  })

  it('no spec writes a "Step N: Label" string of its own', () => {
    const offenders = []
    specs().forEach(({ name, text }) => {
      const found = code(text).match(/Step \d+:\s*\w+/g)
      if (found) offenders.push(`${name}: ${[...new Set(found)].join(', ')}`)
    })
    expect(offenders).toEqual([])
  })

  it('no spec names a retired path label', () => {
    /* Catches the other half: `getByRole('heading', { name: 'Design' })`
       and `hasText: 'Deliver'` carry no step number, so the check above
       cannot see them, and they were most of the real breakage. */
    const live = new Set(CURRENT)
    const dead = RETIRED.filter((l) => !live.has(l))
    const offenders = []
    specs().forEach(({ name, text }) => {
      const body = code(text)
      dead.forEach((label) => {
        if (new RegExp(`['\`]${label}['\`]`).test(body)) {
          offenders.push(`${name}: '${label}'`)
        }
      })
    })
    expect(offenders).toEqual([])
  })

  it('no spec hard-codes how many stops there are', () => {
    const offenders = []
    specs().forEach(({ name, text }) => {
      if (/\b\d+[- ]step\b/i.test(code(text))) offenders.push(name)
    })
    expect(offenders).toEqual([])
  })
})
