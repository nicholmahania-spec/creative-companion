/**
 * Rule-based body-double buddy lines.
 * Not an AI chatbot — scripted check-ins for ADHD:
 * body care, desk progress, time blindness, hyperfocus.
 */

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
  "Hey — I'm here for company, body checks, and time blindness. Clock is soft, not scary.",
  'Buddy online. I track how long you have been at the desk so time does not vanish.',
  "Body double bot here. I will nudge water, bathroom, and breaks if hyperfocus grabs you.",
]

const WATER = [
  'Water check. Have you had a sip in the last while?',
  'Hydration nudge: glass of water now beats crashing later.',
  'Quick one: drink something. Your brain runs on water too.',
]

const FOOD = [
  'Food check. Have you eaten something today?',
  'Fuel break? Even a snack counts. Empty stomach = foggy desk.',
  'Did you eat? Creative work needs calories, not just coffee.',
]

const BATHROOM = [
  'Bathroom break? Holding it tanks focus. Go if you need to.',
  'Body check: bathroom. Stand up, walk, come back for the step.',
  'Stretch + bathroom if you have been planted. I will hold the desk.',
]

const PROGRESS_STEP = [
  'Nice — a step left the queue. That counts as real motion.',
  'Progress logged. One less blob on the desk. Proud of you.',
  'You completed something. Micro-wins stack into finished work.',
]

const PROGRESS_TIMER = [
  'Timer is humming. Stay with the current step — nothing else.',
  'Focus pocket is on. I will still watch the clock so hyperfocus does not eat dinner.',
  'Timer mode: one job only. Buddy is sitting with you and holding time.',
]

const STUCK = [
  'Stuck is information, not failure. Split the step or pick Stuck?',
  'When it freezes: smaller action, 2-min timer, or walk for water.',
  'You are not broken — the task might still be too big. Micro-step it.',
]

const IDLE = [
  'Still here. What is the one next action on the current step?',
  'Desk buddy check-in. Body okay? Step still clear?',
  'Ping: you do not have to finish everything — just the current step.',
]

const PRAISE = [
  'You are showing up. That is the hard part for ADHD brains.',
  'Company mode on. No judgment if you wander — just come back.',
  'I believe in ugly first drafts. Keep going.',
]

const TIME_BLIND = [
  (clock, desk) =>
    `Time check: it is ${clock}. You have been at the desk about ${desk}. Not a scold — just orientation.`,
  (clock, desk) =>
    `Soft clock: ${clock}. Desk session ~${desk}. Still one step only.`,
  (clock, desk) =>
    `Time blindness ping — wall clock says ${clock}. You have been here ~${desk}.`,
]

const HYPER_SOFT = [
  (mins) =>
    `Hyperfocus watch: ~${mins} min without a real break. 60-second stand + water still counts as winning.`,
  (mins) =>
    `You have been deep for about ${mins} minutes. Eyes off screen for one breath? Then return to the step.`,
  (mins) =>
    `${mins} min continuous. Body first: stretch shoulders, sip water, then the current step only.`,
]

const HYPER_STRONG = [
  (mins) =>
    `Hyperfocus alert: ~${mins} min planted. Bathroom + water now — the work will still be here.`,
  (mins) =>
    `${mins} minutes deep. This is the ADHD trap where dinner disappears. 3-minute break, then back.`,
  (mins) =>
    `Strong nudge: you have been going ~${mins} min. Step away once. I am holding your place.`,
]

const HYPER_HARD = [
  (mins) =>
    `Hard stop suggestion: ~${mins} min without a break. Stand up, bathroom, water, snack. Set a 2-min timer when you return.`,
  (mins) =>
    `${mins} minutes is a lot of continuous focus. Hyperfocus is a gift and a thief — reclaim 5 minutes for your body.`,
  (mins) =>
    `Buddy override: you have been at this ~${mins} min. Break is productive. Come back to one step only.`,
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
    return 'Logged water. Nice. Time keeps moving — one step when ready.'
  if (kind === 'food')
    return 'Logged food. Fuel helps the next mark complete.'
  if (kind === 'bathroom')
    return 'Logged bathroom. Welcome back — current step is waiting.'
  if (kind === 'break')
    return 'Break logged. Hyperfocus clock reset. Come back gentle.'
  return 'Noted. I am still sitting with you and watching the clock softly.'
}

export function whatTimeLine(sessionStart, now = Date.now()) {
  const clock = formatClock(new Date(now))
  const desk = formatDuration(now - sessionStart)
  const sinceBreak = minutesSinceBreak(loadWellness(), sessionStart, now)
  return `It is ${clock}. Desk session ~${desk}. About ${sinceBreak} min since your last break log.`
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

export { MS }
