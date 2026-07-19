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
 * Used for friendly, contextual tips — not AI.
 */
export function describeActivity(activity = {}) {
  const view = activity.view || 'flow'
  const place = VIEW_LABELS[view] || 'the app'
  const step = short(activity.nextTaskTitle, 40)
  if (step && view === 'flow') {
    return `You're on Work, looking at: "${step}".`
  }
  if (step) {
    return `You're on ${place}. Your open step is still: "${step}".`
  }
  return `You're on ${place}.`
}

/**
 * One helpful tip based on current screen + step + queue.
 * Plain English, best-friend tone.
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

  // Timer running — tip about protecting focus
  if (focusOn) {
    return step
      ? `Timer's running. Just this: "${step}". Nothing else until it dings.`
      : "Timer's on. Stay with one tiny job until it ends. I've got the clock."
  }

  // View-specific tips
  if (view === 'studio') {
    if (!step) {
      return pins > 0
        ? "You've got pins on the board. When you're ready, head back to Work and pick a next step."
        : "Board time — drop one image that feels right, then bounce back to Work so it doesn't become a rabbit hole."
    }
    return pins > 2
      ? `Nice collection. Pin one more only if it helps "${step}" — then go complete that step.`
      : `You're collecting refs. Ask: does this pin help "${step}"? If yes, keep it. If not, skip it.`
  }

  if (view === 'brand') {
    return `Brand is a lot of fields. Fill one thing for ${project} — tagline or a color — then stop. Export later is fine.`
  }

  if (view === 'spark') {
    return step
      ? `If a spark fits "${step}", pin it. If not, hit another spark or go back to Work. Don't live here.`
      : 'Grab one spark that feels useful, pin it if you want, then get back to Work.'
  }

  if (view === 'insights') {
    return step
      ? `Start a 25 or 2 min timer and stay with "${step}". The timer is a container, not a test.`
      : 'No open step yet — hop to Work, add one, then start a short timer.'
  }

  if (view === 'calendar') {
    return hasDeadline
      ? `Deadline is set for ${project}. Use it as a compass, not a panic button. What's the next small step?`
      : `No project deadline yet. Pick a date if it helps — or go set one tiny task due date on Work.`
  }

  if (view === 'project') {
    return `Projects page is for setup. Rename, brief, deadline — then go to Work. Don't nest here all day.`
  }

  if (view === 'settings') {
    return "Settings is fine for a minute. When you're done, Work is where the real progress lives."
  }

  // Work view — richest tips
  if (view === 'flow' || !view) {
    if (!step) {
      if (done > 0) {
        return "Queue looks clear — nice. Dump one messy idea below, or break the project into micro-steps if the whole thing feels huge."
      }
      return `Nothing on the desk for ${project} yet. Either dump one raw idea, or hit "break into micro-steps" if it's too big to start.`
    }

    if (dueSoon) {
      return `"${step}" has a due date coming up. Don't do everything — do the smallest next piece of that one thing.`
    }

    if (isMicro) {
      return `This is a micro-step: "${step}". Perfect size. Mark it done when it's honestly finished, even if ugly.`
    }

    if (energy === 'low') {
      return `"${step}" is marked low energy. Shrink it: five minutes, messy, incomplete is fine. Or split it into three.`
    }

    if (energy === 'high') {
      return `"${step}" wants high energy. If you don't have that today, swap in a smaller piece or wait for a better window.`
    }

    if (queue >= 5) {
      return `You've got ${queue} things waiting after this. Ignore them. Only "${step}" matters right now.`
    }

    if (queue === 0 && done === 0) {
      return `Just one thing open: "${step}". That's a gift. Stay with it until you can check it off.`
    }

    return [
      `You're on: "${step}".`,
      energy === 'med' ? 'Med energy is fine — steady, not heroic.' : '',
      'If it feels huge, hit Split ×3. If it feels clear, do a messy first pass and mark complete.',
    ]
      .filter(Boolean)
      .join(' ')
  }

  return pick(IDLE)
}

/** Idle check-in that mentions what you're doing */
export function idleLineWithActivity(activity = {}) {
  const tip = activityTip(activity)
  // Sometimes pure idle, sometimes activity tip
  if (Math.random() < 0.55) return tip
  const place = VIEW_LABELS[activity.view] || 'your desk'
  return pick([
    `Still here. You're on ${place}. Need a tip or a break?`,
    `Hey — checking in while you're on ${place}. You good?`,
    activity.nextTaskTitle
      ? `Still with you. That step "${short(activity.nextTaskTitle, 36)}" is waiting whenever you're ready.`
      : `Still with you on ${place}. No rush.`,
  ])
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
