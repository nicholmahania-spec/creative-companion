/**
 * Private work clock ranges — hours from project.workLog only.
 * Never invents hours; never reads timeLog (invoice stays hand-entered).
 */

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const MONTH_LETTERS = [
  'J',
  'F',
  'M',
  'A',
  'M',
  'J',
  'J',
  'A',
  'S',
  'O',
  'N',
  'D',
]

/** Range tabs for Home / desk hours views */
export const HOURS_RANGES = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
]

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function parseLogDate(isoDate) {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function collectRows(workLog = []) {
  const rows = []
  for (const row of workLog) {
    if (!row?.date || !(Number(row.hours) > 0)) continue
    const d = parseLogDate(row.date)
    if (!d) continue
    rows.push({ d, hours: Number(row.hours) || 0 })
  }
  return rows
}

/**
 * Full bar height in the chart track (px). A full bar means “about a solid
 * half-day on that bucket,” not “the only day you touched the clock.”
 * Relative-only max scaling made 0.2h look like a full working day.
 */
const BAR_TRACK_PX = 56
/** Hours that map to a full bar. Days busier than this still max out. */
const BAR_FULL_HOURS = 4

function bucketsFromHours(hoursArr, labels) {
  const peak = Math.max(...hoursArr, 0)
  /* Scale against the busier of peak day and a real work floor — thin weeks
     stay short stubs; busy days still rank against each other. */
  const scale = Math.max(peak, BAR_FULL_HOURS)
  const total = hoursArr.reduce((a, b) => a + b, 0)
  return {
    total,
    buckets: hoursArr.map((h, i) => ({
      key: `${labels[i]}-${i}`,
      label: labels[i],
      hours: h,
      hPx:
        h > 0
          ? Math.max(4, Math.min(BAR_TRACK_PX, Math.round((h / scale) * BAR_TRACK_PX)))
          : 2,
      fill: h > 0,
    })),
  }
}

/**
 * Hours per weekday for the current local week (Sun–Sat).
 * Kept for Desk "This week" strip.
 */
export function weekFromWorkLog(workLog = [], now = new Date()) {
  const { total, buckets } = hoursForRange(workLog, 'week', now)
  return {
    total,
    days: buckets.map((b) => ({
      day: b.label,
      date: b.date,
      isToday: b.isToday,
      hours: b.hours,
      hPx: b.hPx,
      fill: b.fill,
    })),
  }
}

/**
 * Hours for a named range, with bar buckets for a simple chart.
 *
 * @param {{date?: string, hours?: number}[]} workLog
 * @param {'day'|'week'|'month'|'year'|'all'} range
 * @param {Date} [now]
 * @returns {{
 *   total: number,
 *   rangeLabel: string,
 *   buckets: { key: string, label: string, hours: number, hPx: number, fill: boolean }[]
 * }}
 */
export function hoursForRange(workLog = [], range = 'week', now = new Date()) {
  const rows = collectRows(workLog)
  const empty = (rangeLabel, labels) => ({
    total: 0,
    rangeLabel,
    buckets: labels.map((label, i) => ({
      key: `${label}-${i}`,
      label,
      hours: 0,
      hPx: 2,
      fill: false,
    })),
  })

  if (range === 'day') {
    const today = startOfLocalDay(now)
    const total = rows
      .filter((r) => startOfLocalDay(r.d) === today)
      .reduce((a, r) => a + r.hours, 0)
    const dayScale = Math.max(total, BAR_FULL_HOURS)
    return {
      total,
      rangeLabel: 'Today',
      buckets: [
        {
          key: 'today',
          label: 'Today',
          hours: total,
          hPx:
            total > 0
              ? Math.max(
                  4,
                  Math.min(
                    BAR_TRACK_PX,
                    Math.round((total / dayScale) * BAR_TRACK_PX)
                  )
                )
              : 2,
          fill: total > 0,
        },
      ],
    }
  }

  if (range === 'week') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start.setDate(start.getDate() - start.getDay())
    const hours = Array(7).fill(0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    for (const r of rows) {
      if (r.d < start || r.d >= end) continue
      hours[r.d.getDay()] += r.hours
    }
    const shaped = bucketsFromHours(hours, WEEKDAY_LETTERS)
    /* Carry the actual date of each column.
       `S M T W T F S` alone is not a week — it is the same seven letters
       every week of the year, with two identical `T`s and two identical
       `S`s, so nothing on the strip said WHICH week or which column was
       today. The letters stay (they fit the 340px rail); the date rides
       alongside so the column can be identified. */
    return {
      ...shaped,
      rangeLabel: 'This week',
      buckets: shaped.buckets.map((b, i) => {
        const d = new Date(start)
        d.setDate(d.getDate() + i)
        return {
          ...b,
          date: d.getDate(),
          isToday: startOfLocalDay(d) === startOfLocalDay(now),
        }
      }),
    }
  }

  if (range === 'month') {
    const y = now.getFullYear()
    const m = now.getMonth()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const hours = Array(daysInMonth).fill(0)
    for (const r of rows) {
      if (r.d.getFullYear() !== y || r.d.getMonth() !== m) continue
      hours[r.d.getDate() - 1] += r.hours
    }
    const labels = hours.map((_, i) => String(i + 1))
    const shaped = bucketsFromHours(hours, labels)
    const monthName = now.toLocaleString(undefined, { month: 'long' })
    return { ...shaped, rangeLabel: monthName }
  }

  if (range === 'year') {
    const y = now.getFullYear()
    const hours = Array(12).fill(0)
    for (const r of rows) {
      if (r.d.getFullYear() !== y) continue
      hours[r.d.getMonth()] += r.hours
    }
    const shaped = bucketsFromHours(hours, MONTH_LETTERS)
    return { ...shaped, rangeLabel: String(y) }
  }

  // all time — by year; if single year only, fall back to months of that year
  if (rows.length === 0) {
    return empty('All time', ['—'])
  }
  const byYear = new Map()
  for (const r of rows) {
    const y = r.d.getFullYear()
    byYear.set(y, (byYear.get(y) || 0) + r.hours)
  }
  const years = [...byYear.keys()].sort((a, b) => a - b)
  if (years.length === 1) {
    const y = years[0]
    const hours = Array(12).fill(0)
    for (const r of rows) {
      if (r.d.getFullYear() !== y) continue
      hours[r.d.getMonth()] += r.hours
    }
    const shaped = bucketsFromHours(hours, MONTH_LETTERS)
    return { ...shaped, rangeLabel: `All time · ${y}` }
  }
  const hours = years.map((y) => byYear.get(y) || 0)
  const labels = years.map(String)
  const shaped = bucketsFromHours(hours, labels)
  return { ...shaped, rangeLabel: 'All time' }
}

/** Flatten workLog rows from many projects (studio-wide). */
export function workLogsFromProjects(projects = []) {
  const out = []
  for (const p of projects) {
    for (const row of p?.workLog || []) {
      out.push(row)
    }
  }
  return out
}

/** Round total for display, e.g. 16 or 16.5 — prefer hoursLoggedWords for UI. */
export function formatHoursWorked(total) {
  const n = Number(total) || 0
  if (n <= 0) return '0'
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

/**
 * Words-first readout for the work clock (owner is time-blind; raw 0.2h
 * does not register and looks like failure next to a tall bar).
 */
export function hoursLoggedWords(total) {
  const n = Number(total) || 0
  if (n <= 0) return 'No hours logged this week'
  if (n < 0.5) return 'A little on the clock'
  if (n < 2) return 'Some time logged'
  if (n < 6) return 'A solid stretch logged'
  return 'A full week on the clock'
}
