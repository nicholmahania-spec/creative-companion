/**
 * Lightweight gamification for the Design buddy.
 * Local-only progress: XP, levels, streaks, badges.
 */

const GAME_KEY = 'cc-buddy-game-v1'

export const LEVEL_THRESHOLDS = [
  0, 40, 100, 180, 280, 400, 550, 750, 1000, 1300, 1700, 2200, 2800, 3500, 4300,
]

export const BADGES = {
  first_step: {
    id: 'first_step',
    name: 'First step',
    desc: 'Complete your first work step',
    icon: '✓',
  },
  step_streak_3: {
    id: 'step_streak_3',
    name: 'Triple play',
    desc: 'Complete 3 steps in one day',
    icon: '🔥',
  },
  break_hero: {
    id: 'break_hero',
    name: 'Break hero',
    desc: 'Finish a required Pomodoro break',
    icon: '⏱',
  },
  water_3: {
    id: 'water_3',
    name: 'Hydrated',
    desc: 'Log water 3 times',
    icon: '💧',
  },
  full_body: {
    id: 'full_body',
    name: 'Body check pro',
    desc: 'Log water, food, and bathroom in one day',
    icon: '★',
  },
  pomodoro_5: {
    id: 'pomodoro_5',
    name: 'Focus five',
    desc: 'Complete 5 Pomodoro work blocks',
    icon: '🎯',
  },
  package_sent: {
    id: 'package_sent',
    name: 'Brand bridge',
    desc: 'Send Ideas package to Brand',
    icon: '📦',
  },
  journey_finish: {
    id: 'journey_finish',
    name: 'Path walker',
    desc: 'Open the Finish step',
    icon: '🏁',
  },
  level_5: {
    id: 'level_5',
    name: 'Level 5',
    desc: 'Reach buddy level 5',
    icon: '⬆',
  },
  day_streak_3: {
    id: 'day_streak_3',
    name: '3-day streak',
    desc: 'Show up 3 days in a row',
    icon: '📅',
  },
}

const defaultGame = () => ({
  xp: 0,
  level: 1,
  totalSteps: 0,
  totalBreaks: 0,
  totalPomodoros: 0,
  waterLogs: 0,
  foodLogs: 0,
  bathroomLogs: 0,
  dayStreak: 0,
  lastActiveDay: '',
  todayKey: '',
  todaySteps: 0,
  todayWater: false,
  todayFood: false,
  todayBathroom: false,
  badges: [],
  recent: [], // { id, text, xp, at }
})

export function loadGame() {
  try {
    const raw = localStorage.getItem(GAME_KEY)
    if (!raw) return defaultGame()
    return { ...defaultGame(), ...JSON.parse(raw) }
  } catch {
    return defaultGame()
  }
}

export function saveGame(game) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(game))
  } catch {
    /* ignore */
  }
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function levelFromXp(xp) {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1
    else break
  }
  return Math.min(level, LEVEL_THRESHOLDS.length)
}

export function xpProgress(xp) {
  const level = levelFromXp(xp)
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0
  const next = LEVEL_THRESHOLDS[level] ?? floor + 100
  const span = Math.max(1, next - floor)
  const into = Math.max(0, xp - floor)
  return {
    level,
    floor,
    next,
    into,
    span,
    percent: Math.min(100, Math.round((into / span) * 100)),
    xpToNext: Math.max(0, next - xp),
  }
}

function unlockBadge(game, badgeId) {
  if (game.badges.includes(badgeId)) return null
  game.badges = [...game.badges, badgeId]
  return BADGES[badgeId] || null
}

function pushRecent(game, text, xp) {
  game.recent = [
    { id: Date.now() + Math.random(), text, xp, at: new Date().toISOString() },
    ...(game.recent || []),
  ].slice(0, 8)
}

function rollDay(game) {
  const today = dayKey()
  if (game.todayKey === today) return game
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  if (game.lastActiveDay === yesterday) {
    game.dayStreak = (game.dayStreak || 0) + 1
  } else if (game.lastActiveDay !== today) {
    game.dayStreak = 1
  }
  game.lastActiveDay = today
  game.todayKey = today
  game.todaySteps = 0
  game.todayWater = false
  game.todayFood = false
  game.todayBathroom = false
  return game
}

/**
 * Award XP for an action.
 * @returns {{ game, gained, levelUp, badgesUnlocked, messages }}
 */
export function award(action, meta = {}) {
  let game = rollDay(loadGame())
  let gained = 0
  const badgesUnlocked = []
  const messages = []

  const add = (n, label) => {
    gained += n
    pushRecent(game, label, n)
  }

  switch (action) {
    case 'step_complete':
      gained += 15
      game.totalSteps = (game.totalSteps || 0) + 1
      game.todaySteps = (game.todaySteps || 0) + 1
      pushRecent(game, 'Step complete', 15)
      {
        const b = unlockBadge(game, 'first_step')
        if (b) badgesUnlocked.push(b)
      }
      if (game.todaySteps >= 3) {
        const b = unlockBadge(game, 'step_streak_3')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'break_complete':
      gained += 25
      game.totalBreaks = (game.totalBreaks || 0) + 1
      pushRecent(game, 'Required break finished', 25)
      {
        const b = unlockBadge(game, 'break_hero')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'pomodoro_work':
      gained += 20
      game.totalPomodoros = (game.totalPomodoros || 0) + 1
      pushRecent(game, 'Pomodoro work block', 20)
      if (game.totalPomodoros >= 5) {
        const b = unlockBadge(game, 'pomodoro_5')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'water':
      gained += 5
      game.waterLogs = (game.waterLogs || 0) + 1
      game.todayWater = true
      pushRecent(game, 'Water logged', 5)
      if (game.waterLogs >= 3) {
        const b = unlockBadge(game, 'water_3')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'food':
      gained += 5
      game.foodLogs = (game.foodLogs || 0) + 1
      game.todayFood = true
      pushRecent(game, 'Food logged', 5)
      break
    case 'bathroom':
      gained += 5
      game.bathroomLogs = (game.bathroomLogs || 0) + 1
      game.todayBathroom = true
      pushRecent(game, 'Bathroom logged', 5)
      break
    case 'package_brand':
      gained += 40
      pushRecent(game, 'Ideas → Brand package', 40)
      {
        const b = unlockBadge(game, 'package_sent')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'journey_finish':
      gained += 10
      pushRecent(game, 'Reached Finish step', 10)
      {
        const b = unlockBadge(game, 'journey_finish')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'check_in':
      gained += 2
      pushRecent(game, 'Buddy check-in', 2)
      break
    default:
      break
  }

  if (game.todayWater && game.todayFood && game.todayBathroom) {
    const b = unlockBadge(game, 'full_body')
    if (b) badgesUnlocked.push(b)
  }
  if (game.dayStreak >= 3) {
    const b = unlockBadge(game, 'day_streak_3')
    if (b) badgesUnlocked.push(b)
  }

  const prevLevel = game.level || 1
  game.xp = (game.xp || 0) + gained
  game.level = levelFromXp(game.xp)
  if (game.level >= 5) {
    const b = unlockBadge(game, 'level_5')
    if (b) badgesUnlocked.push(b)
  }

  const levelUp = game.level > prevLevel
  if (levelUp) {
    messages.push(
      `Level up! You reached level ${game.level}. Nice steady craft.`
    )
  }
  if (gained > 0) {
    messages.push(`+${gained} XP${meta.label ? ` · ${meta.label}` : ''}`)
  }
  for (const b of badgesUnlocked) {
    messages.push(`Badge unlocked: ${b.icon} ${b.name} — ${b.desc}`)
  }

  saveGame(game)
  return {
    game,
    gained,
    levelUp,
    newLevel: game.level,
    badgesUnlocked,
    messages,
    progress: xpProgress(game.xp),
  }
}

export function gameSummaryLine(game = loadGame()) {
  const p = xpProgress(game.xp)
  return `Level ${p.level} · ${game.xp} XP · ${p.xpToNext} to next · streak ${game.dayStreak || 0} day${
    (game.dayStreak || 0) === 1 ? '' : 's'
  }`
}

/** Award XP and notify the buddy UI (if open). */
export function awardAndBroadcast(action, meta = {}) {
  const result = award(action, meta)
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cc-buddy-game', { detail: result })
      )
    }
  } catch {
    /* ignore */
  }
  return result
}
