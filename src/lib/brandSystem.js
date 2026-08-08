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
  contrastGrade,
  formatRatio,
  bestTextOn,
  BRAND_ROLE_KEYS,
  BRAND_ROLE_LABELS,
} from './color'
import { formatDecisionLine, latestDecision } from './decisionLog'

export const DEFAULT_LOGO_MIN_SIZE =
  '24px digital · 0.5" print (mark height)'

export const DEFAULT_LOGO_CLEARSPACE =
  'Clearspace ~ half the mark height on all sides. Prefer full-color primary; reverse on dark covers; mono for one-ink jobs.'

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
  secondary: 'Supporting brand surfaces and secondary emphasis',
  text: 'Body and heading text on quiet surfaces',
  accent: 'Links, CTAs, key UI emphasis',
  accent2: 'Second accent — charts, tags, category marks',
  accent3: 'Third accent — used sparingly',
  neutral: 'Rules, dividers, muted panels, secondary type',
  neutral2: 'Second neutral — deeper greys and fills',
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
    /* The name the DESIGNER was shown. `role` is the storage key, and a client
       token file that says "cover" where the app says "Primary" is speaking
       the app's private language at someone who never saw it. Falls back to
       the label table so callers that pass no label still get the right word. */
    label: meta.label || BRAND_ROLE_LABELS[meta.role] || meta.role || '',
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
  /* Every job the vocabulary knows, not a private copy of the old four.
     This list was hardcoded, so when the vocabulary grew to nine the five new
     jobs reached NO client deliverable: tokens.css, tokens.json, brand.md and
     the PDF's swatch labels all feed from here. A designer could assign a
     Secondary and the client would never learn which hex it was — the colour
     still shipped, anonymously, as a numbered swatch.

     Unassigned roles are SKIPPED, not emitted blank. An unanswered job is not
     an answer, and printing `secondary: ""` in a client's token file would be
     worse than omitting it (`brandRoles.test.js` pins that rule).

     Human-facing text uses BRAND_ROLE_LABELS. The client's brand.md said
     "cover" and "quiet" — the app's own internal keys — where the designer had
     been shown "Primary" and "Background". */
  const roleRows = BRAND_ROLE_KEYS.filter((role) =>
    normalizeHex(roles[role])
  ).map((role) => {
    const hex = normalizeHex(roles[role]) || roles[role]
    return colorSpec(hex, {
      role,
      label: BRAND_ROLE_LABELS[role] || role,
      job: ROLE_JOBS[role],
    })
  }).filter(Boolean)

  /* A palette colour with no job is a real state, and "SWATCH 3 · Palette
     member" describes it to a client as though that were its purpose. It is
     not — it is a colour nobody has assigned yet, which is a different and
     more useful thing to say. Colours that DO hold a role are named by it. */
  const assigned = new Map(
    BRAND_ROLE_KEYS.map((role) => [normalizeHex(roles[role]), role]).filter(
      ([hex]) => hex
    )
  )
  const swatches = colors.map((hex, i) => {
    const role = assigned.get(hex)
    return colorSpec(hex, {
      role: role || `swatch-${i + 1}`,
      label: role ? BRAND_ROLE_LABELS[role] || role : `Swatch ${i + 1}`,
      job: role ? ROLE_JOBS[role] : 'In the palette, no job assigned yet',
    })
  }).filter(Boolean)

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
  const unsetLogoRules = logoRuleDefaults(pack)
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
      /* WHICH OF THE THREE ABOVE NOBODY CHOSE.
         The prose exports say this in a sentence — `logoDefaultsNote` — but a
         token file has nowhere to put a sentence, so `tokens.json` was the one
         client-facing surface asserting a measurement as a brand
         specification when the designer had left the field blank. Minimum
         size is the sharp case: `DesignView` refuses to pre-fill it because a
         legibility floor is a property of one particular mark, and this file
         then handed a developer '24px digital · 0.5" print' to implement
         against with nothing to say it was a stand-in.

         The values stay, so a consumer reading `minSize` still gets a usable
         string. `logoRuleDefaults` is the source — the same one the sentence
         reads, so the JSON and the prose cannot disagree about which rules
         were decided. Empty array means every rule on this object was
         chosen. */
      defaults: LOGO_RULE_KEYS.filter((k) => unsetLogoRules[k]),
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

/**
 * The four pairings the brand actually puts in front of a reader.
 *
 * `buildContrastMatrix` reads a PALETTE. Roles are assigned separately and can
 * point at hexes in no palette at all — `mergeRolesIntoPalette` exists because
 * that drift is known. So a reading taken over the palette alone can look
 * spotless while the pairing the designer assigned is unreadable.
 *
 * Measured on a real project: palette [#1C1917, #FFB8B8] produced a clean
 * matrix and a client file listing one passing pair, while the assigned Text
 * #737373 on Background #FFB8B8 was 2.89:1 — under AA for body text and under
 * the 3:1 floor for large text as well.
 *
 * The pairings and their targets are the same ones `suggestRoleAaFixes` fixes,
 * so what is reported and what the auto-fix repairs cannot disagree.
 *
 * @returns {{id,label,fg,bg,fgRole,bgRole,ratio,need,ok,usableFor}[]}
 */
export function roleReadability(palette = [], colorRoles = null) {
  const roles = { ...mapPaletteRoles(palette), ...(colorRoles || {}) }
  const PAIRS = [
    { id: 'text-on-quiet', fg: 'text', bg: 'quiet', need: 4.5, label: 'Body text on background' },
    { id: 'accent-on-quiet', fg: 'accent', bg: 'quiet', need: 3, label: 'Accent on background' },
    { id: 'text-on-cover', fg: 'text', bg: 'cover', need: 3, label: 'Text on primary' },
    { id: 'accent-on-cover', fg: 'accent', bg: 'cover', need: 3, label: 'Accent on primary' },
  ]
  return PAIRS.map((p) => {
    const fg = normalizeHex(roles[p.fg])
    const bg = normalizeHex(roles[p.bg])
    if (!fg || !bg || fg.toLowerCase() === bg.toLowerCase()) return null
    const ratio = contrastRatio(fg, bg)
    const grade = contrastGrade(ratio)
    const usableFor = []
    if (grade.aaNormal) usableFor.push('body text')
    if (grade.aaLarge) usableFor.push('large text')
    if (grade.ui) usableFor.push('UI shapes')
    return {
      id: p.id,
      label: p.label,
      fg,
      bg,
      fgRole: BRAND_ROLE_LABELS[p.fg] || p.fg,
      bgRole: BRAND_ROLE_LABELS[p.bg] || p.bg,
      ratio,
      need: p.need,
      ok: ratio >= p.need,
      usableFor,
    }
  }).filter(Boolean)
}

/**
 * Which logo rules on the page are the built-in defaults rather than answers.
 *
 * Clearspace, minimum size and the don'ts all fall back to sensible defaults
 * when the designer has not set them — deliberately, so a book is never blank
 * where a rule belongs. The cost is that the delivered page reads identically
 * whether a rule was decided or merely defaulted, and the client cannot tell
 * which. On a project with all three unset the book still states a clearspace
 * ratio, a minimum size in px and inches, and three prohibitions, in the same
 * voice as the parts that were actually chosen.
 *
 * This does not remove the defaults. It only lets the surfaces say which is
 * which, so "not yet decided" stops looking like "decided".
 */
/** The rules `logoRuleDefaults` reports on, in the order the note lists them. */
export const LOGO_RULE_KEYS = ['clearspace', 'minSize', 'donts']

export function logoRuleDefaults(pack = {}) {
  const unset = (v) => !String(v || '').trim()
  return {
    clearspace: unset(pack.logoClearspace),
    minSize: unset(pack.logoMinSize),
    donts: unset(pack.logoDonts),
  }
}

/**
 * One plain sentence naming the defaulted rules, or '' when everything shown
 * was chosen. Shared so the PDF and the markdown cannot word it differently.
 */
export function logoDefaultsNote(pack = {}) {
  const d = logoRuleDefaults(pack)
  const which = [
    d.clearspace && 'clearspace',
    d.minSize && 'minimum size',
    d.donts && 'the don’ts',
  ].filter(Boolean)
  if (!which.length) return ''
  const list =
    which.length === 1
      ? which[0]
      : `${which.slice(0, -1).join(', ')} and ${which[which.length - 1]}`
  return `Standard practice shown for ${list} — not yet set for this brand.`
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
    pack.messagingPlan,
    pack.messagingCta,
  ].some((s) => String(s || '').trim())
  if (msg) {
    out.push('## Messaging pillars', '')
    if (pack.messagingPromise)
      out.push(`- **Promise:** ${pack.messagingPromise}`)
    if (pack.messagingProof) out.push(`- **Proof:** ${pack.messagingProof}`)
    if (pack.messagingPersonality)
      out.push(`- **Personality:** ${pack.messagingPersonality}`)
    /* The written leave-behind and the PDF must not disagree about what the
       brand asks of people — the book prints these on Direction. */
    if (pack.messagingPlan) out.push(`- **The plan:** ${pack.messagingPlan}`)
    if (pack.messagingCta)
      out.push(`- **The one action:** ${pack.messagingCta}`)
    out.push('')
  }

  const print = [pack.printPantone, pack.printStock, pack.printFinish].filter(
    (s) => String(s || '').trim()
  )
  if (print.length) {
    out.push('## Print and finish', '')
    if (pack.printPantone) out.push(`- **Pantone match:** ${pack.printPantone}`)
    if (pack.printStock) out.push(`- **Paper stock:** ${pack.printStock}`)
    if (pack.printFinish) out.push(`- **Finish:** ${pack.printFinish}`)
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
    ''
  )
  const defaultsNote = logoDefaultsNote(pack)
  if (defaultsNote) out.push(`_${defaultsNote}_`, '')
  out.push('### Logo don’ts', '')
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
    'Use the business card specimen as a proof of system: cover + quiet + accent + type pair + mark. Prefer roles over random swatches.',
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

/**
 * The monogram the lockup is set with — first letters of the first two words.
 *
 * Lived privately in brandBookPdf.js, which meant the on-screen book could not
 * draw the same lockup the client receives. It belongs beside the other logo
 * helpers, where both surfaces can reach it.
 */
export function monogramFor(wordmark) {
  const words = String(wordmark || '')
    .replace(/[^A-Za-z0-9& ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const letters = words
    .filter((w) => w !== '&')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  if (!letters) return 'B'
  /* "Harbor & Hearth" reads as "H&" rather than "HH" when an ampersand joined
     the words - that is how the brand writes itself. */
  return words.includes('&') && letters.length === 2
    ? `${letters[0]}&`
    : letters
}
