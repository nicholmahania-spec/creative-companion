/**
 * Terminal output. Small on purpose — no dependency for what is a few escape
 * codes and a column-width calculation.
 *
 * The copy rules from the app apply here too: a missing answer is reported as
 * missing, never filled with a placeholder, and nothing waiting on someone else
 * is coloured like an alarm.
 */

const noColor =
  !!process.env.NO_COLOR ||
  process.env.TERM === 'dumb' ||
  !process.stdout.isTTY

const wrap = (open, close) => (s) =>
  noColor ? String(s) : `\u001b[${open}m${s}\u001b[${close}m`

export const c = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  blue: wrap(34, 39),
  magenta: wrap(35, 39),
  cyan: wrap(36, 39),
  grey: wrap(90, 39),
}

/** A swatch block in the colour itself, so a palette can be read at a glance. */
export function swatch(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m || noColor) return '  '
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `\u001b[48;2;${r};${g};${b}m  \u001b[49m`
}

export const tick = () => c.green('✓')
export const cross = () => c.red('✗')
/* Not a warning triangle and not red: an unanswered question is a gap, not a
   failure, and the audience for this tool is the one that red badges hurt. */
export const gap = () => c.yellow('·')

export function heading(text) {
  return `\n${c.bold(text)}\n${c.grey('─'.repeat(Math.min(text.length, 60)))}`
}

/**
 * Visible width, ignoring the escape codes so columns still line up.
 *
 * The control character is the point: this strips SGR sequences, and those are
 * defined as starting with ESC. `no-control-regex` is right in general and
 * wrong here, so it is silenced at the single line it applies to.
 */
// eslint-disable-next-line no-control-regex -- matching ESC is the whole job
const width = (s) => String(s).replace(/\u001b\[[0-9;]*m/g, '').length

export function pad(s, n, align = 'left') {
  const fill = ' '.repeat(Math.max(0, n - width(s)))
  return align === 'right' ? fill + s : s + fill
}

/**
 * Column widths come from the rows as well as the headers, so `table([], rows)`
 * — a headerless list, which most of these are — still lines up. Deriving the
 * count from `headers` alone silently produced zero columns and no padding.
 *
 * @param {string[]} headers  pass [] for a headerless table
 * @param {Array<string[]>} rows
 */
export function table(headers, rows) {
  const count = Math.max(headers.length, ...rows.map((r) => r.length), 0)
  const cols = Array.from({ length: count }, (_, i) =>
    Math.max(width(headers[i] ?? ''), ...rows.map((r) => width(r[i] ?? '')), 0)
  )
  const line = (cells, colour = (x) => x) =>
    cols
      .map((w, i) => pad(colour(cells[i] ?? ''), w))
      .join('  ')
      .trimEnd()
  return [
    ...(headers.length ? [line(headers, c.grey)] : []),
    ...rows.map((r) => line(r)),
  ].join('\n')
}

/** Word-wrap free text so a long brief does not run off the screen. */
export function wrapText(text, indent = '  ', max = 76) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ')
  if (!words[0]) return ''
  const lines = []
  let line = ''
  for (const w of words) {
    if (line && (line + ' ' + w).length > max - indent.length) {
      lines.push(indent + line)
      line = w
    } else {
      line = line ? `${line} ${w}` : w
    }
  }
  if (line) lines.push(indent + line)
  return lines.join('\n')
}

/** A value, or an explicit statement that there isn't one. */
export function orMissing(value, missing = 'not set yet') {
  const s = String(value ?? '').trim()
  return s ? s : c.grey(missing)
}

export function bar(done, total, length = 16) {
  if (!total) return c.grey('—')
  const filled = Math.round((done / total) * length)
  return (
    c.green('█'.repeat(filled)) +
    c.grey('░'.repeat(Math.max(0, length - filled)))
  )
}

export function bytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
