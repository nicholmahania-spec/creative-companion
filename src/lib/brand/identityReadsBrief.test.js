import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  BRIEF_LINES_BY_SUBSTEP,
  BRIEF_LINE_LABELS,
  briefDirection,
} from './briefDirection'
import { DETECTIVE_CHAPTERS } from '../brief/detectiveBrief'
import { IDENTITY_SUBSTEP_IDS } from '../journey/identitySubsteps'

/**
 * Identity reads the brief at the bench. Every line it shows is a real
 * brief question, every Identity screen has a set, and the block is wired
 * onto the tool column — not the artboard, which prints to the client.
 */

const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '../..', p), 'utf8')

describe('Identity reads the brief', () => {
  it('every line shown is a question the brief actually asks', () => {
    const ids = new Set(
      DETECTIVE_CHAPTERS.flatMap((c) => (c.fields || []).map((f) => f.id))
    )
    for (const id of Object.keys(BRIEF_LINE_LABELS)) expect(ids.has(id)).toBe(true)
    for (const list of Object.values(BRIEF_LINES_BY_SUBSTEP))
      for (const id of list) expect(BRIEF_LINE_LABELS[id]).toBeTruthy()
  })

  it('every Identity screen has its own set of lines', () => {
    for (const id of IDENTITY_SUBSTEP_IDS)
      expect(BRIEF_LINES_BY_SUBSTEP[id]?.length).toBeGreaterThan(0)
  })

  it('resolves live from the brief and shows the strategy words', () => {
    const project = {
      detective: { feel: 'reassured', competitors: 'Acme', audience: '' },
      strategyAttributes: [{ id: 'x', label: 'Warm' }],
    }
    const mark = briefDirection(project, 'logo')
    expect(mark.words).toEqual(['Warm'])
    expect(mark.lines.map((l) => l.id)).toEqual(['feel', 'competitors'])
    const type = briefDirection(project, 'type')
    expect(type.lines.map((l) => l.id)).toEqual(['feel'])
  })

  it('does not repeat as a line an answer that is already chips', () => {
    const project = {
      detective: { feel: 'reassured, warm' },
      strategyAttributes: [
        { id: 'a', label: 'reassured' },
        { id: 'b', label: 'Warm' },
      ],
    }
    expect(briefDirection(project, 'colors').lines).toEqual([])
    /* A sentence is not chips, so it stays. */
    const prose = { ...project, detective: { feel: 'Like they can trust us' } }
    expect(briefDirection(prose, 'colors').lines.map((l) => l.id)).toEqual(['feel'])
  })

  it('shows nothing at all for a project with no answers', () => {
    expect(briefDirection({}, 'logo')).toEqual({ words: [], lines: [] })
  })

  it('is on the tool column of the Identity view, beside the artboard', () => {
    const design = read('views/DesignView.jsx')
    expect(design).toMatch(/<BriefDirection[\s\S]*?substep=\{identitySubstep\}/)
    const artboard = read('components/BrandArtboard.jsx')
    expect(artboard).not.toContain('BriefDirection')
  })
})
