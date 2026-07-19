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

/**
 * Map unordered palette swatches to roles for System artboard / pack cover.
 * Never assumes palette[0] is cover-safe.
 */
export function mapPaletteRoles(palette = []) {
  const colors = (palette || []).map((c) => normalizeHex(c)).filter(Boolean)
  if (!colors.length) {
    return {
      cover: '#1C1917',
      text: '#0C0A09',
      accent: '#0F766E',
      quiet: '#F5F5F4',
      background: '#FAFAF9',
      swatches: [],
    }
  }
  const scored = colors
    .map((hex) => ({ hex, L: relativeLuminance(hex) }))
    .sort((a, b) => a.L - b.L)
  const darkest = scored[0].hex
  const lightest = scored[scored.length - 1].hex
  // Cover: darkest that still allows readable text, else darkest overall
  let cover = darkest
  for (const s of scored) {
    if (s.L <= 0.35) {
      cover = s.hex
      break
    }
  }
  // Accent: mid luminance if available
  const mid = scored[Math.floor(scored.length / 2)]?.hex || darkest
  return {
    cover,
    text: darkest,
    accent: mid,
    quiet: lightest,
    background: lightest,
    swatches: colors,
  }
}

/**
 * Curated type pairs — real CSS stacks (Google Fonts + system fallbacks).
 * Prefer these over free-text so the pack specimen looks intentional.
 */
export const TYPE_PAIRS = [
  {
    id: 'jakarta',
    label: 'Plus Jakarta — modern sans',
    heading: 'Plus Jakarta Sans Bold',
    body: 'Plus Jakarta Sans Regular',
  },
  {
    id: 'fraunces-jakarta',
    label: 'Fraunces + Jakarta — soft display',
    heading: 'Fraunces SemiBold',
    body: 'Plus Jakarta Sans Regular',
  },
  {
    id: 'libre-source',
    label: 'Libre Baskerville + Source Sans — editorial',
    heading: 'Libre Baskerville Bold',
    body: 'Source Sans 3 Regular',
  },
  {
    id: 'space-dm',
    label: 'Space Grotesk + DM Sans — product',
    heading: 'Space Grotesk Bold',
    body: 'DM Sans Regular',
  },
  {
    id: 'playfair-lato',
    label: 'Playfair + Lato — classic brand',
    heading: 'Playfair Display Bold',
    body: 'Lato Regular',
  },
  {
    id: 'system',
    label: 'System UI — native',
    heading: 'System UI Bold',
    body: 'System UI Regular',
  },
]

/** Match stored labels to a curated pair id, or null */
export function typePairIdFromLabels(heading, body) {
  const h = String(heading || '').trim()
  const b = String(body || '').trim()
  const found = TYPE_PAIRS.find((p) => p.heading === h && p.body === b)
  return found?.id || null
}

/** "Plus Jakarta Sans Bold" → CSS font-family stack for specimens */
export function fontFamilyFromLabel(label) {
  const s = String(label || '')
    .replace(/\s+(Thin|ExtraLight|Light|Regular|Medium|SemiBold|Semibold|Bold|ExtraBold|Black|Italic|Oblique).*$/i, '')
    .trim()
  if (!s) return 'var(--font-sans), system-ui, sans-serif'
  const lower = s.toLowerCase()
  if (lower.includes('system ui') || lower === 'system') {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }
  if (lower.includes('source sans')) {
    return '"Source Sans 3", "Source Sans Pro", var(--font-sans), system-ui, sans-serif'
  }
  return `"${s.replace(/"/g, '')}", var(--font-sans), system-ui, sans-serif`
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
