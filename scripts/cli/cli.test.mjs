/**
 * The guarantee `scripts/build-harbor-demo.mjs` did not have.
 *
 * That script imported a path that had stopped existing, and nothing noticed
 * for months because nothing ran it. A CLI that generates client deliverables
 * has the same failure mode — it is only exercised when someone runs it — so
 * the export path is tested end to end here, against the checked-in demo
 * workspace, right down to the bytes of the PDF.
 */

import { describe, it, expect, afterAll } from 'vitest'
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeRuntime, PROJECT_ROOT } from './runtime.mjs'
import { readWorkspace, resolveProject, scopeTo } from './workspace.mjs'
import { table, pad } from './ui.mjs'

afterAll(async () => {
  await closeRuntime()
})

describe('workspace', () => {
  it('reads the demo by its short name', () => {
    const { workspace, label } = readWorkspace('harbor')
    expect(workspace.projects.length).toBeGreaterThan(0)
    expect(label).toMatch(/Harbor/)
  })

  it('rejects a file that is not a workspace, with the reason', () => {
    expect(() => readWorkspace(join(PROJECT_ROOT, 'package.json'))).toThrow(
      /has no projects/
    )
  })

  it('names the file it cannot read', () => {
    expect(() => readWorkspace('/nope/missing.json')).toThrow(/Cannot read/)
  })

  it('resolves a project by name, id, and position', () => {
    const { workspace } = readWorkspace('harbor')
    const first = workspace.projects[0]
    expect(resolveProject(workspace, first.name).id).toBe(first.id)
    expect(resolveProject(workspace, String(first.id)).id).toBe(first.id)
    expect(resolveProject(workspace, '#1').id).toBe(first.id)
    expect(resolveProject(workspace, null).id).toBe(first.id)
  })

  it('lists the options rather than guessing when nothing matches', () => {
    const { workspace } = readWorkspace('harbor')
    expect(() => resolveProject(workspace, 'nothing-like-this')).toThrow(
      /No project matching/
    )
  })

  it('refuses an ambiguous name instead of picking the first', () => {
    const workspace = {
      projects: [
        { id: 1, name: 'Acme Logo' },
        { id: 2, name: 'Acme Rebrand' },
      ],
    }
    expect(() => resolveProject(workspace, 'acme')).toThrow(/matches 2 projects/)
  })

  it('counts unscoped tasks and pins as the current project’s', () => {
    const workspace = {
      projects: [{ id: 7 }],
      tasks: [{ projectId: 7 }, { projectId: null }, { projectId: 9 }],
      moodItems: [{ projectId: 7 }, { projectId: 9 }],
    }
    const scoped = scopeTo(workspace, workspace.projects[0])
    expect(scoped.tasks).toHaveLength(2)
    expect(scoped.moodItems).toHaveLength(1)
  })
})

describe('ui', () => {
  /* The headerless case was silently unpadded: column widths were derived from
     `headers` alone, so `table([], rows)` produced zero columns and every list
     in `info` and `check` printed ragged. */
  it('aligns columns when there are no headers', () => {
    const out = table([], [['a', 'one'], ['bbbb', 'two']]).split('\n')
    expect(out[0]).toBe('a     one')
    expect(out[1]).toBe('bbbb  two')
  })

  it('keeps a header row when one is given', () => {
    const out = table(['x', 'y'], [['a', 'b']]).split('\n')
    expect(out).toHaveLength(2)
  })

  it('measures width without counting escape codes', () => {
    expect(pad(`\u001b[32mok\u001b[39m`, 5)).toBe(`\u001b[32mok\u001b[39m   `)
  })
})

describe('export', () => {
  it('builds a real multi-page brand book without a browser', async () => {
    const { run } = await import('./commands/export.mjs')
    const out = mkdtempSync(join(tmpdir(), 'cc-export-'))

    const code = await run(['harbor', '--out', out, '--quiet'])
    expect(code).toBe(0)

    for (const name of [
      'brand-book.pdf',
      'brand.md',
      'brief.md',
      'brand.html',
      'tokens.css',
      'tokens.json',
      'pack.json',
      'harbor-hearth-brand-kit.zip',
    ]) {
      expect(existsSync(join(out, name)), `${name} was not written`).toBe(true)
    }

    const pdf = readFileSync(join(out, 'brand-book.pdf'))
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(pdf.toString('latin1')).toContain('%%EOF')
    /* Pages, not just bytes: a header and a trailer around an empty document
       would satisfy every check above. */
    const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []
    expect(pages.length).toBeGreaterThan(5)

    const css = readFileSync(join(out, 'tokens.css'), 'utf8')
    expect(css).toContain('--brand-heading')
    expect(css).toMatch(/--brand-\w+: #[0-9A-Fa-f]{6};/)

    const tokens = JSON.parse(readFileSync(join(out, 'tokens.json'), 'utf8'))
    expect(tokens.name).toMatch(/Harbor/)
    expect(Object.keys(tokens.colors.roles).length).toBeGreaterThan(0)

    /* pack.json must not carry the pin binaries — the app's zip strips them for
       the same reason, and a 400KB data URL per pin makes the file useless to
       read. */
    const pack = JSON.parse(readFileSync(join(out, 'pack.json'), 'utf8'))
    for (const pin of pack.pins) {
      expect(String(pin.visual || '').length).toBeLessThan(8001)
    }
  }, 60_000)

  it('rejects an unknown artefact by name', async () => {
    const { run } = await import('./commands/export.mjs')
    await expect(run(['harbor', '--only', 'pdf,banana'])).rejects.toThrow(
      /banana/
    )
  })

  /**
   * The studio credit, which this command could not produce at all.
   *
   * `--no-watermark` existed to strip a hardcoded "Creative Companion" credit.
   * That credit was replaced by the designer's own studio name, and the option
   * the flag set was deleted from `downloadBrandPackVectorPdf` — but the flag
   * stayed, still documented in `--help`, silently doing nothing. Meanwhile
   * `buildBrandPackSnapshot` was called without `studioName`, so a CLI export
   * printed the project and date and there was no way to add a name.
   *
   * `grep -c watermark scripts/cli/cli.test.mjs` returned 0 when that shipped.
   * These are the tests whose absence let it through.
   */
  const workspaceWith = (prefs) => {
    const file = join(tmpdir(), `cc-studio-${process.pid}-${Math.random()}.json`)
    const demo = JSON.parse(
      readFileSync(join(PROJECT_ROOT, 'public/demos/harbor-hearth-workspace.json'), 'utf8')
    )
    writeFileSync(file, JSON.stringify({ ...demo, prefs }))
    return file
  }

  it('puts the studio name from the workspace into the pack', async () => {
    const { run } = await import('./commands/export.mjs')
    const out = mkdtempSync(join(tmpdir(), 'cc-studio-'))
    const file = workspaceWith({ studioName: 'Mahania Studio' })

    expect(await run([file, '--out', out, '--only', 'json', '--quiet'])).toBe(0)

    const pack = JSON.parse(readFileSync(join(out, 'pack.json'), 'utf8'))
    expect(pack.studio).toBe('Mahania Studio')
  })

  it('falls back to the invoice identity, same as the app', async () => {
    const { run } = await import('./commands/export.mjs')
    const out = mkdtempSync(join(tmpdir(), 'cc-studio-inv-'))
    const file = workspaceWith({
      studioName: '',
      invoiceFrom: 'Mahania Studio\n12 Fore Street',
    })

    expect(await run([file, '--out', out, '--only', 'json', '--quiet'])).toBe(0)

    const pack = JSON.parse(readFileSync(join(out, 'pack.json'), 'utf8'))
    expect(pack.studio).toBe('Mahania Studio')
  })

  it('credits nothing when the workspace has no studio, rather than a platform name', async () => {
    const { run } = await import('./commands/export.mjs')
    const out = mkdtempSync(join(tmpdir(), 'cc-studio-none-'))
    const file = workspaceWith({})

    expect(await run([file, '--out', out, '--only', 'json', '--quiet'])).toBe(0)

    const pack = JSON.parse(readFileSync(join(out, 'pack.json'), 'utf8'))
    expect(pack.studio).toBe('')
    expect(JSON.stringify(pack)).not.toContain('Creative Companion')
  })

  it('says --no-watermark is gone instead of ignoring it', async () => {
    const { run } = await import('./commands/export.mjs')
    /* The point of the test: a flag someone has in a script must not silently
       change nothing. Accepting it quietly is worse than the old behaviour,
       because the PDF changes and nothing explains why. */
    await expect(run(['harbor', '--no-watermark'])).rejects.toThrow(
      /--no-watermark no longer exists/
    )
  })

  it('no longer advertises a flag it does not have', async () => {
    const help = readFileSync(
      join(PROJECT_ROOT, 'scripts/cli/commands/export.mjs'),
      'utf8'
    )
    /* Help text that promises an option the command rejects is the defect
       this whole block exists for, in its most direct form. */
    const helpBlock = help.slice(help.indexOf('Options'), help.indexOf('Artefacts'))
    expect(helpBlock).not.toContain('--no-watermark')
  })
})

describe('check', () => {
  it('exits non-zero for a project whose pack is not ready', async () => {
    const { run } = await import('./commands/check.mjs')
    const empty = join(tmpdir(), `cc-empty-${process.pid}.json`)
    const { writeFileSync } = await import('node:fs')
    writeFileSync(
      empty,
      JSON.stringify({
        version: 1,
        projects: [{ id: 1, name: 'Untitled project', detective: {} }],
        tasks: [],
        moodItems: [],
      })
    )
    const log = console.log
    console.log = () => {}
    try {
      expect(await run([empty])).toBe(1)
      expect(await run([empty, '--warn-only'])).toBe(0)
    } finally {
      console.log = log
    }
  }, 30_000)
})

describe('contrast', () => {
  it('reads bare hex arguments without a workspace', async () => {
    const { run } = await import('./commands/contrast.mjs')
    const lines = []
    const log = console.log
    console.log = (s) => lines.push(String(s))
    try {
      // Black on white: nothing to fix at any sane target.
      expect(await run(['#000000', '#FFFFFF', '--strict'])).toBe(0)
      // A pairing that cannot carry text: --strict must say so.
      expect(await run(['#777777', '#888888', '--strict'])).toBe(1)
    } finally {
      console.log = log
    }
    expect(lines.join('\n')).toContain('Below')
  }, 30_000)

  /**
   * The phantom pass.
   *
   * Roles are assigned separately from the palette and can point at hexes in no
   * palette at all. A matrix over the bare palette therefore reported "every
   * pairing clears AA" for a real workspace whose Text #737373 on Background
   * #FFB8B8 was 2.89:1 — below AA for body text, below even the 3:1 floor for
   * large text. Both readings must include the roles.
   */
  it('sees role colours that are absent from the palette', async () => {
    const { load, MOD } = await import('./runtime.mjs')
    const [contrastMod, brandSystem, colorMod] = await Promise.all([
      load(MOD.contrastMatrix),
      load(MOD.brandSystem),
      load(MOD.color),
    ])
    const { rolePairings, paletteWithRoles } = await import('./roles.mjs')

    const palette = ['#1C1917', '#FFB8B8']
    const colorRoles = { text: '#737373', accent: '#97908C' }
    const sys = brandSystem.buildColorSystem(palette, colorRoles)

    // The bare palette on its own looks spotless — that is the trap.
    const bare = contrastMod.buildContrastMatrix(palette)
    expect(bare.failing).toHaveLength(0)

    const pairs = rolePairings(contrastMod, sys.roles)
    const body = pairs.find((p) => p.id === 'text-on-quiet')
    expect(body).toBeTruthy()
    expect(body.ratio).toBeLessThan(3)
    expect(body.ok).toBe(false)
    expect(body.need).toBe(4.5)

    // And the grid must now contain the role hexes, so the fix is findable.
    const merged = contrastMod.buildContrastMatrix(
      paletteWithRoles(colorMod, palette, sys.roles)
    )
    expect(merged.colours).toContain('#737373')
    expect(merged.failing.length).toBeGreaterThan(0)
  }, 30_000)

  it('refuses something that is not a colour', async () => {
    const { run } = await import('./commands/contrast.mjs')
    await expect(run(['#zzzzzz'])).rejects.toThrow(/Not a colour/)
  })
})
