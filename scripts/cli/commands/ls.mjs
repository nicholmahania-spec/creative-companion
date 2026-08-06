/**
 * `cc ls` — every project in a workspace, one line each.
 *
 * Deadlines are worded, never counted down ("Due this week", not "6d left") —
 * `relativeDeadlineLabel` exists because a number is a worse answer for the
 * people this app is for, and a CLI that reverted to "6d" would be undoing that
 * decision in a second surface.
 */

import { load, MOD } from '../runtime.mjs'
import { readWorkspace, scopeTo, progressStateFor } from '../workspace.mjs'
import { c, table, tick, gap } from '../ui.mjs'
import { UserError } from '../errors.mjs'

export const help = `
${c.bold('cc ls')} — the projects in a workspace

  cc ls [workspace] [options]

Options
  --client <name>    only projects for one client
  --sort <key>       name (default) · deadline · progress
  --json             machine-readable output
`

export async function run(argv) {
  const opts = parseArgs(argv)
  if (opts.help) {
    console.log(help)
    return 0
  }

  const { workspace, label } = readWorkspace(opts.workspace)
  const [exportFiles, projectTypes, journeyProgress, dates] = await Promise.all([
    load(MOD.exportFiles),
    load(MOD.projectTypes),
    load(MOD.journeyProgress),
    load(MOD.dates),
  ])

  let rows = workspace.projects.map((project, i) => {
    const { tasks, moodItems } = scopeTo(workspace, project)
    const pack = exportFiles.buildBrandPackSnapshot({ project, tasks, moodItems })
    const readiness = exportFiles.packReadiness(pack)
    const steps = projectTypes.stepsForProject(project)
    const ctx = journeyProgress.buildPathProgressCtx(progressStateFor(workspace, project))
    const stages = journeyProgress.pathProgressSummary(steps, ctx)
    const done = stages.filter((s) => s.done).length
    return {
      pos: i + 1,
      project,
      name: project.name || 'Untitled project',
      client: String(project.detective?.clientName || '').trim(),
      type: projectTypes.projectType(project.projectType),
      deadline: project.deadline || '',
      deadlineLabel: dates.relativeDeadlineLabel(project.deadline || ''),
      urgency: dates.deadlineUrgency(project.deadline || ''),
      done,
      total: stages.length,
      ready: readiness.allDone,
      thin: readiness.thin,
      openTasks: tasks.filter((t) => !t.completed).length,
      current: String(project.id) === String(workspace.currentProjectId),
    }
  })

  if (opts.client) {
    const needle = opts.client.toLowerCase()
    rows = rows.filter((r) => r.client.toLowerCase().includes(needle))
  }

  if (opts.sort === 'deadline') {
    /* Undated projects last rather than first — an empty string sorts before
       every real date, which would put the projects with no deadline at the top
       of a list whose whole purpose is what is due. */
    rows.sort((a, b) => (a.deadline || '￿').localeCompare(b.deadline || '￿'))
  } else if (opts.sort === 'progress') {
    rows.sort((a, b) => b.done / (b.total || 1) - a.done / (a.total || 1))
  } else {
    rows.sort((a, b) => a.name.localeCompare(b.name))
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        rows.map((r) => ({
          id: r.project.id,
          name: r.name,
          client: r.client,
          type: r.type.id,
          deadline: r.deadline,
          deadlineLabel: r.deadlineLabel,
          stagesDone: r.done,
          stagesTotal: r.total,
          packReady: r.ready,
          openTasks: r.openTasks,
          current: r.current,
        })),
        null,
        2
      )
    )
    return 0
  }

  console.log(c.grey(`${label} · ${rows.length} project${rows.length === 1 ? '' : 's'}`))
  console.log('')
  console.log(
    table(
      ['', '#', 'project', 'client', 'type', 'stages', 'pack', 'due', 'todo'],
      rows.map((r) => [
        r.current ? c.cyan('▸') : ' ',
        c.grey(String(r.pos)),
        c.bold(r.name),
        r.client ? r.client : c.grey('—'),
        c.grey(r.type.label),
        `${r.done}/${r.total}`,
        r.ready ? tick() : gap(),
        deadlineCell(r, c),
        r.openTasks ? String(r.openTasks) : c.grey('—'),
      ])
    )
  )
  console.log('')
  /* Labelled as a key. Unlabelled, this line is styled and worded exactly like
     a status — so on a workspace whose pack is NOT ready it still read
     "✓ pack ready", which is the one thing a readiness column exists to say
     truthfully. */
  console.log(
    c.grey(`Key: ${tick()} pack ready   ${gap()} still has gaps   ▸ current project`)
  )
  console.log(c.grey('cc check --project "<name>" for what is missing'))
  return 0
}

/**
 * Overdue is stated plainly and not painted red. The app's rule: a thing
 * waiting on someone else is information, not an alarm, and red badges cost
 * this audience more than they gain.
 */
function deadlineCell(r, colour) {
  if (!r.deadline) return colour.grey('—')
  if (r.urgency === 'overdue' || r.urgency === 'today') return colour.yellow(r.deadlineLabel)
  return colour.grey(r.deadlineLabel)
}

function parseArgs(argv) {
  const opts = { workspace: null, client: null, sort: 'name', json: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') opts.help = true
    else if (a === '--client') opts.client = argv[++i]
    else if (a === '--sort' || a === '-s') {
      const v = argv[++i]
      if (!['name', 'deadline', 'progress'].includes(v)) {
        throw new UserError(`--sort takes name, deadline, or progress (got "${v}")`)
      }
      opts.sort = v
    } else if (a === '--json') opts.json = true
    else if (a.startsWith('-')) throw new UserError(`Unknown option: ${a}`)
    else if (!opts.workspace) opts.workspace = a
    else throw new UserError(`Unexpected argument: ${a}`)
  }
  return opts
}
