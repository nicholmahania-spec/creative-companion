/**
 * Design buddy — scripted UI/UX & graphic design coach (not a live LLM).
 * Persona: Helper (see helperPersona.js). Process: Define → Deliver.
 * Also: body care, time blindness, hyperfocus (so you can keep designing).
 */

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
  'Coach · Critique · Stuck · Break',
  'One step. Open me if stuck.',
  'Path + breaks. Ready.',
]

const WATER = ['Water · then one decision.', 'Sip · back to the step.', '3 sips · continue.']

const FOOD = ['Eat · then decide.', 'Snack first · then type.', 'Food · then palette.']

const BATHROOM = ['Stand · walk · return.', 'Step away · fresh eyes.', 'Break · one call after.']

const PROGRESS_STEP = ['Step done.', 'Checked · next when ready.', 'Done.']

const PROGRESS_TIMER = ['Timer on · one job.', 'Focus · this step only.', 'Timer · one decision.']

const STUCK = [
  'One-line job · then tiny action.',
  'Who is it for? · ugly first pass.',
  'Shrink the step · ship minimum.',
]

const IDLE = ['Step · Coach · or water.', 'Type · layout · or copy.', 'Ready · pick one move.']

const PRAISE = ['Small step wins.', 'Messy first pass OK.', 'One step > chaos.']

const TIME_BLIND = [
  (clock, desk) => `${clock} · desk ${desk}`,
  (clock, desk) => `${clock} · ~${desk} · one thing?`,
  (clock, desk) => `Clock ${clock} · ${desk} here`,
]

const HYPER_SOFT = [
  (mins) => `${mins}m · breathe · one call`,
  (mins) => `${mins}m · stretch · continue`,
  (mins) => `~${mins}m · water · back`,
]

const HYPER_STRONG = [
  (mins) => `~${mins}m · water + stand`,
  (mins) => `${mins}m · 3 min off OK`,
  (mins) => `~${mins}m · break soon`,
]

const HYPER_HARD = [
  (mins) => `~${mins}m · stand · water`,
  (mins) => `${mins}m · break = QC`,
  (mins) => `~${mins}m · rest first`,
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
  logo: 'logo',
  color: 'color',
  type: 'type',
  layout: 'layout',
  copy: 'copy',
  research: 'research',
  export: 'export',
  illustration: 'illu',
  photo: 'photo',
  motion: 'motion',
  breakdown: 'scope',
  general: 'craft',
}

/**
 * One short next move (ADHD: single action, not essay).
 */
export function recommendForTask(activity = {}) {
  const domain = classifyTask(activity)
  const step = short(activity.nextTaskTitle, 36)
  const pins = Number(activity.pinsCount) || 0
  const energy = activity.nextTaskEnergy || 'med'
  const isMicro = !!activity.isMicroStep
  const label = DOMAIN_LABEL[domain] || DOMAIN_LABEL.general

  const byDomain = {
    logo: [
      '6–9 thumbnails · 10 min · no polish',
      'One metaphor · kill the rest',
      'Test 24px + 1-color · simplify if dead',
    ],
    color: [
      'Roles: bg · text · action · quiet',
      'AA body text on bg first',
      'One accent for CTAs only',
    ],
    type: [
      '1 heading + 1 body face max',
      'Ramp H1/H2/body/caption',
      'Body ~45–75 chars wide',
    ],
    layout: [
      'Wireframe top→bottom before pixels',
      'One primary CTA · no twins',
      '8pt rhythm · cut non-job elements',
    ],
    copy: [
      'Write CTA + empty state first',
      'One idea per line',
      '3-second stranger test',
    ],
    research: [
      pins < 3
        ? 'Pin 3–5 · one-line why each'
        : 'Cluster → 2 moods · drop outliers',
      'Name the steal (grid/crop/tone)',
      'One Sketch decision from board',
    ],
    export: [
      'Ship only if roles + type clear',
      'Short pack > confusing dump',
      'Check contrast + hex list',
    ],
    illustration: [
      'One job: explain · delight · brand',
      'Brand palette only',
      'Clear focal · safe margin',
    ],
    photo: [
      'Crop for subject + breath',
      'Grade toward brand neutrals',
      'Subject must carry the story',
    ],
    motion: [
      'Clarify state only · not entertain',
      '150–300ms · ease-out',
      'Works without motion too',
    ],
    breakdown: [
      'Outcomes not tools',
      'Each step unlocks next',
      '≤8 sharp steps',
    ],
    general: [
      'One-sentence user job · smallest slice',
      'Hierarchy > decoration',
      'Two directions · pick one · 25 min',
    ],
  }

  const move = pick(byDomain[domain] || byDomain.general)
  const head = step ? `Do · ${step} (${label})` : `Do · ${label}`
  const tail =
    energy === 'low'
      ? ' · low energy: lists/contrast only'
      : isMicro
        ? ' · finish ugly · close'
        : ''
  return `${head}: ${move}${tail}`
}

/**
 * One short risk (ADHD: single critique lens).
 */
export function critiqueForTask(activity = {}) {
  const domain = classifyTask(activity)
  const step = short(activity.nextTaskTitle, 36)
  const pins = Number(activity.pinsCount) || 0
  const queue = Number(activity.queueCount) || 0
  const label = DOMAIN_LABEL[domain] || DOMAIN_LABEL.general

  const byDomain = {
    logo: [
      'Risk: polish before 6 roughs',
      'Risk: dies at 24px / 1-color',
      'Risk: trend > meaning',
    ],
    color: [
      'Risk: accent everywhere',
      'Risk: low body contrast',
      'Risk: no single action color',
    ],
    type: [
      'Risk: too many weights',
      'Risk: display in UI chrome',
      'Risk: all bold = no emphasis',
    ],
    layout: [
      'Risk: twin primaries',
      'Risk: equal card weight',
      'Risk: style before wireframe',
    ],
    copy: [
      'Risk: poetry · no user verb',
      'Risk: 3 ideas in one line',
      'Risk: tagline needs a paragraph',
    ],
    research: [
      pins > 8 ? 'Risk: board bloat' : 'Risk: pins with no criteria',
      'Risk: no Sketch decision yet',
    ],
    export: [
      'Risk: ship unclear decisions',
      'Risk: missing hex / contrast',
    ],
    illustration: ['Risk: style drift · clutter'],
    photo: ['Risk: wallpaper crop'],
    motion: ['Risk: motion without state'],
    breakdown: [
      queue > 8 ? 'Risk: queue too long' : 'Risk: tool-steps not outcomes',
    ],
    general: [
      'Risk: decorate before job',
      'Risk: vague step title',
      'Risk: endless polish',
    ],
  }

  const risk = pick(byDomain[domain] || byDomain.general)
  const head = step ? `Watch · ${step} (${label})` : `Watch · ${label}`
  return `${head}: ${risk}`
}

/**
 * Combined coach: recommend + critique, still short.
 */
export function coachOnTask(activity = {}) {
  return `${recommendForTask(activity)} · ${critiqueForTask(activity)}`
}

/**
 * Snapshot of what the person is doing (from the app).
 */
export function describeActivity(activity = {}) {
  const view = activity.view || 'flow'
  const place = VIEW_LABELS[view] || 'app'
  const step = short(activity.nextTaskTitle, 32)
  const project = short(activity.projectName, 20)
  const domain = DOMAIN_LABEL[classifyTask(activity)]
  if (step) return `${place} · ${step} · ${domain}`
  return `${place}${project ? ` · ${project}` : ''} · ${domain}`
}

/**
 * 7-step design process coaching (scripted).
 * Prefers processGuide.prompt when present — single coaching source.
 * Legacy aliases: clarify→define, structure→sketch, visual→design, refine→review
 */
export function designProcessTip(phase, activity = {}) {
  const step = short(activity.nextTaskTitle, 28)
  const project = short(activity.projectName, 20) || 'project'
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

  const stems = {
    define: 'Goal · who · musts',
    research: 'Pins · ★ · why',
    ideate: 'Many sparks · shortlist',
    sketch: view === 'brand' ? 'One Design hole only' : '2–3 rough drafts',
    design: 'Type · color roles · hierarchy',
    review: 'Show pack · specific Qs · notes',
    deliver: 'PDF · handoff · learn',
  }
  const stem = stems[p] || activityTip(activity)
  const ctx = step || project
  return `${p[0].toUpperCase() + p.slice(1)} · ${ctx}: ${stem}`
}

/**
 * Contextual design tip from current screen + step + queue.
 * Professional, constructive; explains why.
 */
export function activityTip(activity = {}) {
  const view = activity.view || 'flow'
  const step = short(activity.nextTaskTitle, 32)
  const energy = activity.nextTaskEnergy || 'med'
  const queue = Number(activity.queueCount) || 0
  const done = Number(activity.doneCount) || 0
  const pins = Number(activity.pinsCount) || 0
  const project = short(activity.projectName, 20) || 'project'
  const hasDeadline = !!activity.projectDeadline
  const dueSoon = activity.stepDueSoon
  const isMicro = !!activity.isMicroStep
  const focusOn = !!activity.isFocusRunning

  if (focusOn) return step ? `Timer · only ${step}` : 'Timer · one action'
  if (view === 'studio') {
    return step
      ? `Research · pins that constrain ${step}`
      : pins > 0
        ? `Curate · then Sketch`
        : 'Pin 2–3 · why · Sketch'
  }
  if (view === 'brand') return `Design · one layer on ${project}`
  if (view === 'spark') return step ? `Spark → help ${step}?` : 'Spark → A/B/C → Sketch'
  if (view === 'review') return 'Show · ask · notes'
  if (view === 'finish') return 'PDF · handoff · learn'
  if (view === 'insights') return step ? `Timer for ${step}` : 'Sketch step · then timer'
  if (view === 'calendar') {
    return hasDeadline ? `Deadline · work back` : 'Set due · Sketch'
  }
  if (view === 'project') return 'Goal · who · Research'
  if (view === 'settings') return 'Backup · then path'

  if (view === 'flow' || !view) {
    if (!step) {
      return done > 0 ? 'Queue empty · next step' : `No step · capture one`
    }
    if (dueSoon) return `${step} · ship minimum`
    if (isMicro) return `${step} · finish · check`
    if (energy === 'low') return `${step} · labels/contrast only`
    if (queue >= 5) return `${queue} waiting · only ${step}`
    return `${step} · one lane only`
  }

  return pick(IDLE)
}

/** Idle check-in with design context */
export function idleLineWithActivity(activity = {}) {
  if (Math.random() < 0.55) return activityTip(activity)
  const place = VIEW_LABELS[activity.view] || 'desk'
  return pick([
    `${place} · Coach or Break`,
    activity.nextTaskTitle
      ? `Still · ${short(activity.nextTaskTitle, 28)}`
      : `${place} · capture a step`,
  ])
}

/** Two design directions — short A/B */
export function twoDirectionsTip(activity = {}) {
  const view = activity.view || 'flow'
  if (view === 'brand' || view === 'studio') {
    return 'A quiet · B product-forward · pick one'
  }
  if (view === 'flow') {
    return 'A outcome-first · B structure-first · 25 min'
  }
  return 'A simplify · B clarify CTA · ship one'
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
  if (kind === 'water') return 'Water · one decision'
  if (kind === 'food') return 'Food · ready'
  if (kind === 'bathroom') return 'Back · one call'
  if (kind === 'break') return 'Break · reset'
  return 'OK'
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
