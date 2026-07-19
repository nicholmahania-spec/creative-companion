/** Color helpers for palette builder + WCAG contrast checker */

export const DEFAULT_PALETTE = ['#4F46E5', '#0D9488', '#0B1220', '#F4F5F9']

export function normalizeHex(input) {
  if (!input) return null
  let h = String(input).trim()
  if (!h.startsWith('#')) h = `#${h}`
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return null
  return h.toUpperCase()
}

function channelToLinear(c) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex) {
  const h = normalizeHex(hex)
  if (!h) return 0
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  const R = channelToLinear(r)
  const G = channelToLinear(g)
  const B = channelToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

export function contrastRatio(hexA, hexB) {
  const L1 = relativeLuminance(hexA)
  const L2 = relativeLuminance(hexB)
  const lighter = Math.max(L1, L2)
  const darker = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function formatRatio(ratio) {
  return `${ratio.toFixed(2)}:1`
}

/** WCAG 2.1 thresholds */
export function contrastGrade(ratio) {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    ui: ratio >= 3,
  }
}

export function gradeLabel(grade) {
  if (grade.aaaNormal) return { text: 'AAA', level: 'pass-aaa' }
  if (grade.aaNormal) return { text: 'AA', level: 'pass-aa' }
  if (grade.aaLarge) return { text: 'AA large', level: 'pass-large' }
  return { text: 'Fail', level: 'fail' }
}

export function bestTextOn(bgHex) {
  const white = contrastRatio('#FFFFFF', bgHex)
  const black = contrastRatio('#0B1220', bgHex)
  return white >= black ? '#FFFFFF' : '#0B1220'
}

export function buildPairChecks(palette, bgHex) {
  const bg = normalizeHex(bgHex) || '#FFFFFF'
  return (palette || [])
    .map((hex, i) => {
      const fg = normalizeHex(hex)
      if (!fg || fg === bg) return null
      const ratio = contrastRatio(fg, bg)
      const grade = contrastGrade(ratio)
      return {
        index: i,
        fg,
        bg,
        ratio,
        grade,
        label: gradeLabel(grade),
      }
    })
    .filter(Boolean)
}
