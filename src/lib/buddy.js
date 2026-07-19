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
  "Hey, I'm right here with you. I'll keep an eye on the clock and check if you need water or a break.",
  "Hi friend. Pull up a chair — I've got your back while you work.",
  "Hey you. I'm hanging out so time doesn't sneak away and you don't forget to take care of yourself.",
]

const WATER = [
  "Hey — have you had any water lately? Even a few sips.",
  "Friendly reminder from me: grab a drink. Future you will thank you.",
  "Water check, friend. Want to take a quick sip before you keep going?",
]

const FOOD = [
  "Real talk — have you eaten today? Even a snack counts.",
  "Hey, food check. Empty stomach makes everything harder.",
  "Did you eat something? Coffee doesn't count. Want a quick snack break?",
]

const BATHROOM = [
  "Bathroom break? Don't wait until you're miserable. I'll be here when you're back.",
  "Hey, if you need the bathroom, just go. The work isn't going anywhere.",
  "Quick body check: stand up, bathroom if you need it, then come back. I got you.",
]

const PROGRESS_STEP = [
  "Yes! You finished one. That's real progress — I'm proud of you.",
  "Look at you go. One less thing hanging over you. Nice work.",
  "You actually completed something. That counts. Keep that energy.",
]

const PROGRESS_TIMER = [
  "Timer's on. Just this one thing — nothing else for now. I'm right here.",
  "Okay, focus time. I'll watch the clock so you don't have to.",
  "You've got this. One job while the timer runs. I'm sitting with you.",
]

const STUCK = [
  "Stuck happens to everyone. Try a tiny piece of it, or take two minutes and come back.",
  "Hey, it's okay. Make it smaller. What's the smallest next move you can do?",
  "You're not failing — this part is just hard. Split it up or walk away for a minute.",
]

const IDLE = [
  "Still here with you. What's the next little thing on your list?",
  "Hey, just checking in. You good? Need anything?",
  "No pressure to finish everything. Just the next step. I'm not going anywhere.",
]

const PRAISE = [
  "Showing up is the hard part. You're doing that. I see you.",
  "Wander off if you need to — just come back when you can. No judgment from me.",
  "Messy drafts are allowed. Keep going. I believe in you.",
]

const TIME_BLIND = [
  (clock, desk) =>
    `Hey, heads up — it's ${clock}. You've been here about ${desk}. Not nagging, just so you know.`,
  (clock, desk) =>
    `Quick time check: ${clock}. You've been at this for about ${desk}.`,
  (clock, desk) =>
    `Friend update: the clock says ${clock}, and you've been sitting here about ${desk}.`,
]

const HYPER_SOFT = [
  (mins) =>
    `You've been deep in it for about ${mins} minutes. Want to stand up and stretch for a sec?`,
  (mins) =>
    `Hey — roughly ${mins} min without a break. Look away from the screen for one breath, then come back.`,
  (mins) =>
    `${mins} minutes in. Sip of water and a shoulder roll? Then jump back in.`,
]

const HYPER_STRONG = [
  (mins) =>
    `Okay friend, you've been at this about ${mins} minutes. Bathroom and water. The work will wait.`,
  (mins) =>
    `${mins} minutes deep — this is how dinner disappears. Take three minutes. I'll hold your spot.`,
  (mins) =>
    `You've been going hard for ~${mins} min. Step away once. I've got your place saved.`,
]

const HYPER_HARD = [
  (mins) =>
    `Hey. Real talk: ~${mins} minutes with no break. Stand up, bathroom, water, maybe a snack. Come back when you're ready.`,
  (mins) =>
    `${mins} minutes is a long stretch. Take five for your body. You're allowed. The work stays.`,
  (mins) =>
    `I'm gently insisting: you've been at this ~${mins} min. Break is not quitting. I'll be right here.`,
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
    return 'Nice. Water logged. Whenever you are ready, just the next little step.'
  if (kind === 'food')
    return 'Good. Food helps more than people admit. Proud of you for that.'
  if (kind === 'bathroom')
    return 'Welcome back. Your step is still right where you left it.'
  if (kind === 'break')
    return "Okay, break counts. I'm resetting the long-stretch timer. Come back soft."
  return "Got it. I'm still here with you."
}

export function whatTimeLine(sessionStart, now = Date.now()) {
  const clock = formatClock(new Date(now))
  const desk = formatDuration(now - sessionStart)
  const sinceBreak = minutesSinceBreak(loadWellness(), sessionStart, now)
  return `It's ${clock}. You've been here about ${desk}. Roughly ${sinceBreak} minutes since you last took a break.`
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
