/**
 * Break Kit — personal micro-tasks for forced Pomodoro breaks.
 * Todos, meds, errands, care habits… packed into the break window.
 */

export const BREAK_KINDS = [
  {
    id: 'med',
    label: 'Med',
    icon: '💊',
    defaultMinutes: 2,
    recurring: true,
    hint: 'Pills, drops, inhaler',
  },
  {
    id: 'care',
    label: 'Care',
    icon: '♡',
    defaultMinutes: 3,
    recurring: true,
    hint: 'Stretch, snack, eyes',
  },
  {
    id: 'todo',
    label: 'To-do',
    icon: '✓',
    defaultMinutes: 5,
    recurring: false,
    hint: 'One small life task',
  },
  {
    id: 'task',
    label: 'Task',
    icon: '☰',
    defaultMinutes: 5,
    recurring: false,
    hint: 'Quick non-desk task',
  },
  {
    id: 'errand',
    label: 'Errand',
    icon: '→',
    defaultMinutes: 5,
    recurring: false,
    hint: 'Text, pay, reply',
  },
  {
    id: 'habit',
    label: 'Habit',
    icon: '↻',
    defaultMinutes: 3,
    recurring: true,
    hint: 'Daily micro-habit',
  },
]

export function kindMeta(kind) {
  return BREAK_KINDS.find((k) => k.id === kind) || BREAK_KINDS[2]
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

/** One-shot done forever, or recurring not yet done today */
export function isBreakItemOpen(item, now = new Date()) {
  if (!item || item.archived) return false
  if (item.completed) return false
  if (item.recurring) {
    const last = item.lastDoneAt ? String(item.lastDoneAt).slice(0, 10) : ''
    return last !== dayKey(now)
  }
  return true
}

export function openBreakItems(items = [], now = new Date()) {
  return (items || []).filter((i) => isBreakItemOpen(i, now))
}

/**
 * Pack open items into a break window.
 * Priority: med → care → shorter first (fit more) → rest.
 * Leaves ~1 min slack so the list feels doable.
 */
export function pickBreakPlan(items = [], breakMinutes = 5, now = new Date()) {
  const budget = Math.max(2, Math.floor(Number(breakMinutes) || 5) - 1)
  const open = openBreakItems(items, now)
  const priority = { med: 0, care: 1, habit: 2, todo: 3, task: 4, errand: 5 }
  const sorted = [...open].sort((a, b) => {
    const pa = priority[a.kind] ?? 9
    const pb = priority[b.kind] ?? 9
    if (pa !== pb) return pa - pb
    return (a.minutes || 3) - (b.minutes || 3)
  })

  const plan = []
  let used = 0
  for (const item of sorted) {
    const m = Math.max(1, Math.min(20, Number(item.minutes) || 3))
    if (used + m > budget && plan.length > 0) continue
    if (used + m > budget + 1) continue
    plan.push({ ...item, minutes: m })
    used += m
    if (used >= budget) break
  }

  // Always offer at least generic body care if kit empty
  if (plan.length === 0) {
    return {
      items: [],
      usedMinutes: 0,
      budgetMinutes: budget,
      empty: true,
      fallback: [
        { id: '_water', title: 'Drink a full glass of water', kind: 'care', minutes: 2 },
        { id: '_stand', title: 'Stand up and stretch 30 seconds', kind: 'care', minutes: 1 },
        { id: '_eyes', title: 'Look at something far away', kind: 'care', minutes: 1 },
      ],
    }
  }

  return {
    items: plan,
    usedMinutes: used,
    budgetMinutes: budget,
    empty: false,
    fallback: [],
  }
}

export function breakPlanCopy(plan, breakMinutes) {
  if (!plan || plan.empty) {
    return {
      headline: 'Use this break for your body',
      sub: `~${breakMinutes} min · add your own meds & to-dos in Little Helper → More → Break kit`,
    }
  }
  const n = plan.items.length
  return {
    headline:
      n === 1
        ? 'One thing for this break'
        : `${n} things that fit this break`,
    sub: `About ${plan.usedMinutes} of ${breakMinutes} min · check them off as you go`,
  }
}

/** Empty by default — user adds real meds / to-dos */
export const seedBreakKit = []

export function createBreakItem({
  title,
  kind = 'todo',
  minutes,
  notes = '',
  recurring,
}) {
  const meta = kindMeta(kind)
  const t = String(title || '').trim()
  if (!t) return null
  const rec =
    typeof recurring === 'boolean' ? recurring : Boolean(meta.recurring)
  return {
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: t.slice(0, 120),
    kind: meta.id,
    minutes: Math.max(
      1,
      Math.min(20, Number(minutes) || meta.defaultMinutes || 3)
    ),
    notes: String(notes || '').slice(0, 200),
    recurring: rec,
    completed: false,
    lastDoneAt: null,
    archived: false,
    createdAt: new Date().toISOString(),
  }
}
