/**
 * The pack count is stated as a floor, never as a bare ratio.
 *
 * "★ 3/6" is a number you have to decode, and decoding it produces no next
 * action — it says how far along you are without saying what to do, which is
 * the least useful shape a status can take. It also reads as a scoreboard
 * three-fifths empty, so a project mid-way through its work looks like a
 * project failing at it.
 *
 * That call has now been made four separate times: the project sidebar, the
 * Define chapter rail, the Research heading, and — later, because the
 * decision lived only in a comment on one screen — the Design heading. Each
 * one was found the same way, by someone noticing the ratio again.
 *
 * So it stops being a per-screen judgement and becomes a rule. Say what is
 * still open ("★ 3 for the client (room for 3)"), or say it is done ("★ Client shortlist full (6)").
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(abs, out)
    else if (/\.jsx?$/.test(entry.name) && !entry.name.includes('.test.'))
      out.push(abs)
  }
  return out
}

/**
 * A rendered "<expression>/6" — the shape the bug always took.
 * Matches `{n}/6`, `{list.length}/6` and so on inside JSX text.
 */
const BARE_RATIO = /\}\s*\/\s*6(?![0-9])/

describe('pack count phrasing', () => {
  const files = sourceFiles(join(repoRoot, 'src'))

  it('scans a real set of files', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('no view renders a bare "N/6" pack ratio', () => {
    const offenders = []
    for (const abs of files) {
      const src = readFileSync(abs, 'utf8')
      src.split('\n').forEach((line, i) => {
        if (!BARE_RATIO.test(line)) return
        // Only the ★ pack is governed here; other /6 arithmetic is fine.
        const window = src.split('\n').slice(Math.max(0, i - 6), i + 2).join('\n')
        if (/inPack|★|pack/i.test(window)) {
          offenders.push(`${abs.replace(repoRoot + '/', '')}:${i + 1}  ${line.trim()}`)
        }
      })
    }
    expect(
      offenders,
      'State the pack count as a floor — "N for the client (room for X)", or ' +
        '"shortlist full". Not a ratio:\n' + offenders.join('\n')
    ).toEqual([])
  })

  it('the phrasing the rule asks for is actually present', () => {
    /* Guards against "fixing" this by deleting the count entirely, which
       would pass the test above while removing the signal it exists for. */
    const research = readFileSync(
      join(repoRoot, 'src/views/ResearchView.jsx'),
      'utf8'
    )
    expect(research).toMatch(/room for/)
    expect(research).toMatch(/shortlist full/)
  })
})
