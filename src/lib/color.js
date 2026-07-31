/** Color helpers for palette builder + WCAG contrast checker */

/** Stone desk defaults — brand color lives on pack, not indigo SaaS */
export const DEFAULT_PALETTE = ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9']

/** @deprecated alias — same as DEFAULT_PALETTE */
export const STONE_PALETTE = DEFAULT_PALETTE

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
  // Text renders on top of Cover, so it must contrast against Cover — not
  // just be "the darkest swatch," which collapses to the same hex as Cover
  // whenever the palette's darkest color is chosen for both roles.
  const text = bestTextOn(cover)
  return {
    cover,
    text,
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
    // Already loaded app-wide via index.html — no separate fetch needed.
    googleCss: null,
  },
  {
    id: 'fraunces-jakarta',
    label: 'Fraunces + Jakarta — soft display',
    heading: 'Fraunces SemiBold',
    body: 'Plus Jakarta Sans Regular',
    googleCss:
      'https://fonts.googleapis.com/css2?family=Fraunces:wght@600&display=swap',
  },
  {
    id: 'libre-source',
    label: 'Libre Baskerville + Source Sans — editorial',
    heading: 'Libre Baskerville Bold',
    body: 'Source Sans 3 Regular',
    googleCss:
      'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@700&family=Source+Sans+3:wght@400&display=swap',
  },
  {
    id: 'space-dm',
    label: 'Space Grotesk + DM Sans — product',
    heading: 'Space Grotesk Bold',
    body: 'DM Sans Regular',
    googleCss:
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=DM+Sans:wght@400&display=swap',
  },
  {
    id: 'playfair-lato',
    label: 'Playfair + Lato — classic brand',
    heading: 'Playfair Display Bold',
    body: 'Lato Regular',
    googleCss:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Lato:wght@400&display=swap',
  },
  {
    id: 'system',
    label: 'System UI — native',
    heading: 'System UI Bold',
    body: 'System UI Regular',
    // Native stack — nothing to fetch.
    googleCss: null,
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

/* ── RGB / HSL for tints, AA nudge, extraction ─────────────────── */

export function hexToRgb(hex) {
  const h = normalizeHex(hex)
  if (!h) return null
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  }
}

export function formatRgb(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return ''
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`
}

export function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)))
  const to = (n) => clamp(n).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

/** @returns {{ h: number, s: number, l: number } | null} h 0–360, s/l 0–1 */
export function hexToHsl(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

export function hslToHex(h, s, l) {
  const hh = ((h % 360) + 360) % 360
  const ss = Math.max(0, Math.min(1, s))
  const ll = Math.max(0, Math.min(1, l))
  if (ss === 0) {
    const v = Math.round(ll * 255)
    return rgbToHex(v, v, v)
  }
  const hue2rgb = (p, q, t) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss
  const p = 2 * ll - q
  const hk = hh / 360
  const r = hue2rgb(p, q, hk + 1 / 3)
  const g = hue2rgb(p, q, hk)
  const b = hue2rgb(p, q, hk - 1 / 3)
  return rgbToHex(r * 255, g * 255, b * 255)
}

/**
 * Tints (toward white) + base + shades (toward black).
 * Default steps=2 → 5 swatches (2 tints, base, 2 shades).
 */
export function tintsAndShades(hex, { steps = 2 } = {}) {
  const hsl = hexToHsl(hex)
  const base = normalizeHex(hex)
  if (!hsl || !base) return []
  const out = []
  for (let i = steps; i >= 1; i--) {
    const l = Math.min(0.97, hsl.l + ((1 - hsl.l) * i) / (steps + 1))
    out.push(hslToHex(hsl.h, hsl.s * (1 - i * 0.08), l))
  }
  out.push(base)
  for (let i = 1; i <= steps; i++) {
    const l = Math.max(0.04, hsl.l * (1 - i / (steps + 1)))
    out.push(hslToHex(hsl.h, Math.min(1, hsl.s * (1 + i * 0.05)), l))
  }
  return out
}

/** Euclidean RGB distance 0–~441 */
export function colorDistance(a, b) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  if (!A || !B) return 999
  return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b)
}

/** Drop near-duplicates; keep order of first occurrence. */
export function dedupePalette(colors = [], { minDistance = 28, max = 8 } = {}) {
  const out = []
  for (const raw of colors) {
    const hex = normalizeHex(raw)
    if (!hex) continue
    if (out.some((c) => colorDistance(c, hex) < minDistance)) continue
    out.push(hex)
    if (out.length >= max) break
  }
  return out
}

/**
 * Nudge foreground lightness until WCAG ratio vs background is met.
 * @returns {{ hex: string, ratio: number, changed: boolean } | null}
 */
export function nudgeHexForContrast(fgHex, bgHex, targetRatio = 4.5) {
  const fg = normalizeHex(fgHex)
  const bg = normalizeHex(bgHex)
  if (!fg || !bg) return null
  const current = contrastRatio(fg, bg)
  if (current >= targetRatio) {
    return { hex: fg, ratio: current, changed: false }
  }
  const hsl = hexToHsl(fg)
  if (!hsl) return null

  const tryL = (l) => {
    const hex = hslToHex(hsl.h, hsl.s, l)
    return { hex, ratio: contrastRatio(hex, bg) }
  }

  const candidates = []
  for (const dir of [-1, 1]) {
    let lo = dir < 0 ? 0 : hsl.l
    let hi = dir < 0 ? hsl.l : 1
    let best = null
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2
      const t = tryL(mid)
      if (t.ratio >= targetRatio) {
        best = t
        if (dir < 0) lo = mid
        else hi = mid
      } else if (dir < 0) {
        hi = mid
      } else {
        lo = mid
      }
    }
    for (const l of dir < 0 ? [0.02, 0.08, 0.12] : [0.98, 0.92, 0.88]) {
      const t = tryL(l)
      if (t.ratio < targetRatio) continue
      if (
        !best ||
        Math.abs(hexToHsl(t.hex).l - hsl.l) <
          Math.abs(hexToHsl(best.hex).l - hsl.l)
      ) {
        best = t
      }
    }
    if (best) candidates.push(best)
  }

  if (!candidates.length) {
    const black = tryL(0.05)
    const white = tryL(0.97)
    const pick = black.ratio >= white.ratio ? black : white
    return { hex: pick.hex, ratio: pick.ratio, changed: pick.hex !== fg }
  }

  candidates.sort(
    (a, b) =>
      Math.abs(hexToHsl(a.hex).l - hsl.l) - Math.abs(hexToHsl(b.hex).l - hsl.l)
  )
  const pick = candidates[0]
  return { hex: pick.hex, ratio: pick.ratio, changed: pick.hex !== fg }
}

/**
 * All ordered pairs in palette that pass AA normal (or custom target).
 * @returns {{ fg: string, bg: string, ratio: number }[]}
 */
export function buildPassPairs(palette = [], targetRatio = 4.5) {
  const colors = (palette || []).map(normalizeHex).filter(Boolean)
  const pairs = []
  for (let i = 0; i < colors.length; i++) {
    for (let j = 0; j < colors.length; j++) {
      if (i === j) continue
      const ratio = contrastRatio(colors[i], colors[j])
      if (ratio >= targetRatio) {
        pairs.push({ fg: colors[i], bg: colors[j], ratio })
      }
    }
  }
  pairs.sort((a, b) => b.ratio - a.ratio)
  return pairs
}

/**
 * Suggest pack role overrides so text/accent read on quiet/cover.
 * @returns {{ roles: object, changes: { role, from, to, why }[] }}
 */
export function suggestRoleAaFixes(palette = [], roles = null) {
  const auto = mapPaletteRoles(palette)
  const merged = {
    cover: normalizeHex(roles?.cover) || auto.cover,
    text: normalizeHex(roles?.text) || auto.text,
    accent: normalizeHex(roles?.accent) || auto.accent,
    quiet: normalizeHex(roles?.quiet) || auto.quiet,
  }
  const changes = []
  const apply = (role, nextHex, why) => {
    const n = normalizeHex(nextHex)
    if (!n || n === merged[role]) return
    changes.push({ role, from: merged[role], to: n, why })
    merged[role] = n
  }

  // text on quiet (body surfaces)
  {
    const r = contrastRatio(merged.text, merged.quiet)
    if (r < 4.5) {
      const fix = nudgeHexForContrast(merged.text, merged.quiet, 4.5)
      if (fix?.changed) apply('text', fix.hex, 'text on quiet → AA')
      else {
        const qH = hexToHsl(merged.quiet)
        if (qH) {
          for (const l of [0.96, 0.94, 0.9, 0.86]) {
            const cand = hslToHex(qH.h, qH.s * 0.5, l)
            if (contrastRatio(merged.text, cand) >= 4.5) {
              apply('quiet', cand, 'quiet lightened for text AA')
              break
            }
          }
        }
      }
    }
  }

  // accent on quiet (UI / links) ≥ 3:1
  {
    const r = contrastRatio(merged.accent, merged.quiet)
    if (r < 3) {
      const fix = nudgeHexForContrast(merged.accent, merged.quiet, 3)
      if (fix?.changed) apply('accent', fix.hex, 'accent on quiet → UI AA')
    }
  }

  /* Cover last, and the cover moves — not the ink.
   *
   * These passes used to run in a line, each free to overwrite the last: the
   * cover pass reassigned `text` to a light hex so hero type would read, and
   * that same reassignment then failed text-on-quiet against a mid-tone
   * background the earlier pass had already settled. The button reported
   * three fixes and left two pairs failing on the very meter it feeds — a
   * fix that doesn't fix is worse than no button, because it spends the
   * user's trust as well as their click.
   *
   * Text and accent are the brand's ink and are settled above against the
   * body surface. The cover is one surface, free to move along its own hue,
   * so it is the thing that gives — searched across lightness for a value
   * that clears BOTH marks at once, keeping hue and saturation so the brand
   * still looks like itself.
   */
  {
    const needsWork =
      contrastRatio(merged.text, merged.cover) < 3 ||
      contrastRatio(merged.accent, merged.cover) < 3
    if (needsWork) {
      const cH = hexToHsl(merged.cover)
      if (cH) {
        let best = null
        // Dark first, then light: a dark cover is the usual brand choice and
        // is what the layout is drawn for.
        for (const l of [
          0.12, 0.08, 0.05, 0.18, 0.24, 0.92, 0.96, 0.88, 0.99,
        ]) {
          const cand = hslToHex(cH.h, cH.s, l)
          const tr = contrastRatio(merged.text, cand)
          const ar = contrastRatio(merged.accent, cand)
          if (tr >= 3 && ar >= 3) {
            best = cand
            break
          }
        }
        // No single lightness satisfies both — desaturate and retry rather
        // than leaving a pair failing.
        if (!best) {
          for (const l of [0.1, 0.06, 0.95, 0.98]) {
            const cand = hslToHex(cH.h, Math.min(cH.s, 0.15), l)
            if (
              contrastRatio(merged.text, cand) >= 3 &&
              contrastRatio(merged.accent, cand) >= 3
            ) {
              best = cand
              break
            }
          }
        }
        if (best) apply('cover', best, 'cover moved to clear text and accent')
      }
    }
  }

  return { roles: merged, changes }
}

/** Pull solid hexes out of a CSS color / gradient string. */
export function parseHexesFromVisual(visual = '') {
  const s = String(visual || '')
  const found = []
  const hexRe = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/g
  let m
  while ((m = hexRe.exec(s))) {
    const n = normalizeHex(m[0])
    if (n) found.push(n)
  }
  const rgbRe = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi
  while ((m = rgbRe.exec(s))) {
    found.push(rgbToHex(+m[1], +m[2], +m[3]))
  }
  return found
}

/**
 * Quantize image pixels → dominant hexes (browser canvas).
 * @returns {Promise<string[]>}
 */
export function extractColorsFromImageUrl(url, { max = 6, sample = 64 } = {}) {
  if (!url || typeof document === 'undefined') {
    return Promise.resolve([])
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const natW = img.naturalWidth || sample
        const natH = img.naturalHeight || sample
        const w = Math.min(sample, natW)
        const h = Math.max(1, Math.round((natH * w) / (natW || 1)))
        canvas.width = Math.max(1, w)
        canvas.height = Math.max(1, Math.min(sample, h))
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve([])
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        let data
        try {
          data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        } catch {
          resolve([])
          return
        }
        const buckets = new Map()
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const key = `${r >> 4},${g >> 4},${b >> 4}`
          const prev = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 }
          prev.n++
          prev.r += r
          prev.g += g
          prev.b += b
          buckets.set(key, prev)
        }
        const ranked = [...buckets.values()]
          .filter((b) => b.n >= 2)
          .sort((a, b) => b.n - a.n)
          .map((b) => rgbToHex(b.r / b.n, b.g / b.n, b.b / b.n))
        resolve(dedupePalette(ranked, { max, minDistance: 32 }))
      } catch {
        resolve([])
      }
    }
    img.onerror = () => resolve([])
    img.src = url
  })
}

/**
 * Build a palette from mood pins (★ pack first, else all project pins).
 * @returns {Promise<{ colors: string[], sources: object, empty: boolean }>}
 */
export async function extractPaletteFromPins(
  pins = [],
  { max = 6, preferStarred = true } = {}
) {
  const list = Array.isArray(pins) ? pins : []
  const starred = list.filter((p) => p?.inPack)
  const source = preferStarred && starred.length ? starred : list

  const solids = []
  const imageUrls = []
  let colorN = 0
  let gradientN = 0
  let imageN = 0

  for (const pin of source) {
    const visual = String(pin?.visual || '').trim()
    const type = String(pin?.type || '').toLowerCase()
    if (!visual) continue

    const isImage =
      type === 'image' ||
      visual.startsWith('data:image') ||
      visual.startsWith('blob:') ||
      /^https?:\/\//i.test(visual) ||
      /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(visual)

    if (isImage) {
      imageUrls.push(visual)
      imageN++
      continue
    }

    const hexes = parseHexesFromVisual(visual)
    if (hexes.length) {
      solids.push(...hexes)
      if (/gradient/i.test(visual)) gradientN++
      else colorN++
      continue
    }

    const one = normalizeHex(visual)
    if (one) {
      solids.push(one)
      colorN++
    }
  }

  const fromImages = []
  for (const url of imageUrls.slice(0, 8)) {
    const extracted = await extractColorsFromImageUrl(url, {
      max: Math.max(3, Math.ceil(max / Math.max(1, imageUrls.length))),
    })
    fromImages.push(...extracted)
  }

  const colors = dedupePalette([...solids, ...fromImages], { max })
  return {
    colors,
    sources: { color: colorN, image: imageN, gradient: gradientN },
    empty: colors.length === 0,
  }
}

/** Ensure AA-fixed role hexes exist on the palette (append if missing). */
export function mergeRolesIntoPalette(palette = [], roles = {}, max = 8) {
  const base = (palette || []).map(normalizeHex).filter(Boolean)
  const extra = ['text', 'cover', 'accent', 'quiet']
    .map((k) => normalizeHex(roles[k]))
    .filter(Boolean)
  return dedupePalette([...base, ...extra], { max, minDistance: 18 })
}

/**
 * Smallest angle between two hues on the 360° color wheel (0–180).
 */
function hueDelta(a, b) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Lightweight hue-relationship check — not a substitute for a trained eye,
 * just enough signal to flag "these hues are fighting" versus "these read
 * as a family." Near-gray colors (low saturation) are treated as neutrals
 * and excluded from the hue comparison.
 * @param {string[]} palette
 * @returns {{ type: string, ok: boolean, note: string, hues: number[] }}
 */
export function checkPaletteHarmony(palette = []) {
  const chromatic = (palette || [])
    .map((hex) => ({ hex, hsl: hexToHsl(hex) }))
    .filter((c) => c.hsl && c.hsl.s >= 0.15)
  const hues = chromatic.map((c) => c.hsl.h)

  // An empty palette is not a neutral one. Saying "mostly neutrals" about
  // nothing is a claim with no colors behind it, and it made a brand-new
  // project read as though a decision had already been assessed.
  if (!(palette || []).length) {
    return {
      type: 'empty',
      ok: null,
      note: 'No colors yet.',
      hues,
    }
  }

  if (hues.length <= 1) {
    return {
      type: 'neutral',
      ok: true,
      note: 'Mostly neutrals — one accent color reads as calm by default.',
      hues,
    }
  }

  // Pairwise deltas between every chromatic hue
  const deltas = []
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      deltas.push(hueDelta(hues[i], hues[j]))
    }
  }
  const maxDelta = Math.max(...deltas)
  const minDelta = Math.min(...deltas)

  if (maxDelta <= 40) {
    return {
      type: 'analogous',
      ok: true,
      note: 'Hues sit close together on the wheel — reads as one family.',
      hues,
    }
  }
  if (hues.length === 2 && maxDelta >= 150) {
    return {
      type: 'complementary',
      ok: true,
      note: 'Two hues sit opposite each other — high contrast on purpose.',
      hues,
    }
  }
  if (hues.length >= 3 && minDelta >= 90) {
    return {
      type: 'triadic',
      ok: true,
      note: 'Hues are evenly spread — balanced, not accidental.',
      hues,
    }
  }
  return {
    type: 'clashing',
    ok: false,
    note: 'Hues are unevenly spaced — not quite a family, not quite opposites. Worth a second look.',
    hues,
  }
}

/**
 * One combined 0–100 signal for the Colors tab: contrast + role
 * justification + hue harmony. Mirrors the ingredients we already compute
 * separately (AA pass rate, "N/4 roles justified", harmony check) so this
 * is a rollup, not a new source of truth.
 * @param {{ palette: string[], colorRoles: object, colorRoleWhy: object }} args
 */
export const HEALTH_ROLE_KEYS = ['cover', 'text', 'accent', 'quiet']

/**
 * The color pairs a reader actually sees, with the ratio each one owes.
 *
 * The score used to compare EVERY palette color against the quiet
 * background. Most palette colors are never text on that surface, so a
 * perfectly good palette scored badly — and because every added color
 * brought another almost-certainly-failing pair, the number fell as the
 * work got better. That is the defect: a measurement that punished use.
 *
 * Only pairs where both roles are assigned are returned; an unassigned role
 * is unanswered, not failed.
 *
 * @returns {Array<{id:string,fg:string,bg:string,need:number,ratio:number,ok:boolean}>}
 */
export function roleContrastPairs(colorRoles = {}) {
  const r = {}
  for (const k of HEALTH_ROLE_KEYS) r[k] = normalizeHex(colorRoles[k])

  // 4.5 for body copy, 3.0 for large/UI marks — the AA thresholds, applied
  // to the job each role actually does rather than to every combination.
  const wanted = [
    { id: 'text-on-quiet', fg: r.text, bg: r.quiet, need: 4.5 },
    // Cover type is hero-sized, so AA large (3:1) is the honest bar — and it
    // is the bar `suggestRoleAaFixes` already aims at. Scoring against 4.5
    // here would mean the Fix button could never clear the meter it feeds.
    { id: 'text-on-cover', fg: r.text, bg: r.cover, need: 3 },
    { id: 'accent-on-quiet', fg: r.accent, bg: r.quiet, need: 3 },
    { id: 'accent-on-cover', fg: r.accent, bg: r.cover, need: 3 },
  ]

  return wanted
    .filter((p) => p.fg && p.bg && p.fg !== p.bg)
    .map((p) => {
      const ratio = contrastRatio(p.fg, p.bg)
      return { ...p, ratio, ok: ratio >= p.need }
    })
}

/**
 * One combined 0–100 signal for the Colors tab: role justification +
 * contrast on the pairs that matter + hue harmony.
 *
 * Two rules this must not break, both of which it used to:
 *
 * 1. **More work never lowers the score.** `justified / assigned` meant one
 *    justified role scored 100% and four justified roles scored 87%. The
 *    denominator is now the fixed set of roles, so every answer adds.
 * 2. **A blank project has no score, rather than a bad one.** An untouched
 *    palette scored 20% in red — a failure grade for not having started,
 *    which is the shape of feedback this app exists to avoid. `score` is
 *    now `null` until there is something to measure; render it as "—",
 *    never as 0%.
 *
 * @param {{ palette: string[], colorRoles: object, colorRoleWhy: object }} args
 */
export function paletteHealthScore({
  palette = [],
  colorRoles = {},
  colorRoleWhy = {},
} = {}) {
  const assigned = HEALTH_ROLE_KEYS.filter((k) =>
    String(colorRoles[k] || '').trim()
  )
  const justified = assigned.filter((k) => String(colorRoleWhy[k] || '').trim())

  const started = (palette || []).length > 0 || assigned.length > 0
  const harmony = checkPaletteHarmony(palette)
  const pairs = roleContrastPairs(colorRoles)

  if (!started) {
    return {
      score: null,
      started: false,
      roleScore: 0,
      contrastScore: 0,
      harmony,
      pairs,
      assignedCount: 0,
      justifiedCount: 0,
    }
  }

  // Fixed denominator: answering a fourth role can only ever add.
  const roleScore = justified.length / HEALTH_ROLE_KEYS.length

  // Unmeasurable is not failing. With no assigned pairs yet the contrast
  // term is withheld and the remaining terms are re-weighted, so the score
  // reports what is actually known instead of scoring silence as zero.
  const contrastScore = pairs.length
    ? pairs.filter((p) => p.ok).length / pairs.length
    : null

  const harmonyScore = harmony.ok === null ? null : harmony.ok ? 1 : 0.4

  const terms = [
    { value: roleScore, weight: 0.4 },
    { value: contrastScore, weight: 0.4 },
    { value: harmonyScore, weight: 0.2 },
  ].filter((t) => t.value !== null)

  const totalWeight = terms.reduce((s, t) => s + t.weight, 0)
  const score = totalWeight
    ? Math.round(
        (terms.reduce((s, t) => s + t.value * t.weight, 0) / totalWeight) * 100
      )
    : null

  return {
    score,
    started: true,
    roleScore,
    contrastScore: contrastScore ?? 0,
    harmony,
    pairs,
    assignedCount: assigned.length,
    justifiedCount: justified.length,
  }
}

/**
 * Suggest a hex for a role that has no color assigned yet, derived from
 * the existing palette rather than a random pick.
 * @param {string[]} palette
 * @param {'cover'|'text'|'accent'|'quiet'} role
 */
export function suggestRoleColor(palette = [], role) {
  const base = (palette || []).map(normalizeHex).filter(Boolean)[0]
  const hsl = base ? hexToHsl(base) : { h: 200, s: 0.4, l: 0.4 }
  if (!hsl) return '#0F766E'

  switch (role) {
    case 'accent':
      // Complementary hue, kept mid-lightness so it stays usable as an accent.
      return hslToHex(hsl.h + 180, Math.max(hsl.s, 0.45), 0.45)
    case 'quiet':
      // Light, low-saturation tint of the base — a calm background.
      return hslToHex(hsl.h, Math.min(hsl.s, 0.12), 0.96)
    case 'cover':
      // Dark, slightly desaturated shade of the base — a grounded surface.
      return hslToHex(hsl.h, Math.min(hsl.s * 0.8, 0.3), 0.14)
    case 'text':
      return bestTextOn(hslToHex(hsl.h, hsl.s, 0.96))
    default:
      return base || '#0F766E'
  }
}
