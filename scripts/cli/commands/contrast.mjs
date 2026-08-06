/**
 * `cc contrast` — the readability of a palette, and what would fix it.
 *
 * Takes either a workspace (uses the project's palette and assigned roles) or
 * bare hex codes, so it is also usable as a standalone checker while a palette
 * is still being argued about.
 *
 * The output follows the app's position on contrast rather than a pass/fail
 * stamp: a pairing below 4.5:1 is reported with what it IS good for, and a
 * suggested fix that drifts far from the original colour is labelled as a new
 * colour rather than presented as a free win.
 */

import { load, MOD } from '../runtime.mjs'
import { readWorkspace, resolveProject, scopeTo } from '../workspace.mjs'
import { c, heading, swatch, table, tick, gap, pad } from '../ui.mjs'
import { UserError } from '../errors.mjs'

export const help = `
${c.bold('cc contrast')} — WCAG reading of a brand palette

  cc contrast [workspace] [options]
  cc contrast '#1C1917' '#0F766E' '#FAFAF9'

Options
  --project <x>      project by name, id, or position (#2)
  --target <n>       4.5 body text (default) · 3 large text and UI · 7 AAA
  --matrix           show the full grid as well as the problems
  --strict           exit 1 when any pairing is below the target
  --json             machine-readable output
`

export async function run(argv) {
  const opts = parseArgs(argv)
  if (opts.help) {
    console.log(help)
    return 0
  }

  const [colorMod, contrastMod, brandSystem, exportFiles] = await Promise.all([
    load(MOD.color),
    load(MOD.contrastMatrix),
    load(MOD.brandSystem),
    load(MOD.exportFiles),
  ])

  let palette = opts.hexes
  let roleRows = []
  let title = 'Palette'

  if (!palette.length) {
    const { workspace, label } = readWorkspace(opts.workspace)
    const project = resolveProject(workspace, opts.project)
    const { tasks, moodItems } = scopeTo(workspace, project)
    const pack = exportFiles.buildBrandPackSnapshot({ project, tasks, moodItems })
    palette = pack.palette || []
    roleRows = brandSystem.buildColorSystem(palette, pack.colorRoles).roleRows
    title = pack.projectName
    console.log(c.grey(label))
  } else {
    const bad = palette.filter((h) => !colorMod.normalizeHex(h))
    if (bad.length) throw new UserError(`Not a colour: ${bad.join(', ')}`)
    palette = palette.map((h) => colorMod.normalizeHex(h))
  }

  const matrix = contrastMod.buildContrastMatrix(palette)
  if (!matrix.colours.length) {
    console.log(c.yellow('No palette to read.'))
    return 0
  }

  const below = matrix.pairs.filter((p) => p.ratio < opts.target)

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          palette: matrix.colours,
          target: opts.target,
          pairs: matrix.pairs.length,
          failing: below.map((p) => ({
            fg: p.fg,
            bg: p.bg,
            ratio: Number(p.ratio.toFixed(2)),
            usableFor: p.usableFor,
            fixes: contrastMod.resolutionsFor(p.fg, p.bg, opts.target),
          })),
          best: matrix.best && { fg: matrix.best.fg, bg: matrix.best.bg, ratio: Number(matrix.best.ratio.toFixed(2)) },
          worst: matrix.worst && { fg: matrix.worst.fg, bg: matrix.worst.bg, ratio: Number(matrix.worst.ratio.toFixed(2)) },
        },
        null,
        2
      )
    )
    return opts.strict && below.length ? 1 : 0
  }

  console.log(heading(title))

  if (roleRows.length) {
    console.log(`  ${c.bold('Roles')}`)
    console.log(
      table(
        [],
        roleRows.map((r) => [
          `    ${swatch(r.hex)}`,
          c.bold(r.label),
          c.grey(r.hex),
          c.grey(r.job || ''),
        ])
      )
    )
    console.log('')
  }

  console.log(`  ${c.bold('Palette')}  ${c.grey(`${matrix.colours.length} colours`)}`)
  console.log(
    `    ${matrix.colours.map((h) => `${swatch(h)} ${c.grey(h)}`).join('  ')}`
  )

  if (opts.matrix) {
    console.log(`\n  ${c.bold('Grid')}  ${c.grey('rows = text, columns = background')}`)
    const head = ['        ', ...matrix.colours.map((h) => pad(h.slice(1), 7))]
    console.log(c.grey(`    ${head.join(' ')}`))
    matrix.rows.forEach((row, i) => {
      const cells = row.map((cell) => {
        if (!cell || cell.same) return c.grey(pad('—', 7))
        const txt = pad(cell.ratio.toFixed(1), 7)
        if (cell.ratio >= 7) return c.green(txt)
        if (cell.ratio >= 4.5) return c.green(txt)
        if (cell.ratio >= 3) return c.yellow(txt)
        return c.red(txt)
      })
      console.log(`    ${c.grey(pad(matrix.colours[i].slice(1), 8))}${cells.join(' ')}`)
    })
  }

  console.log(
    `\n  ${c.bold('Below')} ${c.grey(`${opts.target}:1 — ${below.length} of ${matrix.pairs.length} pairings`)}`
  )
  if (!below.length) {
    console.log(`    ${tick()} ${c.grey('nothing to fix at this target')}`)
  }

  /* Worst first: the pairing most likely to be unreadable is the one worth
     looking at, and a list sorted by palette order buries it. */
  for (const pair of [...below].sort((a, b) => a.ratio - b.ratio)) {
    console.log(
      `\n    ${swatch(pair.fg)}${swatch(pair.bg)} ${c.bold(`${pair.fg} on ${pair.bg}`)}` +
        `  ${(pair.ratio < 3 ? c.red : c.yellow)(`${pair.ratio.toFixed(1)}:1`)}`
    )
    if (pair.usableFor.length) {
      console.log(c.grey(`      Fine for: ${pair.usableFor.join(', ')}`))
    } else {
      console.log(c.grey('      Nothing can be set in this — not body, not large, not a UI shape.'))
    }

    for (const fix of contrastMod.resolutionsFor(pair.fg, pair.bg, opts.target)) {
      if (fix.kind === 'use-as-is') {
        console.log(
          `      ${gap()} ${c.grey(`Leave it — already fine for ${fix.usableFor.join(', ')}.`)}`
        )
        continue
      }
      const what = fix.kind === 'move-background' ? 'Move the background' : 'Move the text colour'
      const drift = fix.drift != null ? ` ${c.grey(`(drift ${fix.drift.toFixed(1)})`)}` : ''
      const warn = fix.newColour
        ? ` ${c.yellow('— far enough that this is a new colour, not an adjustment')}`
        : ''
      console.log(
        `      ${gap()} ${what}: ${swatch(fix.from)}${fix.from} → ${swatch(fix.to)}${c.bold(fix.to)}` +
          ` ${c.green(`${fix.ratio.toFixed(1)}:1`)}${drift}${warn}`
      )
    }
  }

  if (matrix.best) {
    console.log(
      `\n  ${c.grey(
        `Best pairing: ${matrix.best.fg} on ${matrix.best.bg} at ${matrix.best.ratio.toFixed(1)}:1`
      )}`
    )
  }

  return opts.strict && below.length ? 1 : 0
}

function parseArgs(argv) {
  const opts = {
    workspace: null,
    project: null,
    target: 4.5,
    matrix: false,
    strict: false,
    json: false,
    help: false,
    hexes: [],
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') opts.help = true
    else if (a === '--project' || a === '-p') opts.project = argv[++i]
    else if (a === '--target' || a === '-t') {
      const n = Number(argv[++i])
      if (!Number.isFinite(n) || n <= 1) throw new UserError('--target needs a ratio above 1')
      opts.target = n
    } else if (a === '--matrix') opts.matrix = true
    else if (a === '--strict') opts.strict = true
    else if (a === '--json') opts.json = true
    else if (a.startsWith('--')) throw new UserError(`Unknown option: ${a}`)
    /* Anything starting with '#' is a colour ATTEMPT, valid or not — so a typo
       is answered with "not a colour" rather than "cannot read file #zzzzzz".
       Bare six-character hex is accepted too, since quoting '#' in a shell is
       a step people forget. */
    else if (a.startsWith('#') || /^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(a)) {
      opts.hexes.push(a)
    }
    else if (!opts.workspace) opts.workspace = a
    else throw new UserError(`Unexpected argument: ${a}`)
  }
  return opts
}
