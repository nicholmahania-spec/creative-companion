/**
 * Optional quiet progress meter (bands, daily targets, marks).
 * Local-only. Fires `cc-buddy-game` so HUD + Helper stay in sync.
 * Off by default (prefs.showProgress).
 */

const GAME_KEY = 'cc-buddy-game-v1'

/** Soft curve so early levels feel fast; late levels reward consistency */
export const LEVEL_THRESHOLDS = [
  0, 30, 70, 120, 180, 260, 360, 480, 620, 780, 980, 1220, 1500, 1820, 2200,
  2650, 3150, 3750, 4450, 5300, 6300,
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
    name: '3 in a day',
    desc: 'Complete 3 steps in one day',
    icon: '3',
  },
  step_10: {
    id: 'step_10',
    name: '10 steps',
    desc: 'Complete 10 steps all-time',
    icon: '10',
  },
  step_50: {
    id: 'step_50',
    name: '50 steps',
    desc: 'Complete 50 steps all-time',
    icon: '50',
  },
  break_hero: {
    id: 'break_hero',
    name: 'Break done',
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
  pomodoro_25: {
    id: 'pomodoro_25',
    name: 'Deep work',
    desc: 'Complete 25 focus blocks',
    icon: '🧠',
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
    desc: 'Reach level 5',
    icon: '⬆',
  },
  level_10: {
    id: 'level_10',
    name: 'Level 10',
    desc: 'Reach level 10',
    icon: '👑',
  },
  day_streak_3: {
    id: 'day_streak_3',
    name: '3-day streak',
    desc: 'Show up 3 days in a row',
    icon: '📅',
  },
  day_streak_7: {
    id: 'day_streak_7',
    name: '7-day streak',
    desc: '7-day activity streak',
    icon: '7',
  },
  break_kit_3: {
    id: 'break_kit_3',
    name: '3 break items',
    desc: 'Complete 3 Break Kit items',
    icon: '3',
  },
  capture_10: {
    id: 'capture_10',
    name: '10 captures',
    desc: 'Capture 10 tasks',
    icon: '10',
  },
  pin_5: {
    id: 'pin_5',
    name: '5 pins',
    desc: 'Pin 5 ideas',
    icon: '5',
  },
  quest_master: {
    id: 'quest_master',
    name: 'Day list done',
    desc: 'Clear all daily targets in one day',
    icon: '✓',
  },
  combo_5: {
    id: 'combo_5',
    name: '5 in a row',
    desc: 'Complete 5 steps in a row',
    icon: '5',
  },
  daily_goal: {
    id: 'daily_goal',
    name: 'Daily target',
    desc: 'Hit the daily progress target once',
    icon: '·',
  },
  exporter: {
    id: 'exporter',
    name: 'Exported',
    desc: 'Export a project pack',
    icon: '↑',
  },
  helper_friend: {
    id: 'helper_friend',
    name: 'Helper on',
    desc: 'Turn on Helper',
    icon: 'H',
  },
}

/** Daily progress target (optional meter) */
export const DAILY_XP_GOAL = 100

/**
 * Daily targets. Three are picked each calendar day.
 * progress reads game.metrics fields.
 */
export const QUEST_POOL = [
  {
    id: 'q_steps',
    label: 'Complete 3 steps',
    metric: 'todaySteps',
    target: 3,
    bonusXp: 25,
  },
  {
    id: 'q_focus',
    label: 'Finish 1 focus block',
    metric: 'todayPomodoros',
    target: 1,
    bonusXp: 20,
  },
  {
    id: 'q_capture',
    label: 'Capture 2 tasks',
    metric: 'todayCaptures',
    target: 2,
    bonusXp: 15,
  },
  {
    id: 'q_kit',
    label: 'Do 1 break-kit item',
    metric: 'todayBreakKit',
    target: 1,
    bonusXp: 15,
  },
  {
    id: 'q_body',
    label: 'Log water or a break',
    metric: 'todayBody',
    target: 1,
    bonusXp: 12,
  },
  {
    id: 'q_pin',
    label: 'Pin 1 idea',
    metric: 'todayPins',
    target: 1,
    bonusXp: 12,
  },
  {
    id: 'q_xp',
    label: 'Reach 50 points today',
    metric: 'todayXp',
    target: 50,
    bonusXp: 20,
  },
]

const defaultGame = () => ({
  xp: 0,
  level: 1,
  totalSteps: 0,
  totalBreaks: 0,
  totalPomodoros: 0,
  totalCaptures: 0,
  totalPins: 0,
  totalExports: 0,
  waterLogs: 0,
  foodLogs: 0,
  bathroomLogs: 0,
  dayStreak: 0,
  lastActiveDay: '',
  todayKey: '',
  todaySteps: 0,
  todayCaptures: 0,
  todayPins: 0,
  todayPomodoros: 0,
  todayBreakKit: 0,
  todayBody: 0,
  todayXp: 0,
  todayWater: false,
  todayFood: false,
  todayBathroom: false,
  totalBreakKit: 0,
  combo: 0,
  bestCombo: 0,
  lastStepAt: 0,
  questIds: [],
  questClaimed: [],
  dailyGoalClaimed: false,
  badges: [],
  recent: [],
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
  ].slice(0, 10)
}

/** Deterministic 3 quests per calendar day */
export function pickDailyQuests(key = dayKey()) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const pool = [...QUEST_POOL]
  const picked = []
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = h % pool.length
    picked.push(pool[idx].id)
    pool.splice(idx, 1)
    h = (h * 17 + 13) >>> 0
  }
  return picked
}

function ensureQuests(game) {
  if (!game.questIds?.length || game.questIds.length !== 3) {
    game.questIds = pickDailyQuests(game.todayKey || dayKey())
    game.questClaimed = []
  }
  return game
}

function rollDay(game) {
  const today = dayKey()
  if (game.todayKey === today) return ensureQuests(game)
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  if (game.lastActiveDay === yesterday) {
    game.dayStreak = (game.dayStreak || 0) + 1
  } else if (game.lastActiveDay !== today) {
    game.dayStreak = 1
  }
  game.lastActiveDay = today
  game.todayKey = today
  game.todaySteps = 0
  game.todayCaptures = 0
  game.todayPins = 0
  game.todayPomodoros = 0
  game.todayBreakKit = 0
  game.todayBody = 0
  game.todayXp = 0
  game.todayWater = false
  game.todayFood = false
  game.todayBathroom = false
  game.combo = 0
  game.questIds = pickDailyQuests(today)
  game.questClaimed = []
  game.dailyGoalClaimed = false
  return game
}

function metricValue(game, metric) {
  return Number(game[metric]) || 0
}

export function questStatus(game = loadGame()) {
  const g = ensureQuests(rollDay({ ...game }))
  return (g.questIds || []).map((id) => {
    const def = QUEST_POOL.find((q) => q.id === id)
    if (!def) return null
    const progress = metricValue(g, def.metric)
    const done = progress >= def.target
    const claimed = (g.questClaimed || []).includes(id)
    return {
      ...def,
      progress: Math.min(progress, def.target),
      done,
      claimed,
    }
  }).filter(Boolean)
}

function claimQuests(game, badgesUnlocked, messages) {
  let bonus = 0
  const status = questStatus(game)
  for (const q of status) {
    if (q.done && !q.claimed) {
      game.questClaimed = [...(game.questClaimed || []), q.id]
      bonus += q.bonusXp
      pushRecent(game, q.label, q.bonusXp)
      messages.push(`Done: ${q.label} · +${q.bonusXp}`)
    }
  }
  const allClaimed =
    (game.questIds || []).length > 0 &&
    (game.questIds || []).every((id) => (game.questClaimed || []).includes(id))
  if (allClaimed) {
    const b = unlockBadge(game, 'quest_master')
    if (b) badgesUnlocked.push(b)
  }
  return bonus
}

/**
 * Award XP for an action.
 * @returns {{ game, gained, levelUp, badgesUnlocked, messages, combo, progress, quests }}
 */
export function award(action, meta = {}) {
  let game = rollDay(loadGame())
  let gained = 0
  const badgesUnlocked = []
  const messages = []
  let comboBonus = 0

  switch (action) {
    case 'step_complete': {
      // Combo: steps within 45 min stack
      const now = Date.now()
      if (game.lastStepAt && now - game.lastStepAt < 45 * 60 * 1000) {
        game.combo = (game.combo || 0) + 1
      } else {
        game.combo = 1
      }
      game.lastStepAt = now
      game.bestCombo = Math.max(game.bestCombo || 0, game.combo)
      comboBonus = Math.min(10, Math.max(0, (game.combo - 1) * 3))
      gained += 15 + comboBonus
      game.totalSteps = (game.totalSteps || 0) + 1
      game.todaySteps = (game.todaySteps || 0) + 1
      pushRecent(
        game,
        comboBonus
          ? `Step · ${game.combo}x combo (+${comboBonus})`
          : 'Step complete',
        15 + comboBonus
      )
      {
        const b = unlockBadge(game, 'first_step')
        if (b) badgesUnlocked.push(b)
      }
      if (game.todaySteps >= 3) {
        const b = unlockBadge(game, 'step_streak_3')
        if (b) badgesUnlocked.push(b)
      }
      if (game.totalSteps >= 10) {
        const b = unlockBadge(game, 'step_10')
        if (b) badgesUnlocked.push(b)
      }
      if (game.totalSteps >= 50) {
        const b = unlockBadge(game, 'step_50')
        if (b) badgesUnlocked.push(b)
      }
      if (game.combo >= 5) {
        const b = unlockBadge(game, 'combo_5')
        if (b) badgesUnlocked.push(b)
      }
      break
    }
    case 'task_capture':
      gained += 5
      game.totalCaptures = (game.totalCaptures || 0) + 1
      game.todayCaptures = (game.todayCaptures || 0) + 1
      pushRecent(game, meta.label || 'Task captured', 5)
      if (game.totalCaptures >= 10) {
        const b = unlockBadge(game, 'capture_10')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'mood_pin':
      gained += 8
      game.totalPins = (game.totalPins || 0) + 1
      game.todayPins = (game.todayPins || 0) + 1
      pushRecent(game, meta.label || 'Idea pinned', 8)
      if (game.totalPins >= 5) {
        const b = unlockBadge(game, 'pin_5')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'focus_start':
      gained += 3
      pushRecent(game, 'Focus started', 3)
      break
    case 'break_complete':
      gained += 25
      game.totalBreaks = (game.totalBreaks || 0) + 1
      game.todayBody = (game.todayBody || 0) + 1
      game.combo = 0 // rest resets combo intentionally
      pushRecent(game, 'Required break finished', 25)
      {
        const b = unlockBadge(game, 'break_hero')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'pomodoro_work':
      gained += 20
      game.totalPomodoros = (game.totalPomodoros || 0) + 1
      game.todayPomodoros = (game.todayPomodoros || 0) + 1
      pushRecent(game, 'Pomodoro work block', 20)
      if (game.totalPomodoros >= 5) {
        const b = unlockBadge(game, 'pomodoro_5')
        if (b) badgesUnlocked.push(b)
      }
      if (game.totalPomodoros >= 25) {
        const b = unlockBadge(game, 'pomodoro_25')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'water':
      gained += 5
      game.waterLogs = (game.waterLogs || 0) + 1
      game.todayWater = true
      game.todayBody = (game.todayBody || 0) + 1
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
      game.todayBody = (game.todayBody || 0) + 1
      pushRecent(game, 'Food logged', 5)
      break
    case 'bathroom':
      gained += 5
      game.bathroomLogs = (game.bathroomLogs || 0) + 1
      game.todayBathroom = true
      game.todayBody = (game.todayBody || 0) + 1
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
    case 'break_kit':
      gained += 8
      game.totalBreakKit = (game.totalBreakKit || 0) + 1
      game.todayBreakKit = (game.todayBreakKit || 0) + 1
      game.todayBody = (game.todayBody || 0) + 1
      pushRecent(game, meta.label || 'Break kit item', 8)
      if (game.totalBreakKit >= 3) {
        const b = unlockBadge(game, 'break_kit_3')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'brand_edit':
      gained += 6
      pushRecent(game, meta.label || 'Brand updated', 6)
      break
    case 'concept_lock':
      gained += 15
      pushRecent(game, meta.label || 'Concept locked', 15)
      break
    case 'export_pack':
      gained += 20
      game.totalExports = (game.totalExports || 0) + 1
      pushRecent(game, 'Project pack exported', 20)
      {
        const b = unlockBadge(game, 'exporter')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'helper_on':
      gained += 5
      pushRecent(game, 'Helper on', 5)
      {
        const b = unlockBadge(game, 'helper_friend')
        if (b) badgesUnlocked.push(b)
      }
      break
    case 'breakdown':
      gained += 18
      pushRecent(game, meta.label || 'Project broken down', 18)
      break
    case 'project_create':
      gained += 12
      pushRecent(game, meta.label || 'New project', 12)
      break
    case 'micro_steps':
      gained += 10
      pushRecent(game, 'Micro-steps added', 10)
      break
    default:
      break
  }

  // Quest bonuses (after metrics updated)
  const questBonus = claimQuests(game, badgesUnlocked, messages)
  gained += questBonus

  if (game.todayWater && game.todayFood && game.todayBathroom) {
    const b = unlockBadge(game, 'full_body')
    if (b) badgesUnlocked.push(b)
  }
  if (game.dayStreak >= 3) {
    const b = unlockBadge(game, 'day_streak_3')
    if (b) badgesUnlocked.push(b)
  }
  if (game.dayStreak >= 7) {
    const b = unlockBadge(game, 'day_streak_7')
    if (b) badgesUnlocked.push(b)
  }

  // Daily XP goal bonus (once)
  game.todayXp = (game.todayXp || 0) + gained
  if (!game.dailyGoalClaimed && game.todayXp >= DAILY_XP_GOAL) {
    game.dailyGoalClaimed = true
    const goalBonus = 30
    gained += goalBonus
    game.todayXp += goalBonus
    pushRecent(game, 'Daily target hit', goalBonus)
    messages.push(`Daily target · +${goalBonus}`)
    const b = unlockBadge(game, 'daily_goal')
    if (b) badgesUnlocked.push(b)
  }

  const prevLevel = game.level || 1
  game.xp = (game.xp || 0) + gained
  game.level = levelFromXp(game.xp)
  if (game.level >= 5) {
    const b = unlockBadge(game, 'level_5')
    if (b) badgesUnlocked.push(b)
  }
  if (game.level >= 10) {
    const b = unlockBadge(game, 'level_10')
    if (b) badgesUnlocked.push(b)
  }

  const levelUp = game.level > prevLevel
  if (levelUp) {
    messages.push(`Band ${game.level}`)
  }
  if (gained > 0 && action !== 'check_in') {
    const comboBit =
      action === 'step_complete' && game.combo > 1
        ? ` · ×${game.combo}`
        : ''
    messages.push(
      `+${gained}${meta.label ? ` · ${meta.label}` : ''}${comboBit}`
    )
  }
  for (const b of badgesUnlocked) {
    messages.push(`${b.name}`)
  }

  saveGame(game)
  return {
    game,
    gained,
    levelUp,
    newLevel: game.level,
    badgesUnlocked,
    messages,
    combo: game.combo || 0,
    progress: xpProgress(game.xp),
    quests: questStatus(game),
  }
}

export function gameSummaryLine(game = loadGame()) {
  const p = xpProgress(game.xp)
  return `Band ${p.level} · ${game.xp} · ${game.dayStreak || 0}d · today ${game.todayXp || 0}/${DAILY_XP_GOAL}`
}

export function dailyGoalProgress(game = loadGame()) {
  const g = rollDay({ ...loadGame(), ...game })
  const xp = g.todayXp || 0
  return {
    xp,
    goal: DAILY_XP_GOAL,
    percent: Math.min(100, Math.round((xp / DAILY_XP_GOAL) * 100)),
    done: xp >= DAILY_XP_GOAL,
  }
}

/** Award XP and notify HUD + buddy */
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

/** Passive tick so HUD refreshes day rollover */
export function refreshGameDay() {
  const game = rollDay(loadGame())
  saveGame(game)
  return game
}
