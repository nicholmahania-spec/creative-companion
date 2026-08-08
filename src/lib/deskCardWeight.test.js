import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const desk = readFileSync(resolve(here, '../views/DeskView.jsx'), 'utf8')
const app = readFileSync(resolve(here, '../App.jsx'), 'utf8')

describe('Desk uses the sidebar as its project map', () => {
  it('does not restore the oversized next-stop card', () => {
    expect(desk).not.toContain('className="desk-card"')
    expect(desk).not.toContain('className="desk-card-hit"')
  })

  it('keeps one primary route into the next stop', () => {
    expect(desk).toMatch(/className="btn btn-primary"[\s\S]*onClick=\{\(\) => onOpenView\(gapRow\.view\)\}/)
  })

  it('keeps done and not-needed actions behind quiet path options', () => {
    expect(desk).toContain('className="desk-path-options"')
    expect(desk).toContain('onMarkStepDone(gapRow.id, true)')
    expect(desk).toContain('onToggleNotNeeded(gapRow.id)')
  })

  it('names the artifacts stored at every sidebar stop', () => {
    for (const label of [
      'Project brief',
      'Reference wall',
      'Brand system',
      'Mockups',
      'Project files',
    ]) {
      expect(app).toContain(label)
    }
  })
})
