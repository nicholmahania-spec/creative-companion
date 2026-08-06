/**
 * `cc check` — what is missing, before anyone pays for it.
 *
 * Three readings, all from the app's own functions so this cannot disagree with
 * what the Pack page shows:
 *   packReadiness         — is the pack shippable
 *   pathProgressSummary   — which stages have content
 *   getDetectiveProgress  — how much of the brief was answered
 *
 * Exit code 1 when the pack is not ready, so this works as a CI gate. The
 * output stays non-punitive on purpose: gaps are listed as gaps, and things
 * waiting on a client are not styled as errors.
 */

import { load, MOD } from '../runtime.mjs'
import {
  readWorkspace,
  resolveProject,
  scopeTo,
  progressStateFor,
} from '../workspace.mjs'
import { c, heading, tick, gap, bar, orMissing, table } from '../ui.mjs'
import { UserError } from '../errors.mjs'

export const help = `
${c.bold('cc check')} — what the pack is still missing

  cc check [workspace] [options]

Options
  --project <x>      project by name, id, or position (#2)
  --all-projects     check every project in the file
  --warn-only        always exit 0, even when the pack is not ready
  --json             machine-readable output
`

export async function run(argv) {
  const opts = parseArgs(argv)
  if (opts.help) {
    console.log(help)
    return 0
  }

  const { workspace, path, label } = readWorkspace(opts.workspace)
  const [exportFiles, projectTypes, journeyProgress, detectiveBrief, contrastMatrix] =
    await Promise.all([
      load(MOD.exportFiles),
      load(MOD.projectTypes),
      load(MOD.journeyProgress),
      load(MOD.detectiveBrief),
      load(MOD.contrastMatrix),
    ])

  const targets = opts.allProjects
    ? workspace.projects
    : [resolveProject(workspace, opts.project)]

  const reports = targets.map((project) => {
    const { tasks, moodItems } = scopeTo(workspace, project)
    const pack = exportFiles.buildBrandPackSnapshot({ project, tasks, moodItems })
    const readiness = exportFiles.packReadiness(pack)

    const steps = projectTypes.stepsForProject(project)
    const ctx = journeyProgress.buildPathProgressCtx(progressStateFor(workspace, project))
    const stages = journeyProgress.pathProgressSummary(steps, ctx)
    const firstGap = journeyProgress.pathFirstGap(steps, ctx)

    const brief = detectiveBrief.getDetectiveProgress(project.detective || {})
    const requiredEmpty = detectiveBrief.getRequiredEmpty(
      project.detective || {},
      project.deadline || ''
    )

    const matrix = contrastMatrix.buildContrastMatrix(pack.palette || [])

    return {
      project,
      pack,
      readiness,
      stages,
      firstGap,
      brief,
      requiredEmpty,
      matrix,
      type: projectTypes.projectType(project.projectType),
    }
  })

  if (opts.json) {
    console.log(JSON.stringify(reports.map(toJson), null, 2))
  } else {
    console.log(c.grey(`${label} · ${path}`))
    reports.forEach(print)
  }

  const anyNotReady = reports.some((r) => !r.readiness.allDone)
  return anyNotReady && !opts.warnOnly ? 1 : 0
}

function print(r) {
  const { readiness, stages, brief, requiredEmpty, matrix, type } = r
  console.log(heading(`${r.pack.projectName}  ${c.grey(`· ${type.label}`)}`))

  const verdict = readiness.allDone
    ? c.green('Ready to ship')
    : readiness.thin
      ? c.yellow('Thin — the core of the pack is not there yet')
      : c.yellow('Not ready')
  console.log(
    `  ${verdict}  ${c.grey(`${readiness.okCount}/${readiness.checks.length} pack checks`)}`
  )

  console.log(`\n  ${c.bold('Pack')}`)
  for (const check of readiness.checks) {
    console.log(`    ${check.ok ? tick() : gap()} ${check.ok ? check.label : c.yellow(check.label)}`)
  }

  console.log(`\n  ${c.bold('Stages')}  ${bar(stages.filter((s) => s.done).length, stages.length)}`)
  console.log(
    table(
      [],
      stages.map((s) => [
        `    ${s.done ? tick() : gap()}`,
        `${c.grey(s.num)} ${s.done ? s.label : c.yellow(s.label)}`,
      ])
    )
  )
  if (r.firstGap) {
    console.log(c.grey(`    Next gap: ${r.firstGap.label} (${r.firstGap.view})`))
  }

  console.log(
    `\n  ${c.bold('Brief')}  ${bar(brief.filledCount, brief.fieldTotal)} ` +
      c.grey(`${brief.filledCount}/${brief.fieldTotal} answered · ${brief.pct}%`)
  )
  if (requiredEmpty.length) {
    console.log(c.grey('    Required, still empty:'))
    for (const f of requiredEmpty) console.log(`    ${gap()} ${c.yellow(f.label)}`)
  } else {
    console.log(`    ${tick()} ${c.grey('every required question answered')}`)
  }

  /* Contrast is reported, never enforced. A pairing that fails AA for body text
     can be a deliberate decorative choice, and the designer is the one who
     decides — the same line the app takes. */
  console.log(`\n  ${c.bold('Colour')}`)
  if (!matrix.colours.length) {
    console.log(`    ${gap()} ${c.yellow('no palette yet')}`)
  } else if (!matrix.failing.length) {
    console.log(`    ${tick()} ${c.grey('every pairing clears AA for body text')}`)
  } else {
    console.log(
      c.grey(
        `    ${matrix.failing.length} of ${matrix.pairs.length} pairings are below 4.5:1` +
          (matrix.unusable.length
            ? `, ${matrix.unusable.length} below 3:1`
            : '')
      )
    )
    if (matrix.worst) {
      console.log(
        c.grey(
          `    Worst: ${matrix.worst.fg} on ${matrix.worst.bg} at ${matrix.worst.ratio.toFixed(1)}:1` +
            '   — run `cc contrast` for fixes'
        )
      )
    }
  }

  if (!readiness.hasName) {
    console.log(`\n  ${gap()} ${c.yellow('The project is still called "Untitled project".')}`)
  }
  console.log(`\n  ${c.grey('Handoff note:')} ${orMissing(r.project.handoffNote)}`)
}

function toJson(r) {
  return {
    id: r.project.id,
    name: r.pack.projectName,
    type: r.type.id,
    ready: r.readiness.allDone,
    thin: r.readiness.thin,
    packChecks: r.readiness.checks.map((c2) => ({ id: c2.id, label: c2.label, ok: c2.ok })),
    stages: r.stages.map((s) => ({ id: s.id, label: s.label, done: s.done })),
    firstGap: r.firstGap ? { id: r.firstGap.id, label: r.firstGap.label } : null,
    brief: {
      answered: r.brief.filledCount,
      total: r.brief.fieldTotal,
      pct: r.brief.pct,
      requiredReady: r.brief.requiredReady,
      requiredEmpty: r.requiredEmpty.map((f) => f.id),
    },
    colour: {
      palette: r.matrix.colours,
      failingPairs: r.matrix.failing.length,
      unusablePairs: r.matrix.unusable.length,
      worstRatio: r.matrix.worst ? Number(r.matrix.worst.ratio.toFixed(2)) : null,
    },
  }
}

function parseArgs(argv) {
  const opts = {
    workspace: null,
    project: null,
    allProjects: false,
    warnOnly: false,
    json: false,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') opts.help = true
    else if (a === '--project' || a === '-p') opts.project = argv[++i]
    else if (a === '--all-projects') opts.allProjects = true
    else if (a === '--warn-only') opts.warnOnly = true
    else if (a === '--json') opts.json = true
    else if (a.startsWith('-')) throw new UserError(`Unknown option: ${a}`)
    else if (!opts.workspace) opts.workspace = a
    else throw new UserError(`Unexpected argument: ${a}`)
  }
  return opts
}
