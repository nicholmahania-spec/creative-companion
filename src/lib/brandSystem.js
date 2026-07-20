/**
 * Brand identity system helpers — codes, type scale, logo rules,
 * messaging pillars, kit tokens. Used by Design UI + export leave-behind.
 */

import {
  normalizeHex,
  hexToRgb as hexToRgbObj,
  mapPaletteRoles,
  buildPassPairs,
  contrastRatio,
  formatRatio,
  bestTextOn,
} from './color'
import { formatDecisionLine, latestDecision } from './decisionLog'

export const DEFAULT_LOGO_MIN_SIZE =
  '24px digital · 0.5″ print (mark height)'

export const DEFAULT_LOGO_CLEARSPACE =
  'Clearspace ≈ half the mark height on all sides. Prefer full-color primary; reverse on dark covers; mono for one-ink jobs.'

export const DEFAULT_LOGO_DONTS = [
  'Do not stretch, skew, or distort the mark',
  'Do not recolor outside brand palette roles',
  'Do not place the mark on low-contrast or busy photography',
]

/** Type scale for brand book / implementation handoff */
export const TYPE_SCALE = [
  { id: 'display', label: 'Display', size: '32–40px', weight: 'Bold', use: 'Hero / cover titles' },
  { id: 'h1', label: 'H1', size: '24–28px', weight: 'Bold', use: 'Section titles' },
  { id: 'h2', label: 'H2', size: '18–20px', weight: 'Semibold', use: 'Subheads' },
  { id: 'body', label: 'Body', size: '15–16px', weight: 'Regular', use: 'Paragraphs · UI copy' },
  { id: 'caption', label: 'Caption', size: '12–13px', weight: 'Regular', use: 'Meta · labels' },
]

export const ROLE_JOBS = {
  cover: 'Hero surfaces, pack covers, dark fields',
  text: 'Body and heading text on quiet surfaces',
  accent: 'Links, CTAs, key UI emphasis',
  quiet: 'Page backgrounds, cards, breathing room',
}

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }|null}
 */
export function hexToRgbChannels(hex) {
  return hexToRgbObj(hex)
}

/**
 * Approximate sRGB → CMYK (0–100). Good enough for brand books; not press proofing.
 * @returns {{ c: number, m: number, y: number, k: number }|null}
 */
export function hexToCmyk(hex) {
  const rgb = hexToRgbChannels(hex)
  if (!rgb) return null
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const k = 1 - Math.max(r, g, b)
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 }
  const c = (1 - r - k) / (1 - k)
  const m = (1 - g - k) / (1 - k)
  const y = (1 - b - k) / (1 - k)
  const pct = (n) => Math.round(Math.max(0, Math.min(1, n)) * 100)
  return { c: pct(c), m: pct(m), y: pct(y), k: pct(k) }
}

/**
 * Full color record for export / tokens.
 * @param {string} hex
 * @param {{ role?: string, job?: string }} [meta]
 */
export function colorSpec(hex, meta = {}) {
  const h = normalizeHex(hex)
  if (!h) return null
  const rgb = hexToRgbChannels(h)
  const cmyk = hexToCmyk(h)
  return {
    hex: h,
    role: meta.role || '',
    job: meta.job || ROLE_JOBS[meta.role] || '',
    rgb: rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : '',
    rgbChannels: rgb,
    cmyk: cmyk
      ? `C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k}`
      : '',
    cmykChannels: cmyk,
  }
}

/**
 * Role-first color system from palette + overrides.
 */
export function buildColorSystem(palette = [], colorRoles = null) {
  const colors = (palette || []).map(normalizeHex).filter(Boolean)
  const roles = { ...mapPaletteRoles(colors), ...(colorRoles || {}) }
  const roleRows = ['cover', 'text', 'accent', 'quiet'].map((role) => {
    const hex = normalizeHex(roles[role]) || roles[role]
    return colorSpec(hex, { role, job: ROLE_JOBS[role] })
  }).filter(Boolean)

  const swatches = colors.map((hex, i) =>
    colorSpec(hex, { role: `swatch-${i + 1}`, job: 'Palette member' })
  ).filter(Boolean)

  const passPairs = buildPassPairs(colors, 4.5).slice(0, 12).map((p) => ({
    fg: p.fg,
    bg: p.bg,
    ratio: p.ratio,
    label: formatRatio(p.ratio),
    textOnBg: bestTextOn(p.bg),
  }))

  return { roles, roleRows, swatches, passPairs, colors }
}

/**
 * CSS custom properties string for kit.
 */
export function buildCssTokens(pack = {}) {
  const sys = buildColorSystem(pack.palette, pack.colorRoles)
  const lines = [
    `/* ${pack.projectName || 'Brand'} · Creative Companion tokens */`,
    `:root {`,
    `  --brand-heading: ${JSON.stringify(pack.typeHeading || 'system-ui')};`,
    `  --brand-body: ${JSON.stringify(pack.typeBody || 'system-ui')};`,
  ]
  for (const row of sys.roleRows) {
    lines.push(`  --brand-${row.role}: ${row.hex};`)
  }
  sys.colors.forEach((hex, i) => {
    lines.push(`  --brand-swatch-${i + 1}: ${hex};`)
  })
  lines.push(`}`, '')
  return lines.join('\n')
}

/**
 * JSON tokens for kit.
 */
export function buildJsonTokens(pack = {}) {
  const sys = buildColorSystem(pack.palette, pack.colorRoles)
  return {
    name: pack.projectName || 'Brand',
    version: pack.designVersion || 'v1',
    exportedAt: pack.exportedAt || new Date().toISOString(),
    tagline: pack.tagline || '',
    colors: {
      roles: Object.fromEntries(
        sys.roleRows.map((r) => [
          r.role,
          { hex: r.hex, rgb: r.rgb, cmyk: r.cmyk, job: r.job },
        ])
      ),
      palette: sys.swatches.map((s) => ({
        hex: s.hex,
        rgb: s.rgb,
        cmyk: s.cmyk,
      })),
      aaPassPairs: sys.passPairs,
    },
    typography: {
      heading: pack.typeHeading,
      body: pack.typeBody,
      scale: TYPE_SCALE,
    },
    messaging: {
      promise: pack.messagingPromise || '',
      proof: pack.messagingProof || '',
      personality: pack.messagingPersonality || '',
    },
    logo: {
      wordmark: pack.logoWordmark || '',
      direction: pack.logoDirection || '',
      clearspace: pack.logoClearspace || DEFAULT_LOGO_CLEARSPACE,
      minSize: pack.logoMinSize || DEFAULT_LOGO_MIN_SIZE,
      donts: logoDontsList(pack),
    },
  }
}

export function logoDontsList(pack = {}) {
  const raw = String(pack.logoDonts || '').trim()
  if (raw) {
    return raw
      .split(/\n|;/)
      .map((s) => s.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
  }
  return [...DEFAULT_LOGO_DONTS]
}

export function decisionLineFromPack(pack = {}) {
  if (pack.decisionLine) return String(pack.decisionLine)
  const fromLog = formatDecisionLine(
    latestDecision(pack.decisionLog, 'direction') ||
      latestDecision(pack.decisionLog)
  )
  if (fromLog) return fromLog
  const chosen = (pack.directions || []).find((d) => d.chosen)
  if (chosen) {
    return formatDecisionLine({
      label: chosen.label,
      title: chosen.title,
      why: chosen.note,
    })
  }
  return ''
}

/** Default type scale markdown block */
export function typeScaleMarkdown(pack = {}) {
  const lines = [
    '## Type scale',
    '',
    `| Level | Size | Weight | Use |`,
    `| --- | --- | --- | --- |`,
  ]
  for (const row of TYPE_SCALE) {
    lines.push(
      `| ${row.label} | ${row.size} | ${row.weight} | ${row.use} |`
    )
  }
  lines.push(
    '',
    `- **Heading face:** ${pack.typeHeading || '—'}`,
    `- **Body face:** ${pack.typeBody || '—'}`,
    `- **Fallback:** system-ui, -apple-system, Segoe UI, sans-serif`,
    ''
  )
  return lines
}

/**
 * Enrich markdown brand pack with full system sections.
 */
export function appendSystemMarkdown(lines, pack) {
  const out = [...lines]
  const sys = buildColorSystem(pack.palette, pack.colorRoles)
  const decision = decisionLineFromPack(pack)

  if (decision) {
    out.push('## Direction decision', '', decision, '')
  }

  const msg = [
    pack.messagingPromise,
    pack.messagingProof,
    pack.messagingPersonality,
  ].some((s) => String(s || '').trim())
  if (msg) {
    out.push('## Messaging pillars', '')
    if (pack.messagingPromise)
      out.push(`- **Promise:** ${pack.messagingPromise}`)
    if (pack.messagingProof) out.push(`- **Proof:** ${pack.messagingProof}`)
    if (pack.messagingPersonality)
      out.push(`- **Personality:** ${pack.messagingPersonality}`)
    out.push('')
  }

  // Replace thin palette section with system — caller may already have palette; we append codes
  out.push('## Color system (roles + codes)', '')
  for (const row of sys.roleRows) {
    out.push(
      `- **${row.role}** — ${row.job}`,
      `  - HEX \`${row.hex}\` · ${row.rgb} · ${row.cmyk}`
    )
  }
  out.push('', '### Palette swatches', '')
  for (const s of sys.swatches) {
    out.push(`- \`${s.hex}\` · ${s.rgb} · ${s.cmyk}`)
  }
  out.push('')
  if (sys.passPairs.length) {
    out.push('### AA pass pairs (body text ≥ 4.5:1)', '')
    for (const p of sys.passPairs) {
      out.push(`- \`${p.fg}\` on \`${p.bg}\` · ${p.label}`)
    }
    out.push('')
  }

  out.push(...typeScaleMarkdown(pack))

  out.push('## Logo rules', '')
  out.push(
    `- **Clearspace:** ${pack.logoClearspace || DEFAULT_LOGO_CLEARSPACE}`,
    `- **Min size:** ${pack.logoMinSize || DEFAULT_LOGO_MIN_SIZE}`,
    '',
    '### Logo don’ts',
    ''
  )
  for (const d of logoDontsList(pack)) {
    out.push(`- ${d}`)
  }
  out.push('')

  if (
    pack.imageryStyle ||
    pack.imageryDo ||
    pack.imageryDont
  ) {
    out.push('## Imagery guidelines', '')
    if (pack.imageryStyle)
      out.push(`- **Style:** ${pack.imageryStyle}`)
    if (pack.imageryDo) out.push(`- **Do:** ${pack.imageryDo}`)
    if (pack.imageryDont) out.push(`- **Don’t:** ${pack.imageryDont}`)
    out.push('')
  }

  out.push(
    '## Application note',
    '',
    'Use the brand kit mock (business card) as a proof of system: cover + quiet + accent + type pair + mark. Prefer roles over random swatches.',
    ''
  )

  return out
}

/**
 * Simple mono-ish filter note for UI (actual mono uses CSS/filter in artboard).
 */
export function logoVariantHints() {
  return {
    primary: 'Full color on quiet',
    reverse: 'Light mark on cover',
    mono: 'Single ink / one-color',
  }
}

/** Contrast check helper for docs */
export function pairPassesAa(fg, bg, target = 4.5) {
  return contrastRatio(fg, bg) >= target
}
