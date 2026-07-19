/**
 * Design buddy — scripted UI/UX & graphic design coach (not a live LLM).
 * System persona: expert designer; user-centric, accessible, clear hierarchy.
 * Process: 1 Clarify → 2 Structure → 3 Visual → 4 Refine
 * Also: body care, time blindness, hyperfocus (so you can keep designing).
 */

/** Documented system identity for this buddy */
export const DESIGN_SYSTEM_PROMPT = `You are an expert UI/UX and Graphic Designer. Your goal is to help craft intuitive, visually stunning, and highly functional digital products and design assets.

4-step process:
1) Understand & Clarify — audience, brand, goals, constraints
2) Strategy & Wireframing — user journey, structure, text wireframes
3) Visual Design — type, color (hex), layout
4) Refinement — two directions, iterate on feedback

Philosophy: user-centric design, WCAG accessibility, clear visual hierarchy. Explain the why. Professional, constructive, organized.`


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
  "I'm your design buddy — UI/UX and visual craft. I'll track what you're working on, keep soft time, and coach with a clear process: clarify → structure → visual → refine.",
  "Design desk is open. I prioritize hierarchy, accessibility, and user goals. Ask for a tip, or pick Clarify / Structure / Visual / Refine.",
  "Hello — expert design coach mode. I'll watch the clock so deep focus doesn't erase dinner, and give constructive, specific guidance on what you're doing.",
]

const WATER = [
  'Quick care note: have you had water? Clear thinking needs it before the next layout decision.',
  'Hydration break — even a few sips. Then return to the current design step.',
  'Water check. Designers forget this in the zone. Sip, then back to hierarchy.',
]

const FOOD = [
  'Have you eaten? Low fuel kills judgment on type and color.',
  'Food check — a snack counts. Then one focused design action.',
  'Empty stomach, muddy decisions. Eat something small if you need to.',
]

const BATHROOM = [
  'Body break: bathroom if you need it. The composition will still be there.',
  'Stand and reset if you are holding still too long. Fresh eyes matter for critique.',
  'Quick reset walk or bathroom — then look at your work with distance.',
]

const PROGRESS_STEP = [
  'Step complete. That is real progress on the craft — not just motion.',
  'Nice. One deliverable-sized action closed. Momentum without chaos.',
  'Checked off. Keep the same scope discipline on the next piece.',
]

const PROGRESS_TIMER = [
  "Timer is running. Protect one design action only — no tool-hopping.",
  'Focus block on. I will hold time; you hold hierarchy and intent.',
  'Container mode: one step, clear outcome, then reassess.',
]

const STUCK = [
  "Stuck is a signal. Step 1 — clarify: who is this for and what must they do? Then shrink the task.",
  "When frozen: define the user job in one sentence, or wireframe the screen in text only. Skip polish.",
  "Designer's block often means the problem is underspecified. Clarify audience and goal, then one micro-step.",
]

const IDLE = [
  'Still here. What is the single next design decision — type, layout, or copy hierarchy?',
  'Checking in. Need Clarify, Structure, Visual, or Refine guidance?',
  'No need to finish the whole system. One clear interaction or visual choice is enough right now.',
]

const PRAISE = [
  'Showing up to the desk is half of craft. Keep going.',
  'Messy first passes are correct process. Refine later with intent.',
  'Good work protecting a single step — that is professional scope control.',
]

const TIME_BLIND = [
  (clock, desk) =>
    `Time orientation: it is ${clock}. You have been at the desk about ${desk}. Use that to pace critique — not to panic.`,
  (clock, desk) =>
    `Clock check: ${clock}. Session ~${desk}. Still optimize for one clear outcome.`,
  (clock, desk) =>
    `Soft time: ${clock}, about ${desk} in. Deep work is fine; body breaks protect judgment.`,
]

const HYPER_SOFT = [
  (mins) =>
    `About ${mins} minutes deep. Micro-break: look 20 feet away, then return with fresh hierarchy eyes.`,
  (mins) =>
    `${mins} min continuous. Stretch shoulders, sip water — then one design decision only.`,
  (mins) =>
    `Long stretch (~${mins} min). A 60-second stand improves visual judgment more than another tweak.`,
]

const HYPER_STRONG = [
  (mins) =>
    `Hyperfocus alert: ~${mins} minutes. Bathroom and water. Your layout will still be here.`,
  (mins) =>
    `${mins} minutes without a real break — this is when craft quality drops. Three minutes away, then return.`,
  (mins) =>
    `Strong nudge at ~${mins} min. Step away once. I am holding your place in the process.`,
]

const HYPER_HARD = [
  (mins) =>
    `Hard stop suggestion: ~${mins} min continuous. Stand, water, snack. Fresh eyes beat more polishing.`,
  (mins) =>
    `${mins} minutes is a long design block. Break is part of craft, not quitting.`,
  (mins) =>
    `~${mins} min in. Protect your body so the next visual decision stays sharp.`,
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
  flow: 'Work',
  studio: 'the mood board',
  project: 'Projects',
  brand: 'Brand',
  spark: 'Spark',
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
 * Snapshot of what the person is doing (from the app).
 */
export function describeActivity(activity = {}) {
  const view = activity.view || 'flow'
  const place = VIEW_LABELS[view] || 'the app'
  const step = short(activity.nextTaskTitle, 40)
  const project = short(activity.projectName, 24)
  if (step && view === 'flow') {
    return `Context: Work · project ${project || '—'} · current step "${step}".`
  }
  if (step) {
    return `Context: ${place} · open step still "${step}".`
  }
  return `Context: ${place}${project ? ` · ${project}` : ''}.`
}

/**
 * 4-step design process coaching (system prompt behavior, scripted).
 * phase: clarify | structure | visual | refine
 */
export function designProcessTip(phase, activity = {}) {
  const step = short(activity.nextTaskTitle, 48)
  const project = short(activity.projectName, 28) || 'this project'
  const view = activity.view || 'flow'
  const pins = Number(activity.pinsCount) || 0

  if (phase === 'clarify') {
    return [
      'Step 1 — Understand & clarify.',
      `For ${project}, answer in one line each: (1) Who is the audience? (2) What should they feel or do? (3) What constraint is real (time, brand, format)?`,
      step
        ? `Map those answers onto your step: "${step}". If you cannot, the step is still too vague — rewrite it as a user outcome.`
        : 'Then write one Work step that ships a decision, not "work on brand."',
      'Why: unclear goals produce pretty-but-useless UI.',
    ].join(' ')
  }

  if (phase === 'structure') {
    return [
      'Step 2 — Strategy & structure (wireframe in words).',
      view === 'brand'
        ? 'List the brand pack as a journey: cover → message → palette → type → do/don’t → export. Fill only the next empty section.'
        : 'Sketch the flow: entry → primary action → success. For the current screen, list blocks top-to-bottom (header, hero, proof, CTA).',
      step ? `Tie the structure to: "${step}".` : '',
      'Why: layout before decoration. Hierarchy is a strategy choice.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (phase === 'visual') {
    return [
      'Step 3 — Visual design.',
      view === 'studio' || pins > 0
        ? `Use the board: pick 1–2 refs that set mood. Limit palette to 3–5 hex roles (bg, text, accent, success/warn). Pair one display + one UI sans.`
        : 'Suggest: primary accent with clear contrast on background (aim WCAG AA for body text). One accent for CTAs only — avoid accent inflation.',
      'Whitespace and grid over decoration. One focal point per view.',
      step ? `Does the visual system support "${step}"?` : '',
      'Why: restraint reads as confidence; noise reads as template.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  if (phase === 'refine') {
    return [
      'Step 4 — Refinement.',
      'Propose two directions in one sentence each — e.g. A) calmer editorial hierarchy B) bolder product CTA path. Pick one primary CTA per screen.',
      'Audit: contrast, focus order, touch targets, empty states, destructive actions away from primary.',
      'Ship a small complete slice (one step) rather than half of everything.',
      'Why: iteration with criteria beats endless polishing.',
    ].join(' ')
  }

  return activityTip(activity)
}

/**
 * Contextual design tip from current screen + step + queue.
 * Professional, constructive; explains why.
 */
export function activityTip(activity = {}) {
  const view = activity.view || 'flow'
  const step = short(activity.nextTaskTitle, 52)
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
      ? `Focus block: execute only "${step}". No tool-hopping. Why: split attention destroys visual judgment.`
      : 'Focus block: one atomic design action until the timer ends. Why: containers beat open-ended polish.'
  }

  if (view === 'studio') {
    if (!step) {
      return pins > 0
        ? `Mood board: curate, do not hoard. Keep pins that define mood/material; remove noise. Then return to Work with one decision. Why: refs should constrain choices.`
        : 'Mood board: pin 2–3 images with a note on why (tone, not "pretty"). Why: captioned refs become a design system seed.'
    }
    return `Board in service of "${step}". Ask per pin: hierarchy cue, color story, or composition? If neither, drop it. Why: boards without criteria become procrastination.`
  }

  if (view === 'brand') {
    return `Brand template for ${project}: treat it as an identity system, not a form to finish. Complete one layer (tagline or palette roles) with contrast in mind. Export when the story is coherent. Why: incomplete but consistent beats complete but conflicting.`
  }

  if (view === 'spark') {
    return step
      ? `Spark is provocation only. If it supports "${step}", pin with a caption; otherwise advance. Why: ideation without a job-to-be-done is noise.`
      : 'Use one spark as a constraint (mood or metaphor), pin it, return to Work. Why: inspiration must attach to a deliverable.'
  }

  if (view === 'insights') {
    return step
      ? `Timer is a craft container for "${step}". Prefer 25 for deep layout, 2 for a micro-decision. Why: timeboxes force shipping over tinkering.`
      : 'Set a step on Work first, then run a short focus block. Why: timers without a target amplify anxiety.'
  }

  if (view === 'calendar') {
    return hasDeadline
      ? `Deadline for ${project} is a milestone, not a vibe. Work backward: what must be true one week out? Capture that as Work steps. Why: dates need dependencies.`
      : 'No deadline yet. If the client has one, set it; else set a personal review date. Why: invisible time is missed hierarchy in planning.'
  }

  if (view === 'project') {
    return `Project setup: brief = audience + outcome + constraints. Then leave for Work. Why: briefs prevent decorative rabbit holes.`
  }

  if (view === 'settings') {
    return 'Settings are infrastructure. Backup if the work matters, then return to the craft surface (Work / Brand). Why: tools serve the product, not the reverse.'
  }

  // Work
  if (view === 'flow' || !view) {
    if (!step) {
      if (done > 0) {
        return 'Queue clear. Capture the next user-facing outcome, or break the project into micro-steps if scope is still a blob. Why: empty desks need a job-to-be-done.'
      }
      return `No current step for ${project}. Clarify the outcome in one sentence, then either capture it or run micro-steps. Why: designers stall when the problem is undefined.`
    }

    if (dueSoon) {
      return `"${step}" is time-sensitive. Scope to the minimum shippable: one hierarchy decision or one screen block. Why: deadlines reward ruthless prioritization.`
    }

    if (isMicro) {
      return `Micro-step "${step}" is correctly sized. Finish messy if needed, then mark complete. Why: small closed loops build systems.`
    }

    if (energy === 'low') {
      return `Low-energy step "${step}": choose a low-cognition task (rename labels, check contrast, tidy spacing). Or Split ×3. Why: match cognitive load to capacity.`
    }

    if (energy === 'high') {
      return `High-energy step "${step}": good for exploration or hard layout. If energy is not there, park it and take a structure-only pass. Why: force-fitting deep work wastes sessions.`
    }

    if (queue >= 5) {
      return `Queue has ${queue} waiting. Tunnel vision on "${step}" only. Why: open loops tax working memory and blur hierarchy of attention.`
    }

    return [
      `Current craft focus: "${step}".`,
      'If scope is fuzzy → Clarify. If layout is fuzzy → Structure. If style is fuzzy → Visual. If almost done → Refine.',
      'Why: name the design problem before adding pixels.',
    ].join(' ')
  }

  return pick(IDLE)
}

/** Idle check-in with design context */
export function idleLineWithActivity(activity = {}) {
  if (Math.random() < 0.6) return activityTip(activity)
  const place = VIEW_LABELS[activity.view] || 'your desk'
  return pick([
    `Still coaching from the side. You are on ${place}. Want Clarify, Structure, Visual, or Refine?`,
    `Check-in on ${place}. Hierarchy still clear? Need a process tip?`,
    activity.nextTaskTitle
      ? `Holding context: "${short(activity.nextTaskTitle, 36)}". One decision at a time.`
      : `On ${place}. Define the next user outcome when ready.`,
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
  if (kind === 'water')
    return 'Water noted. Clear head, then one design decision.'
  if (kind === 'food')
    return 'Fuel noted. Judgment improves with basics covered.'
  if (kind === 'bathroom')
    return 'Welcome back. Fresh eyes on hierarchy — that is the point of the pause.'
  if (kind === 'break')
    return 'Break logged. Long-stretch timer reset. Return with intent, not guilt.'
  return 'Noted. Still here as your design coach.'
}

export function whatTimeLine(sessionStart, now = Date.now()) {
  const clock = formatClock(new Date(now))
  const desk = formatDuration(now - sessionStart)
  const sinceBreak = minutesSinceBreak(loadWellness(), sessionStart, now)
  return `It is ${clock}. Desk time about ${desk}. Roughly ${sinceBreak} minutes since a real break. Pace craft accordingly.`
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
 * Screen spots so the buddy is harder to ignore by habit.
 * Panel uses inset CSS; fab uses the same anchors.
 */
export const BUDDY_SPOTS = [
  { id: 'br', label: 'bottom-right', bottom: '1rem', right: '1rem', top: 'auto', left: 'auto' },
  { id: 'bl', label: 'bottom-left', bottom: '1rem', left: '1rem', top: 'auto', right: 'auto' },
  { id: 'tr', label: 'top-right', top: '4.5rem', right: '1rem', bottom: 'auto', left: 'auto' },
  { id: 'tl', label: 'top-left', top: '4.5rem', left: '1rem', bottom: 'auto', right: 'auto' },
  { id: 'mr', label: 'mid-right', top: '42%', right: '0.75rem', bottom: 'auto', left: 'auto' },
  { id: 'ml', label: 'mid-left', top: '42%', left: '0.75rem', bottom: 'auto', right: 'auto' },
  { id: 'bc', label: 'bottom-center', bottom: '1rem', left: '50%', right: 'auto', top: 'auto', transform: 'translateX(-50%)' },
]

/** Pick a new spot, never the same as last time when possible. */
export function pickBuddySpot(prevId = null) {
  const options =
    prevId && BUDDY_SPOTS.length > 1
      ? BUDDY_SPOTS.filter((s) => s.id !== prevId)
      : BUDDY_SPOTS
  return options[Math.floor(Math.random() * options.length)]
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
