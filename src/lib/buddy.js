/**
 * Rule-based body-double buddy lines.
 * Not an AI chatbot — scripted check-ins for ADHD body care + desk progress.
 */

const WELLNESS_KEY = 'cc-buddy-wellness-v1'
const MS = {
  water: 45 * 60 * 1000,
  food: 3 * 60 * 60 * 1000,
  bathroom: 90 * 60 * 1000,
}

export function loadWellness() {
  try {
    const raw = localStorage.getItem(WELLNESS_KEY)
    if (!raw) return { water: 0, food: 0, bathroom: 0 }
    const p = JSON.parse(raw)
    return {
      water: Number(p.water) || 0,
      food: Number(p.food) || 0,
      bathroom: Number(p.bathroom) || 0,
    }
  } catch {
    return { water: 0, food: 0, bathroom: 0 }
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
  const next = { ...loadWellness(), [kind]: Date.now() }
  saveWellness(next)
  return next
}

export function overdueKinds(wellness = loadWellness(), now = Date.now()) {
  const out = []
  if (!wellness.water || now - wellness.water > MS.water) out.push('water')
  if (!wellness.food || now - wellness.food > MS.food) out.push('food')
  if (!wellness.bathroom || now - wellness.bathroom > MS.bathroom)
    out.push('bathroom')
  return out
}

const GREETINGS = [
  "Hey — I'm here so you're not alone at the desk. Let's check in.",
  "Buddy online. Tiny body checks + hype for your next step.",
  "I'm your body double bot. Not a therapist — just a nudgey friend.",
]

const WATER = [
  'Water check 💧 Have you had a sip in the last while?',
  'Hydration nudge: glass of water now beats crashing later.',
  'Quick one: drink something. Your brain runs on water too.',
]

const FOOD = [
  'Food check 🍎 Have you eaten something today?',
  'Fuel break? Even a snack counts. Empty stomach = foggy desk.',
  'Did you eat? Creative work needs calories, not just coffee.',
]

const BATHROOM = [
  'Bathroom break? Holding it tanks focus. Go if you need to.',
  'Body check: bathroom. Stand up, walk, come back for the step.',
  "Stretch + bathroom if you've been planted. I'll hold the desk.",
]

const PROGRESS_STEP = [
  'Nice — a step left the queue. That counts as real motion.',
  'Progress logged. One less blob on the desk. Proud of you.',
  'You completed something. Micro-wins stack into finished work.',
]

const PROGRESS_TIMER = [
  'Timer is humming. Stay with the current step — nothing else.',
  'Focus pocket is on. Bathroom/water first if you need them, then back.',
  'Timer mode: one job only. Buddy is sitting with you.',
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

export function confirmLine(kind) {
  if (kind === 'water') return 'Logged 💧 Water. Nice. Back to the step when ready.'
  if (kind === 'food') return 'Logged 🍎 Food. Fuel helps the next mark complete.'
  if (kind === 'bathroom')
    return 'Logged 🚻 Bathroom. Welcome back — current step is waiting.'
  return 'Noted. I am still sitting with you.'
}

/** Mood for avatar face */
export function buddyMood({ overdue, isFocusRunning, recentWin }) {
  if (recentWin) return 'cheer'
  if (isFocusRunning) return 'focus'
  if (overdue?.length) return 'nudge'
  return 'idle'
}
