/**
 * Design buddy — scripted UI/UX & graphic design coach (not a live LLM).
 * Persona: Helper (see helperPersona.js). Process: Define → Deliver.
 * Also: body care, time blindness, hyperfocus (so you can keep designing).
 */

import { getProcessPhase } from './processGuide'

export {
  DESIGN_SYSTEM_PROMPT,
  HELPER_SYSTEM_PROMPT,
  PROCESS_SPINE,
} from './helperPersona'

const WELLNESS_KEY = 'cc-buddy-wellness-v1'
const SESSION_KEY = 'cc-buddy-session-v1'

const MS = {
  water: 45 * 60 * 1000,
  food: 3 * 60 * 60 * 1000,
  bathroom: 90 * 60 * 1000,
  /** Soft time-blindness pings while desk is open */
  timePing: 12 * 60 * 1000,
  /** Hyperfocus soft break after continuous work */
  hyperfocusSoft: 25 * 60 * 1000,
  hyperfocusStrong: 50 * 60 * 1000,
  hyperfocusHard: 75 * 60 * 1000,
}

export function loadWellness() {
  try {
    const raw = localStorage.getItem(WELLNESS_KEY)
    if (!raw) return { water: 0, food: 0, bathroom: 0, lastBreak: 0 }
    const p = JSON.parse(raw)
    return {
      water: Number(p.water) || 0,
      food: Number(p.food) || 0,
      bathroom: Number(p.bathroom) || 0,
      lastBreak: Number(p.lastBreak) || 0,
    }
  } catch {
    return { water: 0, food: 0, bathroom: 0, lastBreak: 0 }
  }
}

export function saveWellness(state) {
  try {
    localStorage.setItem(WELLNESS_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function markWellness(kind) {
  const base = loadWellness()
  const next = { ...base, [kind]: Date.now() }
  if (kind === 'bathroom' || kind === 'break') {
    next.lastBreak = Date.now()
  }
  if (kind === 'break') {
    /* dedicated break marker only */
  }
  saveWellness(next)
  return next
}

export function markBreak() {
  return markWellness('break')
}

export function overdueKinds(wellness = loadWellness(), now = Date.now()) {
  const out = []
  if (!wellness.water || now - wellness.water > MS.water) out.push('water')
  if (!wellness.food || now - wellness.food > MS.food) out.push('food')
  if (!wellness.bathroom || now - wellness.bathroom > MS.bathroom)
    out.push('bathroom')
  return out
}

/** Minutes since last intentional break (or session start) */
export function minutesSinceBreak(wellness = loadWellness(), sessionStart, now = Date.now()) {
  const anchor = Math.max(
    Number(wellness.lastBreak) || 0,
    Number(sessionStart) || 0
  )
  if (!anchor) return 0
  return Math.floor((now - anchor) / 60000)
}

export function hyperfocusLevel(minutesWorking) {
  if (minutesWorking >= 75) return 'hard'
  if (minutesWorking >= 50) return 'strong'
  if (minutesWorking >= 25) return 'soft'
  return null
}

export function loadSessionStart() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      const t = Date.now()
      localStorage.setItem(SESSION_KEY, String(t))
      return t
    }
    return Number(raw) || Date.now()
  } catch {
    return Date.now()
  }
}

export function resetSessionStart() {
  const t = Date.now()
  try {
    localStorage.setItem(SESSION_KEY, String(t))
  } catch {
    /* ignore */
  }
  return t
}

export function formatDuration(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m} min`
  return `${h}h ${m}m`
}

export function formatClock(date = new Date()) {
  try {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function minutesAtDesk(sessionStart, now = Date.now()) {
  if (!sessionStart) return 0
  return Math.floor((now - sessionStart) / 60000)
}

const GREETINGS = [
  'Helper ready. Coach, Critique, or Break when you need it.',
  'One step at a time. Open me for Coach or Critique.',
  'Here for your path step, breaks, and clear choices.',
]

const WATER = [
  'Water first. Then one design decision.',
  'Sip something. Then color or type — not both.',
  'Three sips count. Back to the step.',
]

const FOOD = [
  'Food check. Snack, then continue the step.',
  'Coffee isn’t a meal. Eat something, then type.',
  'Empty stomach muddies palette calls. Eat, then decide.',
]

const BATHROOM = [
  'Stand and walk. The desk will wait.',
  'Take a short break. Fresh eyes beat another 1px nudge.',
  'Step away briefly, then return to one call.',
]

const PROGRESS_STEP = [
  'Step done. Next gap when you’re ready.',
  'Checked off. One more small step if you want.',
  'Step complete. Keep the path moving.',
]

const PROGRESS_TIMER = [
  'Timer on. One job only.',
  'Focus block started. Stay on this step.',
  'Timer running. One clear decision.',
]

const STUCK = [
  'Stuck? Name the user in one sentence, then shrink the step.',
  'Write the job in one short line, then one tiny action.',
  'Clarify who it’s for, then one ugly first pass.',
]

const IDLE = [
  'Still here. Path step, Coach, or water.',
  'One next move: type, layout, or copy.',
  'Ready when you are — step, Coach, or break.',
]

const PRAISE = [
  'Showing up counts. Keep the step small.',
  'Messy first pass is correct. Polish later.',
  'One protected step beats busy chaos.',
]

const TIME_BLIND = [
  (clock, desk) => `It's ${clock}. Desk ~${desk}. One step, then water.`,
  (clock, desk) => `${clock} · ~${desk} at desk. Still on one thing?`,
  (clock, desk) => `Clock: ${clock}. You've been here ~${desk}.`,
]

const HYPER_SOFT = [
  (mins) => `${mins} min in. Look away for one breath, then one decision.`,
  (mins) => `${mins} min without a break. Stretch, then continue.`,
  (mins) => `~${mins} min deep. Stand or water, then back.`,
]

const HYPER_STRONG = [
  (mins) => `~${mins} min planted. Water + short step away.`,
  (mins) => `${mins} min straight. Three minutes off is fine.`,
  (mins) => `~${mins} min. Break soon so the next call stays clear.`,
]

const HYPER_HARD = [
  (mins) => `~${mins} min continuous. Stand. Water. Fresh eyes.`,
  (mins) => `${mins} min — break is quality control, not quitting.`,
  (mins) => `~${mins} min in. Rest before the next polish pass.`,
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function greetingLine() {
  return pick(GREETINGS)
}

export function wellnessLine(kind) {
  if (kind === 'water') return pick(WATER)
  if (kind === 'food') return pick(FOOD)
  if (kind === 'bathroom') return pick(BATHROOM)
  return pick(IDLE)
}

export function progressLine(event) {
  if (event === 'step') return pick(PROGRESS_STEP)
  if (event === 'timer') return pick(PROGRESS_TIMER)
  if (event === 'stuck') return pick(STUCK)
  return pick(PRAISE)
}

export function idleLine() {
  return pick(IDLE)
}

const VIEW_LABELS = {
  flow: 'Sketch',
  studio: 'Research',
  project: 'Define',
  brand: 'Design',
  finish: 'Deliver',
  spark: 'Ideate',
  review: 'Review',
  insights: 'the focus timer',
  calendar: 'Deadlines',
  settings: 'Settings',
}

function short(title, n = 48) {
  const t = String(title || '').trim()
  if (!t) return ''
  return t.length > n ? `${t.slice(0, n)}…` : t
}

/**
 * Infer craft domain from task title + current view.
 * Used so recommendations/critique fit the actual job.
 */
export function classifyTask(activity = {}) {
  const text = `${activity.nextTaskTitle || ''} ${activity.projectName || ''} ${
    activity.view || ''
  }`.toLowerCase()
  const view = activity.view || 'flow'

  const rules = [
    {
      id: 'logo',
      re: /logo|wordmark|mark|monogram|icon system|favicon|brand mark/,
    },
    {
      id: 'color',
      re: /color|palette|swatch|contrast|hex|hue|tint|brand color/,
    },
    {
      id: 'type',
      re: /type|typo|font|lettering|typeset|headline|serif|sans/,
    },
    {
      id: 'layout',
      re: /layout|wire|grid|composition|spacing|hierarchy|mock|screen|ui|ux|interface|page|nav|menu|dashboard/,
    },
    {
      id: 'copy',
      re: /copy|tagline|headline|voice|tone|messaging|words|writing|content|microcopy|cta text/,
    },
    {
      id: 'research',
      re: /research|audit|competitor|interview|ref|mood|inspiration|discover|explore/,
    },
    {
      id: 'export',
      re: /export|print|pdf|pack|deliver|handoff|ship|share|client review/,
    },
    {
      id: 'illustration',
      re: /illustrat|draw|icon|graphic|poster|cover|artwork|visual system/,
    },
    {
      id: 'photo',
      re: /photo|image|crop|retouch|asset|stock/,
    },
    {
      id: 'motion',
      re: /motion|animat|prototype|interaction|micro-interaction|hover|transition/,
    },
    {
      id: 'breakdown',
      re: /break|micro-step|overwhelm|plan|scope|steps/,
    },
  ]

  for (const r of rules) {
    if (r.re.test(text)) return r.id
  }

  // View fallbacks when title is vague
  if (view === 'studio') return 'research'
  if (view === 'brand') return 'copy'
  if (view === 'spark') return 'research'
  if (view === 'insights') return 'layout'
  if (view === 'calendar') return 'export'
  if (view === 'project') return 'breakdown'
  return 'general'
}

const DOMAIN_LABEL = {
  logo: 'logo / mark',
  color: 'color system',
  type: 'typography',
  layout: 'UI layout / hierarchy',
  copy: 'verbal identity / UX writing',
  research: 'research & reference',
  export: 'delivery / export',
  illustration: 'illustration / graphics',
  photo: 'imagery',
  motion: 'motion / interaction',
  breakdown: 'scope & planning',
  general: 'design craft',
}

/**
 * Task-appropriate recommendations (what to do next).
 */
export function recommendForTask(activity = {}) {
  const domain = classifyTask(activity)
  const step = short(activity.nextTaskTitle, 56)
  const project = short(activity.projectName, 28) || 'this project'
  const pins = Number(activity.pinsCount) || 0
  const view = activity.view || 'flow'
  const energy = activity.nextTaskEnergy || 'med'
  const isMicro = !!activity.isMicroStep
  const label = DOMAIN_LABEL[domain] || DOMAIN_LABEL.general

  const head = step
    ? `Recommendation for "${step}" (${label}):`
    : `Recommendation for ${project} · ${label}:`

  const byDomain = {
    logo: [
      'Sketch 6–9 thumbnails in 10 minutes before any digital polish — quantity first.',
      'Lock a single metaphor (e.g. shelter, growth, invitation) and reject marks that do not serve it.',
      'Test the mark at 24px and one-color; if it dies, simplify geometry.',
      'Why: logos fail from premature detail, not from too few roughs.',
    ],
    color: [
      'Assign roles, not pretty swatches: background, body text, primary action, quiet border, optional highlight.',
      'Check body text on the main background for WCAG AA (~4.5:1). Fix contrast before adding accents.',
      'Use one accent for CTAs only — if everything is accent, nothing is hierarchy.',
      'Why: systems beat palettes that only look good in a grid.',
    ],
    type: [
      'Pair one display/heading face with one highly legible UI/body face — stop at two families.',
      'Define a type ramp: H1 / H2 / body / caption / button with consistent scale (e.g. 1.25).',
      'Set line-length ~45–75 characters for body; avoid decorative fonts for long UI copy.',
      'Why: type hierarchy is navigation for the eye.',
    ],
    layout: [
      'Text-wireframe the screen top-to-bottom before pixels: header, primary content, proof, single CTA.',
      'One primary action per view. Secondary actions are ghost/text — never twin primaries.',
      'Use an 8pt spacing rhythm; align to a simple column grid. Cut any element that does not support the user job.',
      'Why: layout is strategy expressed as space.',
    ],
    copy: [
      'Write the CTA and empty-state first — they expose whether the product job is clear.',
      'One idea per sentence. Voice: say what the user gains, not what the brand is.',
      'Put the tagline through a "would a stranger understand in 3 seconds?" test.',
      'Why: unclear words make polished UI feel broken.',
    ],
    research: [
      pins < 3
        ? 'Pin 3–5 refs max, each with a one-line note: mood, layout idea, or color role — not "nice."'
        : 'You have enough pins. Cluster them into 2 mood directions and discard outliers.',
      'Name the pattern you are stealing ethically (grid, crop, tone) so the board becomes rules.',
      'Return to Sketch with one decision written as a step.',
      'Why: uncaptioned boards become aesthetic scrolling.',
    ],
    export: [
      'Export only when identity answers: who, tone, palette roles, type pair, do/don’t.',
      'Prefer a short pack a client can skim over a complete but confusing dump.',
      'Check contrast and hex list on the export sheet before sending.',
      'Why: delivery is a UX problem for the stakeholder.',
    ],
    illustration: [
      'Define the job of the graphic: explain, delight, or brand signal — pick one.',
      'Limit the illustration to the brand palette; avoid a second secret rainbow.',
      'Leave safe margin and a clear focal point; complexity should serve storytelling.',
      'Why: illustration without a job becomes decoration tax.',
    ],
    photo: [
      'Crop for subject and breath; avoid center-everything by default.',
      'Match color grade loosely to brand neutrals so photos do not fight the UI.',
      'Add alt/caption intent even for internal comps — it forces clarity of subject.',
      'Why: imagery is content hierarchy, not wallpaper.',
    ],
    motion: [
      'Motion should clarify state change (enter, success, error) — not entertain.',
      'Keep durations short (150–300ms UI); ease-out for exits of attention.',
      'Respect reduced-motion: essential feedback must work without animation.',
      'Why: gratuitous motion harms accessibility and trust.',
    ],
    breakdown: [
      'Split by user-visible outcomes, not tool actions ("choose type pair" not "open Figma").',
      'Order steps so each unlocks the next; put research before polish.',
      'Cap the list — better 8 honest steps than 20 vague ones.',
      'Why: bad breakdowns recreate overwhelm with extra checkboxes.',
    ],
    general: [
      'Name the user job in one sentence, then do the smallest finishable slice.',
      'Prefer hierarchy (type, space, contrast) over new decoration.',
      'If stuck between options, write two directions in one line each and pick one for 25 minutes.',
      'Why: criteria beat vibes when energy is limited.',
    ],
  }

  const lines = byDomain[domain] || byDomain.general
  const energyNote =
    energy === 'low'
      ? ' Energy note: keep this pass low-cognition (lists, contrast check, renames).'
      : energy === 'high'
        ? ' Energy note: good window for exploration or hard composition.'
        : ''
  const microNote = isMicro
    ? ' This is already a micro-step — finish it ugly if needed, then close it.'
    : ''
  const viewNote =
    view === 'studio' && domain !== 'research'
      ? ' You are on the board — only gather what serves this task, then leave.'
      : view === 'brand' && domain === 'general'
        ? ' On Brand: fill the next empty system field with intent, not completeness anxiety.'
        : ''

  return `${head} ${lines.join(' ')}${energyNote}${microNote}${viewNote}`
}

/**
 * Task-appropriate critique (risks / what usually goes wrong).
 */
export function critiqueForTask(activity = {}) {
  const domain = classifyTask(activity)
  const step = short(activity.nextTaskTitle, 56)
  const project = short(activity.projectName, 28) || 'this project'
  const pins = Number(activity.pinsCount) || 0
  const queue = Number(activity.queueCount) || 0
  const label = DOMAIN_LABEL[domain] || DOMAIN_LABEL.general

  const head = step
    ? `Critique lens on "${step}" (${label}):`
    : `Critique lens for ${project} (${label}):`

  const byDomain = {
    logo: [
      'Watch for: trends over meaning, gradients that die in one-color print, detail that vanishes small.',
      'Ask: would this still read as the same idea if it were a rubber stamp?',
      'If you are polishing paths before 6 rough directions exist, you are refining too early.',
    ],
    color: [
      'Watch for: accent everywhere, low-contrast body text, palette as decoration not roles.',
      'Ask: which color is the only "action" color? If you cannot answer, hierarchy is muddy.',
      'Brand-builder tip: fix text-on-bg pairs before adding a sixth swatch.',
    ],
    type: [
      'Watch for: too many weights, display fonts in UI chrome, uneven scale jumps.',
      'Ask: can a user scan H1 → body → CTA without hunting?',
      'If everything is bold, nothing is emphasis — that is a hierarchy failure, not a style.',
    ],
    layout: [
      'Watch for: twin primary buttons, equal card weight, decorative lines instead of structure.',
      'Ask: what is the single focal point and primary action on this view?',
      'If you are styling shadows before the wireframe is solid, reverse the order.',
    ],
    copy: [
      'Watch for: brand poetry with no user verb, passive voice, three ideas in one line.',
      'Ask: what should the person do or feel after reading this once?',
      'Taglines that need a paragraph of explanation are not ready.',
    ],
    research: [
      pins > 8
        ? 'Risk: board bloat. Too many pins without captions freezes decisions.'
        : 'Watch for: collecting without criteria — mood boards that never constrain choices.',
      'Ask: which two pins disagree? That tension is a direction choice, not a failure.',
      'If you have not written a decision step on Sketch, research is incomplete.',
    ],
    export: [
      'Watch for: shipping incomplete contrast, missing hex list, empty do/don’t.',
      'Ask: can a stranger apply this brand tomorrow without a call?',
      'Pretty export of unclear decisions still fails the stakeholder.',
    ],
    illustration: [
      'Watch for: style drift from brand palette, cluttered focal point, illustration fighting type.',
      'Ask: if we removed the graphic, would the message still land? If yes, it may be optional.',
    ],
    photo: [
      'Watch for: mixed color grades, faces cut by UI, images as pure wallpaper.',
      'Ask: does the crop support the story or only fill a rectangle?',
    ],
    motion: [
      'Watch for: motion without meaning, long durations, ignoring reduced-motion.',
      'Ask: what state change does this animation explain?',
    ],
    breakdown: [
      'Watch for: steps that are tools ("open Figma") instead of outcomes ("choose type pair").',
      'Ask: does each step unlock the next for a user or stakeholder?',
      queue > 8
        ? 'Queue is heavy — critique the list length, not your discipline.'
        : 'Prefer fewer sharper steps over a novel of tasks.',
    ],
    general: [
      'Watch for: decorating before defining the user job; twin priorities; endless polish.',
      'Ask: what would make this "done enough" for a first share?',
      'If the step title is vague, the craft will scatter — rewrite the step as an outcome.',
    ],
  }

  const lines = byDomain[domain] || byDomain.general
  return `${head} ${lines.filter(Boolean).join(' ')} Why this matters: critique protects quality without expanding scope.`
}

/**
 * Combined coach response: recommend + critique for current task.
 */
export function coachOnTask(activity = {}) {
  return `${recommendForTask(activity)} — ${critiqueForTask(activity)}`
}

/**
 * Snapshot of what the person is doing (from the app).
 */
export function describeActivity(activity = {}) {
  const view = activity.view || 'flow'
  const place = VIEW_LABELS[view] || 'the app'
  const step = short(activity.nextTaskTitle, 40)
  const project = short(activity.projectName, 24)
  const domain = classifyTask(activity)
  const domainLabel = DOMAIN_LABEL[domain]
  if (step && view === 'flow') {
    return `Caught you on Sketch (${project || 'mystery project'}) wrestling "${step}" — that's ${domainLabel} energy.`
  }
  if (step) {
    return `You're on ${place} with "${step}" still open. Domain: ${domainLabel}. Spicy.`
  }
  return `You're on ${place}${project ? ` for ${project}` : ''}. Domain vibe: ${domainLabel}.`
}

/**
 * 7-step design process coaching (scripted).
 * Prefers processGuide.prompt when present — single coaching source.
 * Legacy aliases: clarify→define, structure→sketch, visual→design, refine→review
 */
export function designProcessTip(phase, activity = {}) {
  const step = short(activity.nextTaskTitle, 42) || 'your current step'
  const project = short(activity.projectName, 24) || 'this project'
  const view = activity.view || 'flow'
  const p =
    phase === 'clarify'
      ? 'define'
      : phase === 'structure'
        ? 'sketch'
        : phase === 'visual'
          ? 'design'
          : phase === 'refine'
            ? 'review'
            : phase

  const guide = getProcessPhase(p)
  if (guide?.prompt) {
    // Contextualize guide prompt with current step/project
    if (p === 'ideate') {
      return `Ideate “${step}”: ${guide.prompt}`
    }
    if (p === 'define') {
      return `Define “${step}” on ${project}: ${guide.prompt}`
    }
    if (p === 'research') {
      return `Research for ${project}: ${guide.prompt}`
    }
    if (p === 'sketch') {
      return view === 'brand'
        ? `Sketch/draft next hole only on Design (message → palette → type). Low detail.`
        : `Sketch “${step}”: ${guide.prompt}`
    }
    if (p === 'design') {
      return `Design “${step}”: ${guide.prompt}`
    }
    if (p === 'review') {
      return `Review “${step}”: ${guide.prompt}`
    }
    if (p === 'deliver') {
      return `Deliver ${project}: ${guide.prompt}`
    }
  }

  return activityTip(activity)
}

/**
 * Contextual design tip from current screen + step + queue.
 * Professional, constructive; explains why.
 */
export function activityTip(activity = {}) {
  const view = activity.view || 'flow'
  const step = short(activity.nextTaskTitle, 48)
  const energy = activity.nextTaskEnergy || 'med'
  const queue = Number(activity.queueCount) || 0
  const done = Number(activity.doneCount) || 0
  const pins = Number(activity.pinsCount) || 0
  const project = short(activity.projectName, 28) || 'this project'
  const hasDeadline = !!activity.projectDeadline
  const dueSoon = activity.stepDueSoon
  const isMicro = !!activity.isMicroStep
  const focusOn = !!activity.isFocusRunning

  if (focusOn) {
    return step
      ? `Timer on: only “${step}”.`
      : 'Timer on: one atomic design action.'
  }

  if (view === 'studio') {
    return step
      ? `Research for “${step}”: keep pins that constrain. Drop the rest.`
      : pins > 0
        ? `Curate ${project} refs, then back to Sketch with one decision.`
        : 'Pin 2–3 refs with a one-line why. Then Sketch.'
  }

  if (view === 'brand') {
    return `Design for ${project}: finish one layer (tagline or palette). Consistent incomplete > conflicting complete.`
  }

  if (view === 'spark') {
    return step
      ? `If this spark helps “${step}”, pin it or fill A/B/C. Else skip.`
      : 'One spark → pin or A/B/C → then Sketch.'
  }

  if (view === 'review') {
    return 'Show the leave-behind. Ask specific questions. Capture notes — then Deliver.'
  }

  if (view === 'finish') {
    return 'Brand book PDF or print. Hand off. Note what you learned.'
  }

  if (view === 'insights') {
    return step
      ? `Timer is a container for “${step}”. 25 for layout, 2 for a decision.`
      : 'Set a Sketch step first, then start a timer.'
  }

  if (view === 'calendar') {
    return hasDeadline
      ? `Deadline on ${project}: work backward into Sketch steps.`
      : 'Set a deadline or a personal review date, then Sketch.'
  }

  if (view === 'project') {
    return 'Detective sheet first: goal + audience. Then Research.'
  }

  if (view === 'settings') {
    return 'Backup if it matters. Then return to Sketch or Design.'
  }

  if (view === 'flow' || !view) {
    if (!step) {
      return done > 0
        ? 'Queue empty — nice. Capture the next finishable step, or micro-steps if scope is still a blob.'
        : `No step on ${project}. One sentence outcome, then capture it.`
    }
    if (dueSoon) {
      return `“${step}” is time-sensitive. Ship the minimum: one decision or one block.`
    }
    if (isMicro) {
      return `Micro-step “${step}” — finish messy, mark complete.`
    }
    if (energy === 'low') {
      return `Low energy on “${step}”: labels, contrast, spacing — or Split ×3.`
    }
    if (queue >= 5) {
      return `${queue} waiting. Tunnel vision on “${step}” only.`
    }
    return `On “${step}”: fuzzy → Define it · messy options → Ideate · one draft → Sketch · polish → Design. One lane only.`
  }

  return pick(IDLE)
}

/** Idle check-in with design context */
export function idleLineWithActivity(activity = {}) {
  if (Math.random() < 0.55) return activityTip(activity)
  const place = VIEW_LABELS[activity.view] || 'your desk'
  return pick([
    `Still lurking on ${place}. Coach, Critique, a break — or a roast of your twin CTAs?`,
    `Check-in: ${place}. Hierarchy still behaving, or is it a buffet of equal importance again?`,
    activity.nextTaskTitle
      ? `"${short(activity.nextTaskTitle, 36)}" is still waiting. It won't do itself. (I checked.)`
      : `On ${place} with no open step. Dramatic. Capture one job or admit you're vibing.`,
  ])
}

/** Two design directions (refinement step) for current context */
export function twoDirectionsTip(activity = {}) {
  const view = activity.view || 'flow'
  const project = short(activity.projectName, 24) || 'the product'
  if (view === 'brand' || view === 'studio') {
    return `Two directions for ${project}: A) Quiet editorial — more whitespace, restrained accent, serif-or-display for titles only. B) Product-forward — stronger primary CTA, denser UI, accent reserved for actions. Pick A or B for this phase; do not blend. Why: mixed directions kill brand coherence.`
  }
  if (view === 'flow') {
    return `Two ways to attack the current step: A) Outcome-first — define success copy, then UI. B) Structure-first — text wireframe blocks, then words. Choose one for the next 25 minutes. Why: dual approaches in parallel create thrash.`
  }
  return `Two directions: A) Simplify — remove one visual layer, strengthen hierarchy. B) Clarify — rewrite the primary label/CTA before any styling. Ship one. Why: refinement needs a criterion.`
}

export function timeBlindLine(sessionStart, now = Date.now()) {
  const clock = formatClock(new Date(now))
  const desk = formatDuration(now - sessionStart)
  return pick(TIME_BLIND)(clock, desk)
}

export function hyperfocusLine(minutesWorking) {
  const level = hyperfocusLevel(minutesWorking)
  if (level === 'hard') return pick(HYPER_HARD)(minutesWorking)
  if (level === 'strong') return pick(HYPER_STRONG)(minutesWorking)
  if (level === 'soft') return pick(HYPER_SOFT)(minutesWorking)
  return null
}

export function confirmLine(kind) {
  if (kind === 'water') return 'Water logged. One design decision next.'
  if (kind === 'food') return 'Food noted. Ready when you are.'
  if (kind === 'bathroom') return 'Welcome back. Pick one hierarchy call.'
  if (kind === 'break') return 'Break logged. Clock reset.'
  return 'Noted.'
}

export function whatTimeLine(sessionStart, now = Date.now()) {
  const clock = formatClock(new Date(now))
  const desk = formatDuration(now - sessionStart)
  const sinceBreak = minutesSinceBreak(loadWellness(), sessionStart, now)
  return `${clock} · desk ${desk} · ${sinceBreak} min since break.`
}

/** Mood for avatar face */
export function buddyMood({
  overdue,
  isFocusRunning,
  recentWin,
  hyperfocus,
}) {
  if (recentWin) return 'cheer'
  if (hyperfocus === 'hard' || hyperfocus === 'strong') return 'nudge'
  if (isFocusRunning) return 'focus'
  if (overdue?.length) return 'nudge'
  if (hyperfocus === 'soft') return 'focus'
  return 'idle'
}

/**
 * Screen spots — keep off the main work surface.
 * Panel (expanded) uses corners only so forms stay usable.
 * FAB (minimized) can also sit mid-edge (still not center).
 */
export const BUDDY_SPOTS_PANEL = [
  { id: 'br', label: 'bottom-right', bottom: '1rem', right: '1rem', top: 'auto', left: 'auto' },
  { id: 'bl', label: 'bottom-left', bottom: '1rem', left: '1rem', top: 'auto', right: 'auto' },
  { id: 'tr', label: 'top-right', top: '5.5rem', right: '1rem', bottom: 'auto', left: 'auto' },
  { id: 'tl', label: 'top-left', top: '5.5rem', left: '1rem', bottom: 'auto', right: 'auto' },
]

export const BUDDY_SPOTS_FAB = [
  ...BUDDY_SPOTS_PANEL,
  { id: 'mr', label: 'mid-right', top: '42%', right: '0.75rem', bottom: 'auto', left: 'auto' },
  { id: 'ml', label: 'mid-left', top: '42%', left: '0.75rem', bottom: 'auto', right: 'auto' },
]

/** @deprecated use BUDDY_SPOTS_PANEL / FAB */
export const BUDDY_SPOTS = BUDDY_SPOTS_FAB

/**
 * Pick a new spot, never the same as last time when possible.
 * @param {string|null} prevId
 * @param {'panel'|'fab'} mode
 */
export function pickBuddySpot(prevId = null, mode = 'fab') {
  const pool = mode === 'panel' ? BUDDY_SPOTS_PANEL : BUDDY_SPOTS_FAB
  const options =
    prevId && pool.length > 1 ? pool.filter((s) => s.id !== prevId) : pool
  return options[Math.floor(Math.random() * options.length)]
}

/** Default dock — bottom-right, away from forms */
export function defaultBuddySpot(mode = 'fab') {
  const pool = mode === 'panel' ? BUDDY_SPOTS_PANEL : BUDDY_SPOTS_FAB
  return pool.find((s) => s.id === 'br') || pool[0]
}

export function spotStyle(spot) {
  if (!spot) return undefined
  const style = {
    top: spot.top,
    right: spot.right,
    bottom: spot.bottom,
    left: spot.left,
  }
  if (spot.transform) style.transform = spot.transform
  return style
}

export { MS }
