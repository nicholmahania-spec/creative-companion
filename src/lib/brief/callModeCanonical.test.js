import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * CALL MODE IS A MODE OF THE BRIEF, NOT A SECOND BRIEF.
 *
 * The surface it replaced — the studio Discovery modal — asked its own 30
 * questions into its own `discoveryAnswers` store, and that is precisely how
 * it drifted out of step with the brief the client actually filled in. The
 * rule that stops it recurring is structural rather than visual: call mode
 * must read the canonical chapters and write through the canonical setter.
 *
 * Textual on purpose. Nothing in the unit suite renders these views, so this
 * is the layer that can still notice a second schema being wired in.
 */
const here = dirname(fileURLToPath(import.meta.url))
const read = (p) => readFileSync(resolve(here, '../..', p), 'utf8')
const sheet = read('features/brief/DetectiveSheet.jsx')
const brief = read('views/DefineView.jsx')

describe('Brief call mode stays on the canonical schema', () => {
  it('the sheet drives call mode from DETECTIVE_CHAPTERS', () => {
    expect(sheet).toContain('callMode')
    expect(sheet).toMatch(/callFields\s*=\s*DETECTIVE_CHAPTERS\.flatMap/)
  })

  it('the Brief runs the call off the same chapters', () => {
    expect(brief).toMatch(/callFields\s*=\s*useMemo\(\(\) => DETECTIVE_CHAPTERS\.flatMap/)
  })

  it('neither touches the retired Discovery schema', () => {
    /* The two names that would mean a second intake had come back. */
    for (const src of [sheet, brief]) {
      expect(src).not.toContain('DISCOVERY_FIELDS')
      expect(src).not.toContain('updateDiscoveryField')
      expect(src).not.toContain('discoveryAnswers')
    }
  })

  it('call mode writes through the canonical setter only', () => {
    /* `updateDetective` is the one path into `detective`; a call-specific
       writer would be the second store this mode exists to avoid. */
    expect(sheet).toContain('updateDetective')
    expect(brief).toContain('updateDetective')
  })

  it('does not reimplement field rendering for the call', () => {
    /* Call mode is a FILTER over the ordinary render, so spectrum keeps its
       five-value control and attachments keep their rows. A separate render
       path is how the two would diverge in shape. */
    expect(sheet).toMatch(/\.filter\(\(f\) => !callMode \|\| f\.id === callField\?\.id\)/)
  })
})
