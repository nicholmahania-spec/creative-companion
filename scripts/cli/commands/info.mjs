/**
 * `cc info` — everything one project knows, on one screen.
 *
 * The point is the connection the product is built on: the brief informs the
 * direction, the direction informs the system, the decisions are remembered.
 * So this prints them in that order and shows the decision log rather than
 * burying it — reading this should answer "why did I choose this?" without
 * opening the app.
 */

import { load, MOD } from '../runtime.mjs'
import { readWorkspace, resolveProject, scopeTo, progressStateFor } from '../workspace.mjs'
import { c, heading, table, swatch, wrapText, orMissing, tick, gap, bar } from '../ui.mjs'
import { UserError } from '../errors.mjs'

export const help = `
${c.bold('cc info')} — one project in full

  cc info [workspace] --project <x>
  cc info harbor -p "Harbor"

Options
  --project <x>      project by name, id, or position (#2). Default: current
  --section <list>   brief, direction, system, work, client, decisions
  --json             the full project record as JSON
`

const SECTIONS = ['brief', 'direction', 'system', 'work', 'client', 'decisions']

export async function run(argv) {
  const opts = parseArgs(argv)
  if (opts.help) {
    console.log(help)
    return 0
  }

  const { workspace, label } = readWorkspace(opts.workspace)
  const project = resolveProject(workspace, opts.project)
  const { tasks, moodItems } = scopeTo(workspace, project)

  if (opts.json) {
    console.log(JSON.stringify({ project, tasks, moodItems }, null, 2))
    return 0
  }

  const [exportFiles, brandSystem, projectTypes, journeyProgress, detectiveBrief, dates, revisions, touchpoints, decisionLog] =
    await Promise.all([
      load(MOD.exportFiles),
      load(MOD.brandSystem),
      load(MOD.projectTypes),
      load(MOD.journeyProgress),
      load(MOD.detectiveBrief),
      load(MOD.dates),
      load(MOD.revisions),
      load(MOD.touchpoints),
      load(MOD.decisionLog),
    ])

  const pack = exportFiles.buildBrandPackSnapshot({ project, tasks, moodItems })
  const type = projectTypes.projectType(project.projectType)
  const show = (s) => opts.sections.includes(s)

  console.log(c.grey(label))
  console.log(heading(pack.projectName))
  console.log(
    `  ${c.grey(type.label)} · ${c.grey(type.plain)}`
  )
  if (project.deadline) {
    console.log(`  ${c.grey(dates.relativeDeadlineLabel(project.deadline))} ${c.grey(`(${project.deadline})`)}`)
  }
  if (pack.tagline) console.log(`\n  ${c.bold(`“${pack.tagline}”`)}`)

  // ── Brief ────────────────────────────────────────────────────────────
  if (show('brief')) {
    const d = project.detective || {}
    const progress = detectiveBrief.getDetectiveProgress(d)
    console.log(heading('Brief'))
    console.log(
      `  ${bar(progress.filledCount, progress.fieldTotal)} ${c.grey(`${progress.filledCount}/${progress.fieldTotal} answered`)}`
    )
    const lines = [
      ['Client', d.clientName],
      ['Goal', d.goal],
      ['Audience', d.audience],
      ['Story', d.story],
      ['What makes it different', d.usp],
      ['Positioning', project.positioning],
    ]
    for (const [k, v] of lines) {
      if (!String(v || '').trim()) continue
      console.log(`\n  ${c.grey(k)}`)
      console.log(wrapText(v, '    '))
    }
    if (pack.brief && !String(d.goal || '').trim()) {
      console.log(`\n  ${c.grey('Brief')}`)
      console.log(wrapText(pack.brief, '    '))
    }
    const picked = Array.isArray(d.deliverablesPicked) ? d.deliverablesPicked : []
    if (picked.length) {
      const labels = detectiveBrief.DELIVERABLE_OPTIONS.filter((o) => picked.includes(o.id)).map(
        (o) => o.label
      )
      console.log(`\n  ${c.grey('Deliverables')}  ${labels.join(' · ') || picked.join(' · ')}`)
    }
  }

  // ── Direction ────────────────────────────────────────────────────────
  if (show('direction')) {
    console.log(heading('Direction'))
    const dirs = pack.directions || []
    if (!dirs.length) {
      console.log(`  ${gap()} ${c.grey('no directions written yet')}`)
    } else {
      for (const dir of dirs) {
        const mark = dir.chosen ? c.green('●') : c.grey('○')
        const chosen = dir.chosen ? ` ${c.grey('— chosen')}` : ''
        console.log(`\n  ${mark} ${c.bold(dir.title || dir.label)}${chosen}`)
        if (dir.note) console.log(wrapText(dir.note, '      '))
      }
    }
    const starred = (moodItems || []).filter((m) => m.inPack).length
    console.log(
      `\n  ${c.grey('Board')}  ${moodItems.length} pin${moodItems.length === 1 ? '' : 's'}, ` +
        `${starred} starred for the pack`
    )
  }

  // ── System ───────────────────────────────────────────────────────────
  if (show('system')) {
    console.log(heading('Brand system'))
    const sys = brandSystem.buildColorSystem(pack.palette, pack.colorRoles)
    if (sys.roleRows.length) {
      console.log(
        table(
          [],
          sys.roleRows.map((r) => [
            `  ${swatch(r.hex)}`,
            c.bold(r.label),
            c.grey(r.hex),
            c.grey(r.job || ''),
          ])
        )
      )
    }
    console.log(
      `\n  ${c.grey('Palette')}  ${sys.colors.map((h) => `${swatch(h)} ${c.grey(h)}`).join('  ')}`
    )
    const field = (k, v) => [`  ${c.grey(k)}`, v]
    console.log('')
    console.log(
      table(
        [],
        [
          field('Heading', orMissing(pack.typeHeading)),
          field('Body', orMissing(pack.typeBody)),
          field('Voice', orMissing(pack.voice)),
          field('Promise', orMissing(pack.messagingPromise)),
          field('Proof', orMissing(pack.messagingProof)),
          field('Mark', pack.logoImage ? `${tick()} uploaded` : c.grey('none uploaded')),
          ...(pack.logoWordmark ? [field('Wordmark', pack.logoWordmark)] : []),
          ...(pack.logoMinSize ? [field('Min size', pack.logoMinSize)] : []),
        ]
      )
    )
    if (pack.typeWhy) {
      console.log(`\n  ${c.grey('Why this pairing')}`)
      console.log(wrapText(pack.typeWhy, '    '))
    }
    /* Clearspace is a sentence, not a value — wrapped rather than jammed into a
       column where it would run off the right edge. */
    if (pack.logoClearspace) {
      console.log(`\n  ${c.grey('Clearspace')}`)
      console.log(wrapText(pack.logoClearspace, '    '))
    }

    /* Gated on the RESULT, not on `brandSurfaces`. `touchpointsFor` also reads
       the deliverables the client ordered — someone can buy business cards
       without ticking "Print" as a place the brand lives — so keying off
       surfaces alone hid the whole section for every project that answered one
       question and not the other. */
    const list = touchpoints.touchpointsFor(
      pack.brandSurfaces || [],
      project.detective?.deliverablesPicked || []
    )
    if (list.length) {
      console.log(`\n  ${c.grey('Touchpoints')}`)
      for (const id of list) {
        const entry = project.touchpointApps?.[id]
        const state = entry?.done ? tick() : gap()
        const note = entry?.note ? c.grey(` — ${entry.note}`) : ''
        console.log(`    ${state} ${touchpoints.touchpointLabel(id)}${note}`)
      }
    }
  }

  // ── Work ─────────────────────────────────────────────────────────────
  if (show('work')) {
    console.log(heading('Work'))
    const steps = projectTypes.stepsForProject(project)
    const ctx = journeyProgress.buildPathProgressCtx(progressStateFor(workspace, project))
    const stages = journeyProgress.pathProgressSummary(steps, ctx)
    console.log(
      table(
        [],
        stages.map((s) => [`  ${s.done ? tick() : gap()}`, c.grey(s.num), s.done ? s.label : c.yellow(s.label)])
      )
    )
    const open = tasks.filter((t) => !t.completed)
    console.log(
      `\n  ${c.grey('Tasks')}  ${tasks.length - open.length}/${tasks.length} done`
    )
    for (const t of open.slice(0, 8)) {
      console.log(`    ${gap()} ${t.title}${t.dueDate ? c.grey(` · ${dates.relativeDeadlineLabel(t.dueDate)}`) : ''}`)
    }
    if (open.length > 8) console.log(c.grey(`    …and ${open.length - 8} more`))

    const rev = revisions.revisionSummary(project.revisionRounds, project.scopeRevisionsIncluded)
    console.log(
      `\n  ${c.grey('Revisions')}  round ${rev.number} of ${rev.included} included` +
        (rev.isBeyond ? c.yellow(' — beyond what was agreed') : '') +
        (rev.open ? c.grey(' · one round open') : '')
    )
  }

  // ── Client ───────────────────────────────────────────────────────────
  if (show('client')) {
    const d = project.detective || {}
    console.log(heading('Client'))
    console.log(
      table(
        [],
        [
          [`  ${c.grey('Name')}`, orMissing(d.clientName)],
          [`  ${c.grey('Email')}`, orMissing(d.clientEmail)],
          [`  ${c.grey('Phone')}`, orMissing(d.clientPhone)],
          [`  ${c.grey('Approver')}`, orMissing(project.scopeApprover)],
          [`  ${c.grey('Out of scope')}`, orMissing(project.scopeOutOf, 'nothing recorded')],
        ]
      )
    )
    const fb = (project.feedbackLog || []).filter((f) => f.status !== 'done')
    if (fb.length) {
      console.log(`\n  ${c.grey('Open feedback')}`)
      for (const f of fb.slice(0, 6)) {
        console.log(`    ${gap()} ${f.issue || '(no note)'}${f.reviewer ? c.grey(` — ${f.reviewer}`) : ''}`)
      }
    }
    console.log(`\n  ${c.grey('Note for the client')}`)
    console.log(project.handoffNote ? wrapText(project.handoffNote, '    ') : `    ${c.grey('not written yet')}`)
  }

  // ── Decisions ────────────────────────────────────────────────────────
  if (show('decisions')) {
    console.log(heading('Decisions'))
    const log = pack.decisionLog || []
    if (!log.length) {
      console.log(`  ${gap()} ${c.grey('nothing recorded yet')}`)
    } else {
      /* `formatDecisionLine` rather than a local reading of the fields — the
         entry shape is {label, title, why, at:epochMs}, and guessing at it
         printed the raw timestamp as if it were a date. */
      for (const entry of log.slice(0, 20)) {
        const line = decisionLog.formatDecisionLine(entry)
        if (!line) continue
        const when = Number(entry.at)
          ? c.grey(dates.toISODate(new Date(Number(entry.at))))
          : ''
        console.log(`\n  ${c.grey('·')} ${when}`)
        console.log(wrapText(line, '    '))
      }
      if (log.length > 20) console.log(c.grey(`\n  …and ${log.length - 20} more`))
    }
    if (project.learnings) {
      console.log(`\n  ${c.grey('Learnings')}`)
      console.log(wrapText(project.learnings, '    '))
    }
  }

  console.log('')
  return 0
}

function parseArgs(argv) {
  const opts = { workspace: null, project: null, sections: [...SECTIONS], json: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') opts.help = true
    else if (a === '--project' || a === '-p') opts.project = argv[++i]
    else if (a === '--section' || a === '--sections') {
      const list = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean)
      const unknown = list.filter((s) => !SECTIONS.includes(s))
      if (unknown.length) {
        throw new UserError(
          `Unknown section${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}\n` +
            `Choose from: ${SECTIONS.join(', ')}`
        )
      }
      opts.sections = list
    } else if (a === '--json') opts.json = true
    else if (a.startsWith('-')) throw new UserError(`Unknown option: ${a}`)
    else if (!opts.workspace) opts.workspace = a
    else throw new UserError(`Unexpected argument: ${a}`)
  }
  return opts
}
