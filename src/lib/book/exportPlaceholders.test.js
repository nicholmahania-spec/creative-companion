/**
 * Export placeholder guardrail.
 *
 * Four export paths — the markdown pack, the copy-summary markdown, the
 * direction-sheet HTML and its PDF clone — each fell back to the literal
 * string "Tagline TBD" when a project had no tagline yet. That text goes to
 * the client. A document that reads "Tagline TBD" doesn't look unfinished,
 * it looks like the tagline IS "Tagline TBD" — invented copy presented as a
 * real answer, which the build rule in CLAUDE.md forbids outright.
 *
 * The fix is to omit the line rather than fill it. These tests hold that:
 * a pack with no tagline must produce output with no tagline slot at all,
 * and a pack that HAS one must still print it.
 */

import { describe, it, expect } from 'vitest'
import {
  brandPackToMarkdown,
  packBriefMarkdown,
} from './exportFiles.js'

const bare = {
  projectName: 'Northwind Coffee',
  exportedAt: '2026-07-31T09:00:00.000Z',
}

describe('exports never invent placeholder copy', () => {
  it('brandPackToMarkdown omits the tagline line when there is no tagline', () => {
    const md = brandPackToMarkdown(bare)
    expect(md).not.toMatch(/TBD/i)
    // No empty blockquote left behind either.
    expect(md).not.toMatch(/^>\s*$/m)
    expect(md).toContain('# Northwind Coffee')
  })

  it('brandPackToMarkdown still prints a real tagline', () => {
    const md = brandPackToMarkdown({ ...bare, tagline: 'Slow mornings.' })
    expect(md).toContain('> Slow mornings.')
  })

  it('packBriefMarkdown omits the tagline when there is no tagline', () => {
    const md = packBriefMarkdown(bare)
    expect(md).not.toMatch(/TBD/i)
    expect(md).not.toMatch(/\*\*\s*\*\*/)
    expect(md).toContain('# Northwind Coffee')
  })

  it('packBriefMarkdown still prints a real tagline', () => {
    const md = packBriefMarkdown({ ...bare, tagline: 'Slow mornings.' })
    expect(md).toContain('**Slow mornings.**')
  })

  it('a whitespace-only tagline counts as no tagline', () => {
    expect(packBriefMarkdown({ ...bare, tagline: '   ' })).not.toMatch(/TBD/i)
    expect(brandPackToMarkdown({ ...bare, tagline: '   ' })).not.toMatch(
      /TBD/i
    )
  })

  it('no export module carries a "TBD" placeholder string', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const src = readFileSync(
      fileURLToPath(new URL('./exportFiles.js', import.meta.url)),
      'utf8'
    )
    expect(src).not.toMatch(/['"`][^'"`]*\bTBD\b[^'"`]*['"`]/)
  })
})
