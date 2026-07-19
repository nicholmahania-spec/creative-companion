/** Simple date helpers for deadlines + calendar */

export function toISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(isoOrDate, days) {
  const d =
    typeof isoOrDate === 'string' ? parseISODate(isoOrDate) : new Date(isoOrDate)
  if (!d) return null
  const n = new Date(d)
  n.setDate(n.getDate() + days)
  return toISODate(n)
}

export function daysUntil(iso) {
  const target = parseISODate(iso)
  if (!target) return null
  const today = parseISODate(toISODate())
  const ms = target.getTime() - today.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function formatShortDate(iso) {
  const d = parseISODate(iso)
  if (!d) return ''
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMonthYear(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

/** Build month grid cells: { date: ISO|null, inMonth: boolean }[] */
export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay() // 0 Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, inMonth: false, day: null })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      date: toISODate(new Date(year, monthIndex, day)),
      inMonth: true,
      day,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, inMonth: false, day: null })
  }
  return cells
}

export function deadlineUrgency(iso) {
  const n = daysUntil(iso)
  if (n == null) return null
  if (n < 0) return 'overdue'
  if (n === 0) return 'today'
  if (n <= 3) return 'soon'
  if (n <= 14) return 'upcoming'
  return 'later'
}

export function urgencyLabel(iso) {
  const n = daysUntil(iso)
  if (n == null) return ''
  if (n < 0) return `${Math.abs(n)}d overdue`
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  return `${n}d left`
}
