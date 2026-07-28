/**
 * Case study export.
 *
 * The portfolio article's rule: curate three to six case studies, and ALWAYS
 * share your process. Each one answers five questions — purpose, your role,
 * how you did it, how long it took, and the outcome.
 *
 * This app already holds every one of those answers, which is the whole
 * argument for building it here rather than writing case studies from memory
 * months later:
 *
 *   purpose   ← the brief's `goal`
 *   role      ← `deliverablesPicked` — what was actually made
 *   how       ← `decisionLog` — the real "we chose B because…" record
 *   how long  ← `workLog`, the private work clock
 *   outcome   ← `learnings`, `handoffNote`, and what shipped
 *
 * Nobody else can generate the fourth one, because nobody else recorded the
 * hours while the work was happening.
 *
 * ── One deliberate omission ──────────────────────────────────────────────
 * This never publishes a total hour count. Two reasons, and both matter:
 *
 *   1. `workLog` is the PRIVATE clock. It was split from `timeLog`
 *      specifically so a measured minute could never become a claim made to
 *      another person. A case study is read by prospective clients — putting
 *      "47.5 hours" in one turns the private record into exactly that claim,
 *      and hands the reader a number to divide your fee by.
 *   2. Raw totals are the shape this app avoids everywhere else. Span and
 *      relative share say more about how work went and invite no arithmetic.
 */

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

const clean = (v) => String(v || '').trim()

/**
 * Span, working days, and where the effort actually went — as shares, never
 * as a total. Returns null when the clock never ran, because "0 weeks" in a
 * portfolio piece reads as a project that did not happen.
 */
export function durationFrom(workLog = []) {
  const rows = (Array.isArray(workLog) ? workLog : []).filter(
    (r) => r && r.date && Number(r.hours) > 0
  )
  if (!rows.length) return null

  const dates = rows.map((r) => r.date).sort()
  const first = new Date(dates[0])
  const last = new Date(dates[dates.length - 1])
  const spanMs = last.getTime() - first.getTime()
  const weeks = Math.max(1, Math.round(spanMs / MS_PER_WEEK) || 1)
  const sessions = new Set(dates).size

  const byStage = new Map()
  let total = 0
  for (const r of rows) {
    const h = Number(r.hours) || 0
    total += h
    byStage.set(r.stage || 'work', (byStage.get(r.stage || 'work') || 0) + h)
  }

  const stages = [...byStage.entries()]
    .map(([stage, h]) => ({ stage, share: total > 0 ? h / total : 0 }))
    .sort((a, b) => b.share - a.share)

  return { weeks, sessions, stages, from: dates[0], to: dates[dates.length - 1] }
}

/** "Six weeks, across 14 working days" — a span, not a bill. */
export function durationPhrase(duration) {
  if (!duration) return ''
  const w = duration.weeks === 1 ? '1 week' : `${duration.weeks} weeks`
  const s =
    duration.sessions === 1 ? '1 working day' : `${duration.sessions} working days`
  return `${w}, across ${s}`
}

/**
 * The five answers, assembled. Anything the project cannot answer comes back
 * empty and is listed in `gaps` — a case study with a blank "outcome" heading
 * is worse than one that stops early, the same omit rule the brand book
 * follows for unfilled fields.
 */
export function buildCaseStudy({ project = {}, deliverableLabels = {} } = {}) {
  const d = project.detective || {}
  const picked = Array.isArray(d.deliverablesPicked) ? d.deliverablesPicked : []

  const role = picked
    .map((id) => deliverableLabels[id] || id)
    .filter(Boolean)

  const process = (Array.isArray(project.decisionLog) ? project.decisionLog : [])
    .filter((e) => e && (clean(e.title) || clean(e.why)))
    .map((e) => ({
      label: clean(e.label),
      title: clean(e.title),
      why: clean(e.why),
    }))

  const duration = durationFrom(project.workLog)

  const cs = {
    title: clean(project.name) || 'Untitled project',
    client: clean(d.clientName),
    tagline: clean(project.tagline),
    purpose: clean(d.goal),
    audience: clean(d.audience),
    role,
    freeformRole: clean(d.deliverables),
    process,
    duration,
    outcome: clean(project.learnings),
    handoff: clean(project.handoffNote),
    scopeOutOf: clean(project.scopeOutOf),
  }

  cs.gaps = caseStudyGaps(cs)
  return cs
}

/** Which of the five the project cannot answer yet. */
export function caseStudyGaps(cs) {
  const gaps = []
  if (!cs.purpose) gaps.push({ id: 'purpose', label: 'Why the project existed' })
  if (!cs.role.length && !cs.freeformRole)
    gaps.push({ id: 'role', label: 'What you made' })
  if (!cs.process.length)
    gaps.push({ id: 'process', label: 'The decisions you made' })
  if (!cs.duration)
    gaps.push({ id: 'duration', label: 'How long it took — the clock never ran' })
  if (!cs.outcome) gaps.push({ id: 'outcome', label: 'How it turned out' })
  return gaps
}

/**
 * Rank projects for a portfolio. The article says curate three to six, and
 * the honest basis for choosing is how much of the story the project can
 * actually tell — not how recent it is.
 */
export function rankCaseStudies(projects = [], deliverableLabels = {}) {
  return (Array.isArray(projects) ? projects : [])
    .map((project) => {
      const cs = buildCaseStudy({ project, deliverableLabels })
      return { id: project?.id, title: cs.title, gaps: cs.gaps.length, cs }
    })
    .sort((a, b) => a.gaps - b.gaps || a.title.localeCompare(b.title))
}

/** The three-to-six the article asks for, best-told first. */
export function curateCaseStudies(projects = [], deliverableLabels = {}) {
  return rankCaseStudies(projects, deliverableLabels).slice(0, 6)
}

/**
 * Markdown, because a case study's destination is someone else's site or deck
 * and markdown drops into either. Every section is omitted when empty.
 */
export function caseStudyMarkdown(cs) {
  if (!cs) return ''
  const out = [`# ${cs.title}`, '']
  if (cs.client) out.push(`**Client** — ${cs.client}`, '')
  if (cs.tagline) out.push(`_${cs.tagline}_`, '')

  if (cs.purpose) {
    out.push('## Why it existed', '', cs.purpose, '')
    if (cs.audience) out.push(`**Who it is for** — ${cs.audience}`, '')
  }

  if (cs.role.length || cs.freeformRole) {
    out.push('## What I made', '')
    for (const r of cs.role) out.push(`- ${r}`)
    if (cs.freeformRole) out.push(`- ${cs.freeformRole}`)
    out.push('')
  }

  /* The section the article insists on. Clients think there is a "design
     logo" button; the decision log is the proof there is not. */
  if (cs.process.length) {
    out.push('## How I got there', '')
    for (const p of cs.process) {
      const head = [p.label, p.title].filter(Boolean).join(' · ')
      out.push(p.why ? `- **${head}** — ${p.why}` : `- **${head}**`)
    }
    out.push('')
  }

  if (cs.duration) {
    out.push('## How long it took', '', durationPhrase(cs.duration), '')
    const named = cs.duration.stages.filter((s) => s.share >= 0.1)
    if (named.length) {
      out.push('Where the time went:', '')
      for (const s of named) {
        out.push(`- ${s.stage} — ${Math.round(s.share * 100)}%`)
      }
      out.push('')
    }
  }

  if (cs.outcome) out.push('## How it turned out', '', cs.outcome, '')
  if (cs.handoff) out.push('## What was handed over', '', cs.handoff, '')

  return out.join('\n')
}
