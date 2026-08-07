/**
 * The brand book (vector PDF).
 *
 * A fifteen-page print document: cover → foundations (voice, story, audience)
 * → logo → color → type → imagery → applications → closing, with a full-bleed
 * divider announcing each numbered section. Set in Archivo and Lora, on the
 * project's own palette, at US Letter.
 *
 * Three rules govern everything below.
 *
 * **The layout is the spec, the data is the project's.** Every page is drawn
 * to a fixed composition, but nothing on it is invented: the cover's title is
 * the client's name, the palette is the project's palette, the mood board is
 * the project's pins. Where a page's content does not exist, the page is not
 * drawn — an empty Audience page is worse than no Audience page, and a page of
 * plausible sample copy is worse than both. That is the Promise/Proof bug this
 * repo keeps re-learning: a tile bound to a field nothing ever wrote.
 *
 * **The page list is derived, never restated.** Section numbers, the cover's
 * contents list, and the "NN / TOTAL" in every footer are all computed from
 * the pages that actually got drawn. A book for a thin project is genuinely
 * shorter and says so honestly, rather than printing "07 / 15" on a nine-page
 * file.
 *
 * **Nothing the user typed is ever dropped.** The design assumes short
 * answers; real projects have long ones. Every block of prose flows onto a
 * continuation page under its own heading rather than running off the bottom
 * edge, which is silent data loss in the one artefact the client actually
 * receives. `brandBookOverflow.test.js` is what holds this honest.
 *
 * Geometry note: the design is specified in CSS pixels at 96dpi (816×1056 for
 * Letter) and PDF units are points (612×792), so every measurement from the
 * design is scaled by 0.75. `px()` does that conversion in one place so the
 * numbers below can be read straight off the design.
 */
import {
  mapPaletteRoles,
  normalizeHex,
  bestTextOn,
  contrastRatio,
  formatRatio,
  nudgeHexForContrast,
  tintsAndShades,
} from '../color'
import {
  buildColorSystem,
  decisionLineFromPack,
  logoDontsList,
  logoDefaultsNote,
  DEFAULT_LOGO_CLEARSPACE,
  DEFAULT_LOGO_MIN_SIZE,
  TYPE_SCALE,
  monogramFor,
} from '../brandSystem'
import { filledDetectiveChapters } from '../brief/detectiveBrief'
import { touchpointsFor, touchpointsBlurb, touchpointLabel, TOUCHPOINT_SPECS } from '../journey/touchpoints'
import {
  slugifyFilename,
  downloadBlob,
  writeToSaveHandle,
  creditedFooter,
} from './exportFiles'
import { resolveBookSetup } from './brandBookSetup'
import { bookPlan } from './bookDocument'
import { registerBookFonts, FACE, FALLBACK_FACE } from './bookFonts'

// ── Shared PDF text / image helpers (WinAnsi-safe + raster only) ─────────

function pdfSafeText(input) {
  return String(input ?? '')
    .replace(/ | /g, ' ')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″‶]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[≥≧]/g, '>=')
    .replace(/[≤≦]/g, '<=')
    .replace(/[≈≃≅]/g, '~')
    .replace(/[★☆✦✩✪]/g, '*')
    .replace(/[•‣∙]/g, '-')
    .replace(/[→⇒➔]/g, '->')
    .replace(/[←⇐]/g, '<-')
    .replace(/[×✕✖]/g, 'x')
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, '')
}

function hexToRgb(hex) {
  const s = String(hex || '').trim().replace(/^#/, '')
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16)
    const g = parseInt(s[1] + s[1], 16)
    const b = parseInt(s[2] + s[2], 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return [r, g, b]
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16)
    const g = parseInt(s.slice(2, 4), 16)
    const b = parseInt(s.slice(4, 6), 16)
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    return [r, g, b]
  }
  return null
}

const rgbToHexStr = ([r, g, b]) =>
  `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`

/** `t` of `a` over `b`. Used where the design asks for a translucent ink. */
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)))

function packCoverHex(pack) {
  const roles = pack?.colorRoles || {}
  const auto = mapPaletteRoles(pack?.palette || [])
  return (
    normalizeHex(roles.cover) ||
    normalizeHex(auto.cover) ||
    normalizeHex((pack?.palette || [])[0]) ||
    '#1C1917'
  )
}

function imageFormatFromDataUrl(url) {
  const s = String(url || '')
  if (/^data:image\/jpe?g/i.test(s)) return 'JPEG'
  if (/^data:image\/png/i.test(s)) return 'PNG'
  return null
}

async function rasterizeToPngDataUrl(src) {
  const s = String(src || '').trim()
  if (!s) return ''
  if (imageFormatFromDataUrl(s)) return s
  if (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) ||
    s.startsWith('linear-gradient') ||
    s.startsWith('rgb')
  ) {
    return ''
  }
  if (typeof document === 'undefined' || typeof Image === 'undefined') return ''
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const w = Math.max(1, Math.min(img.naturalWidth || 512, 1024))
          const h = Math.max(1, Math.min(img.naturalHeight || 512, 1024))
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const ctx = c.getContext('2d')
          if (!ctx) {
            resolve('')
            return
          }
          ctx.drawImage(img, 0, 0, w, h)
          resolve(c.toDataURL('image/png'))
        } catch {
          resolve('')
        }
      }
      img.onerror = () => resolve('')
      img.src = s
    } catch {
      resolve('')
    }
  })
}

async function preparePackRasters(pack) {
  if (!pack || typeof pack !== 'object') return pack
  let logoImage = pack.logoImage || ''
  if (logoImage && !imageFormatFromDataUrl(logoImage)) {
    logoImage = (await rasterizeToPngDataUrl(logoImage)) || logoImage
  }
  const pins = await Promise.all(
    (Array.isArray(pack.pins) ? pack.pins : []).map(async (p) => {
      const visual = String(p?.visual || '')
      if (visual.startsWith('data:image') && !imageFormatFromDataUrl(visual)) {
        const r = await rasterizeToPngDataUrl(visual)
        return r ? { ...p, visual: r } : p
      }
      return p
    })
  )
  return { ...pack, logoImage, pins }
}

/**
 * The monogram the book sets in its mark squares.
 *
 * Initials from the wordmark, not a drawn glyph: the book has no logotype of
 * its own to draw and must not pretend to. Where the project has actual logo
 * artwork it is shown at real size in the clearspace construction box on the
 * Logo page, which is the page that exists to show it.
 */
const clean = (v) => String(v ?? '').trim()
const has = (v) => !!clean(v)

/**
 * Application-first multi-page brand book.
 * @param {object} packIn
 * @param {Promise|null} handlePromise
 * @param {{ returnBlobOnly?: boolean, book?: object }} [options]
 */
export async function downloadBrandPackVectorPdf(
  packIn,
  handlePromise = null,
  options = {}
) {
  try {
    const jsPdfMod = await import('jspdf')
    const { jsPDF } = jsPdfMod
    const pack = (await preparePackRasters(packIn)) || packIn || {}
    /* The studio's own name, or nothing. This used to be a `hideWatermark`
       boolean naming the platform, honoured here and nowhere else — see
       `creditedFooter` in exportFiles.js for what that cost. */
    const studio = String(pack?.studio || '').trim()

    /* Page geometry comes from the shared setup rather than being written out
       here, so the three controls on Deliver and this generator can never
       disagree about what they mean. */
    const setup = resolveBookSetup(options.book)
    const { pageW, pageH, margin, bleed } = setup
    const contentW = pageW - margin * 2
    const pdf = new jsPDF({ unit: 'pt', format: [pageW, pageH], compress: true })

    const embedded = await registerBookFonts(pdf)
    const faces = embedded ? FACE : FALLBACK_FACE

    /* CSS pixels at 96dpi -> PostScript points. Every size below is written as
       the design specifies it so the two can be read side by side. */
    const px = (n) => n * 0.75

    // ── the book's colors, all four derived from the project's palette ──

    const colors = (pack?.palette || [])
      .map((c) => normalizeHex(c) || c)
      .filter(Boolean)
    const roles = { ...mapPaletteRoles(colors), ...(pack?.colorRoles || {}) }
    const colorSys = buildColorSystem(colors, pack?.colorRoles)

    const inkHex = normalizeHex(roles.text) || packCoverHex(pack)
    const goldHex = normalizeHex(roles.accent) || colors[1] || inkHex
    /* The book's paper. The builder has always had a page-background control
       and it never reached here — the book on screen repainted and the file
       the client received did not, so the control looked like it styled the
       deliverable and did not. The chosen colour wins; the palette-derived
       quiet tone stays as the fallback for a project that never picked one.

       Everything cream-derived follows from this one value — the content
       sheet, its hairlines and tints, and the text colours computed by
       `textOn`, which falls back to a readable colour whenever the preferred
       ink would not clear 4.5:1. So a dark paper repaints the page and its
       type together rather than leaving unreadable text behind. */
    const creamHex =
      normalizeHex(pack?.bookPageBg?.pageType) ||
      normalizeHex(roles.quiet) ||
      colors[colors.length - 1] ||
      '#FAFAF9'
    /* The fourth colour the design calls "tan": the palette member that is
       none of the three roles. Where a project has only three colours it is
       mixed from the two it does have rather than invented. */
    const tanHex =
      colors.find((c) => c !== inkHex && c !== goldHex && c !== creamHex) ||
      rgbToHexStr(mixRgb(hexToRgb(goldHex) || [0, 0, 0], hexToRgb(creamHex) || [255, 255, 255], 0.45))

    const INK = hexToRgb(inkHex) || [27, 58, 47]
    const GOLD = hexToRgb(goldHex) || [196, 165, 116]
    const TAN = hexToRgb(tanHex) || [232, 220, 200]
    const CREAM = hexToRgb(creamHex) || [247, 243, 236]
    const WHITE = [255, 255, 255]
    const BLACK = [0, 0, 0]

    /** The text colour for a field of `bgHex`, preferring the book's own ink. */
    const textOn = (bgHex, preferHex) => {
      const pref = normalizeHex(preferHex)
      if (pref && contrastRatio(pref, bgHex) >= 4.5) return hexToRgb(pref)
      return hexToRgb(bestTextOn(bgHex)) || [0, 0, 0]
    }
    const ON_INK = textOn(inkHex, creamHex)
    const ON_GOLD = textOn(goldHex, inkHex)
    const ON_CREAM = textOn(creamHex, inkHex)
    const ON_TAN = textOn(tanHex, inkHex)

    /**
     * A kicker's colour on a given field.
     *
     * The design's kicker is a darkened accent (#8a7256 against #C4A574's
     * gold). Deriving it by nudging the project's own accent until it clears
     * 4.5:1 reproduces exactly that relationship for any palette, instead of
     * hard-coding one project's brown into every book.
     */
    const kickerOn = (bgHex) => {
      const n = nudgeHexForContrast(goldHex, bgHex, 4.5)
      return hexToRgb(n?.hex || goldHex) || GOLD
    }
    const KICKER_CREAM = kickerOn(creamHex)
    const KICKER_INK = kickerOn(inkHex)
    const KICKER_TAN = kickerOn(tanHex)

    /**
     * The quiet greys — footers, secondary prose, captions.
     *
     * The design asks for the page's ink at 40-55% opacity. That is a real
     * design intent (recede, don't disappear) and a real accessibility
     * problem: ink at 40% on cream measures about 2.3:1, and this document
     * carries page numbers and the studio's name to a client. So the blend is
     * taken as the design specifies it and then nudged only as far as it has
     * to go to clear 4.5:1 — the design's tone wherever the design's tone
     * already passes.
     */
    const quietOn = (fg, bg, t) => {
      const blended = rgbToHexStr(mixRgb(fg, bg, t))
      const n = nudgeHexForContrast(blended, rgbToHexStr(bg), 4.5)
      return hexToRgb(n?.hex || blended) || fg
    }
    const MUTE_CREAM = quietOn(INK, CREAM, 0.7)
    const MUTE_INK = quietOn(ON_INK, INK, 0.7)
    const FOOT_CREAM = quietOn(INK, CREAM, 0.4)
    const FOOT_INK = quietOn(ON_INK, INK, 0.45)
    const HAIRLINE = mixRgb(INK, CREAM, 0.15)

    // ── the project's words ──

    const projectName = clean(pack?.projectName) || 'Untitled project'
    const wordmark = clean(pack?.logoWordmark) || projectName
    const monogram = monogramFor(wordmark)
    const tagline = clean(pack?.tagline)
    const d = pack?.detective || {}
    const day = new Date().toLocaleDateString()
    const pins = Array.isArray(pack?.pins) ? pack.pins : []
    const decision = clean(decisionLineFromPack(pack))
    const chapters = filledDetectiveChapters(d)
    /* The hoisted copies win: `buildBrandPackSnapshot` fills these even when
       `pack.detective` is null, so reading only through `d` loses them. */
    /* No `brief` fallback. `brief` is auto-composed from the answers on every
       keystroke, so it is the run-on summary rather than prose anyone wrote —
       printing it as Our Story put a wall of "Goal: … Story: … Words: …" in
       the client's book. A project with no story now gets no Story page, which
       is the rule everywhere else in this file. */
    const story = clean(pack?.story) || clean(d.story)
    const surfaces = pack?.brandSurfaces?.length ? pack.brandSurfaces : d.brandSurfaces
    const touchpoints = touchpointsFor(surfaces, d.deliverablesPicked)
    const contactLine = [clean(pack?.orgEmail), clean(pack?.orgWebsite)]
      .filter((v) => v && !/\.example\b|example\.com|brand\.example|you@example/i.test(v))
      .join('  ·  ')

    let pageIndex = -1
    let y = margin
    /* Recorded as each page is drawn. The preview lists these beside the
       thumbnails and must never hold its own copy: which pages exist depends
       on what the project holds. */
    const pageTitles = []

    const startSheet = (bgRgb, title) => {
      if (pageIndex >= 0) pdf.addPage()
      pageIndex += 1
      pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2])
      pdf.rect(0, 0, pageW, pageH, 'F')
      /* A section that runs long opens another sheet under the same title, so
         the repeat is marked rather than listed twice — someone scanning the
         preview wants to see "Agreed brief" once and know it continues. */
      const prev = pageTitles[pageIndex - 1]
      pageTitles[pageIndex] =
        prev && prev.replace(/ \(cont\.\)$/, '') === title
          ? `${title} (cont.)`
          : title
      y = margin
    }
    /* Which field each page sits on, so the footer can pick its tone. The
       cover is deliberately absent — it carries no footer. */
    const sheetFoots = []

    // ── drawing primitives ──

    /* The Builder's type controls, applied at the one place all type passes
       through. Every size below is a design literal chosen per element — a
       cover title and a section title are both "display" and deliberately
       differ — so the user's size arrives as a RATIO and scales the design's
       proportions rather than flattening them to one number.

       `label` is left alone on purpose: kickers, footers and page numbers are
       furniture, not the book's voice, and scaling them with the body copy
       makes a long footer wrap into the margin.

       A chosen type colour overrides the per-call colour; "auto" resolves to
       null upstream and leaves the existing palette-derived behaviour intact,
       including `textOn`'s fallback that keeps type readable on a dark page. */
    const running = pack?.bookRunning || {}
    const bookGrid = pack?.bookGrid || {}
    const typeScale = pack?.bookTypeScale || {}
    const typeColor = pack?.bookTypeColor || {}
    const FACE_ROLE = {
      display: 'headline',
      heading: 'subhead',
      body: 'body',
      bodyStrong: 'body',
      bodyItalic: 'body',
    }
    const setFace = (face, size, rgb) => {
      const [family, style] = faces[face]
      pdf.setFont(family, style)
      const role = FACE_ROLE[face]
      const ratio = role ? Number(typeScale[role]) : null
      pdf.setFontSize(
        Number.isFinite(ratio) && ratio > 0 ? size * ratio : size
      )
      const chosen = role ? hexToRgb(typeColor[role]) : null
      const use = chosen || rgb
      if (use) pdf.setTextColor(use[0], use[1], use[2])
    }
    const box = (x, yy, w, h, rgb) => {
      pdf.setFillColor(rgb[0], rgb[1], rgb[2])
      pdf.rect(x, yy, w, h, 'F')
    }
    const line = (x1, y1, x2, y2, rgb, w = 0.75) => {
      pdf.setDrawColor(rgb[0], rgb[1], rgb[2])
      pdf.setLineWidth(w)
      pdf.line(x1, y1, x2, y2)
    }
    const outline = (x, yy, w, h, rgb, lw = 0.75, dash = null) => {
      pdf.setDrawColor(rgb[0], rgb[1], rgb[2])
      pdf.setLineWidth(lw)
      if (dash) pdf.setLineDashPattern(dash, 0)
      pdf.rect(x, yy, w, h, 'S')
      if (dash) pdf.setLineDashPattern([], 0)
    }
    /** Text with the design's letter-spacing, always reset afterwards. */
    const tracked = (text, x, yy, spacing, opts) => {
      pdf.setCharSpace(spacing)
      pdf.text(pdfSafeText(text), x, yy, opts)
      pdf.setCharSpace(0)
    }
    const wrap = (text, w) => pdf.splitTextToSize(pdfSafeText(text), w)

    /**
     * The most letter-spacing the PDF's text layer survives.
     *
     * The design tracks its kickers at .16em. Above ~.102em a PDF reader can
     * no longer tell tracking from a space, so every eyebrow extracts as
     * "B U S I N E S S  C A R D" — unsearchable, unselectable, and read out
     * letter by letter by a screen reader. In a document that gets sent to a
     * client that is a functional defect, not a rendering nicety, so tracking
     * is capped just under the threshold. Measured, not guessed: pdf.js
     * splits at TRACKING_SPACE_FACTOR = 0.102.
     */
    const TRACKING_MAX = 0.1
    const track = (em) => Math.min(em, TRACKING_MAX)

    /** Kicker: Archivo Bold 10.5px, tracked, uppercase. */
    const KICKER_PT = px(10.5)
    const kicker = (text, x, yy, rgb) => {
      setFace('label', KICKER_PT, rgb)
      tracked(String(text).toUpperCase(), x, yy, KICKER_PT * track(0.16))
    }

    /** Body paragraph. Returns the height it consumed. */
    const para = (text, x, yy, w, { size = px(15), lh = 1.5, rgb = ON_CREAM, face = 'body' } = {}) => {
      setFace(face, size, rgb)
      const lines = wrap(text, w)
      pdf.text(lines, x, yy + size * 0.82)
      return lines.length * size * lh
    }
    const paraH = (text, w, size = px(15), lh = 1.5, face = 'body') => {
      setFace(face, size)
      return wrap(text, w).length * size * lh
    }

    // ── the page furniture ──

    /** The bottom of a content page's writable area (design: 84px padding). */
    const floorY = () => pageH - bleed - px(84)

    /**
     * Start a content page: cream field, kicker, heading, gold rule.
     * Every content page in the book goes through here, so the eyebrow /
     * title / rule relationship is declared once.
     */
    const contentPage = (kickerText, title, sub = '') => {
      startSheet(CREAM, title)
      sheetFoots.push({ page: pageIndex, dark: false })
      y = margin
      kicker(kickerText, margin, y + KICKER_PT * 0.82, KICKER_CREAM)
      y += KICKER_PT * 0.82 + px(10)
      const H1 = px(32)
      setFace('heading', H1, ON_CREAM)
      pdf.text(pdfSafeText(title), margin, y + H1 * 0.78)
      y += H1 * 0.78 + px(6)
      box(margin, y + px(8), px(56), px(3), GOLD)
      y += px(8) + px(3)
      if (sub) {
        y += px(20)
        y += para(sub, margin, y, contentW * 0.72, { size: px(15), rgb: MUTE_CREAM })
      }
      y += px(24)
    }

    /**
     * Open a numbered section with a full-bleed header band, then its content —
     * on ONE sheet.
     *
     * This replaced a full-bleed divider PAGE. The divider spread was mostly
     * empty and every section spent one on it, so a short book carried five
     * near-blank pages before any content — and book length is the first thing
     * a client feels. The band keeps what the divider was actually for: the
     * ink/gold alternation (so two sections never share a field back to back)
     * and the "NN / Section" landmark that tells a reader who put the document
     * down last week where they are. What it drops is the empty page under it.
     * The band carries the section identity, so the content title sits below
     * it with no separate kicker.
     */
    const sectionOpen = (num, titleLines, dark, title, sub = '') => {
      startSheet(CREAM, title)
      sheetFoots.push({ page: pageIndex, dark: false })
      const bandBg = dark ? INK : GOLD
      const bandFg = dark ? ON_INK : ON_GOLD
      const bandAccent = dark ? GOLD : INK
      const bandH = px(104)
      // Full-bleed to the top edge, including the bleed area.
      box(0, 0, pageW, bandH + bleed, bandBg)
      /* Clear of the running header, which is drawn last and lands at
         `bleed + px(26)` flush left — 8px from this number at 10px type, so
         the two overprinted each other on every section page. The band is
         104px tall and this pushes its content to ~85px, so there is room to
         move rather than needing to move the header into the bleed. */
      let by = bleed + px(running.show && running.text ? 46 : 34)
      setFace('display', px(14), bandAccent)
      pdf.text(pdfSafeText(`${num} /`), margin, by)
      const BT = px(30)
      by += px(16) + BT * 0.78
      setFace('display', BT, bandFg)
      pdf.text(pdfSafeText(titleLines.join(' ')), margin, by)
      // Content starts below the band.
      y = bandH + bleed + px(30)
      const H1 = px(30)
      setFace('heading', H1, ON_CREAM)
      pdf.text(pdfSafeText(title), margin, y + H1 * 0.78)
      y += H1 * 0.78 + px(6)
      box(margin, y + px(8), px(56), px(3), GOLD)
      y += px(8) + px(3)
      if (sub) {
        y += px(20)
        y += para(sub, margin, y, contentW * 0.72, { size: px(15), rgb: MUTE_CREAM })
      }
      y += px(24)
    }

    /**
     * Footers, drawn once at the end so "NN / TOTAL" can state a total that is
     * true. The cover carries none, exactly as designed.
     */
    const footerAll = () => {
      const total = pdf.getNumberOfPages()
      /* The Builder's "Running elements" govern this footer rather than
         drawing a second one beside it: its own footer text replaces the
         left-hand line when set, and the studio credit follows either way. */
      const leftText = creditedFooter([
        (running.showFooter && running.footerText) || projectName,
        studio,
      ])

      sheetFoots.forEach(({ page, dark }) => {
        if (page === 0) return
        pdf.setPage(page + 1)
        const FOOT = px(11)
        setFace('label', FOOT, dark ? FOOT_INK : FOOT_CREAM)
        const baseY = pageH - bleed - px(28)
        pdf.setCharSpace(FOOT * 0.04)
        const foot = pdfSafeText(leftText).slice(0, 52)
        if (running.footerAlign === 'center') {
          pdf.text(foot, pageW / 2, baseY, { align: 'center' })
        } else if (running.footerAlign === 'right' && !running.showPageNumbers) {
          pdf.text(foot, pageW - margin, baseY, { align: 'right' })
        } else {
          pdf.text(foot, margin, baseY)
        }
        /* Page numbers are a control now, not a given. Off means the pair of
           numbers goes away entirely rather than printing an empty slot. */
        if (running.showPageNumbers) {
          pdf.text(
            `${String(page + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
            pageW - margin,
            baseY,
            { align: 'right' }
          )
        }
        pdf.setCharSpace(0)
      })
    }

    /**
     * The running header, on interior pages only — covers stay clean, which is
     * what the Builder's own hint promises on screen.
     *
     * `alternate` mirrors the alignment on facing pages, the way a bound book
     * runs its heads outward. It is a no-op on a centred header.
     */
    const runningHeaderAll = () => {
      if (!running.show || !running.text) return
      sheetFoots.forEach(({ page, dark }) => {
        if (page === 0) return
        pdf.setPage(page + 1)
        const H = px(10)
        setFace('label', H, dark ? FOOT_INK : FOOT_CREAM)
        const yy = bleed + px(26)
        let align = running.align
        if (running.alternate && align !== 'center' && page % 2 === 0) {
          align = align === 'left' ? 'right' : 'left'
        }
        const text = pdfSafeText(running.text).slice(0, 60)
        pdf.setCharSpace(H * 0.06)
        if (align === 'center') pdf.text(text, pageW / 2, yy, { align: 'center' })
        else if (align === 'right')
          pdf.text(text, pageW - margin, yy, { align: 'right' })
        else pdf.text(text, margin, yy)
        pdf.setCharSpace(0)
      })
    }

    /**
     * Grid guides, on interior pages, drawn last so they sit over the content
     * the way guides do in a layout app.
     *
     * These are a working aid rather than part of the artwork — a book sent to
     * a client with guides printed on it is a mistake, so this only ever draws
     * when the Builder's "Show grid guides" is explicitly on. Hairline and
     * heavily tinted, so a proof stays readable underneath.
     */
    const gridGuidesAll = () => {
      if (!bookGrid.show) return
      const cols = bookGrid.columns || 12
      const rows = bookGrid.rows || 1
      sheetFoots.forEach(({ page, dark }) => {
        if (page === 0) return
        pdf.setPage(page + 1)
        const base = dark ? [255, 255, 255] : [0, 0, 0]
        pdf.setDrawColor(base[0], base[1], base[2])
        pdf.setLineWidth(0.25)
        const gx = (bookGrid.margin / 100) * pageW
        const gy = (bookGrid.margin / 100) * pageH
        const boxW = pageW - gx * 2
        const boxH = pageH - gy * 2
        const gut = (bookGrid.gutter / 100) * boxW
        const colW = cols > 0 ? (boxW - gut * (cols - 1)) / cols : boxW
        for (let c = 0; c < cols; c++) {
          const x = gx + c * (colW + gut)
          pdf.rect(x, gy, colW, boxH, 'S')
        }
        if (rows > 1) {
          const rowH = (boxH - gut * (rows - 1)) / rows
          for (let r = 0; r < rows; r++) {
            const yy = gy + r * (rowH + gut)
            pdf.rect(gx, yy, boxW, rowH, 'S')
          }
        }
      })
    }

    /**
     * Trim marks at the four corners, drawn in the bleed area, only when the
     * user said this is going to a print shop. Without them the bleed
     * allowance is invisible and unusable.
     */
    const cropMarksAll = () => {
      if (!setup.cropMarks) return
      const total = pdf.getNumberOfPages()
      const b = bleed
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i)
        pdf.setDrawColor(0, 0, 0)
        pdf.setLineWidth(0.5)
        for (const x of [b, pageW - b]) {
          for (const yy of [b, pageH - b]) {
            pdf.line(x === b ? 0 : pageW, yy, x, yy)
            pdf.line(x, yy === b ? 0 : pageH, x, yy)
          }
        }
      }
    }

    /**
     * Prose that outgrows its page continues on the next one under the same
     * heading, rather than being cut off at the bottom edge.
     */
    const flowPara = (text, w, opts, cont) => {
      const size = opts.size ?? px(15)
      const lh = opts.lh ?? 1.5
      setFace(opts.face || 'body', size, opts.rgb || ON_CREAM)
      const lines = wrap(text, w)
      let i = 0
      while (i < lines.length) {
        const room = Math.max(0, Math.floor((floorY() - y) / (size * lh)))
        if (room < 1) {
          cont()
          setFace(opts.face || 'body', size, opts.rgb || ON_CREAM)
          continue
        }
        const chunk = lines.slice(i, i + room)
        pdf.text(chunk, margin, y + size * 0.82)
        y += chunk.length * size * lh
        i += chunk.length
        if (i < lines.length) {
          cont()
          setFace(opts.face || 'body', size, opts.rgb || ON_CREAM)
        }
      }
    }

    /** A labelled block of prose that flows: the appendix's whole vocabulary. */
    const flowField = (label, text, cont, tip = '', sentence = false) => {
      if (y + px(40) > floorY()) cont()
      if (sentence) {
        /* A brief question is a whole sentence ("What do you want this
           project to change?"). Tracked uppercase is an eyebrow style — it
           makes a sentence harder to read, not more label-like. */
        setFace('heading', px(13), ON_CREAM)
        const qs = wrap(label, contentW)
        pdf.text(qs, margin, y + px(13) * 0.82)
        y += qs.length * px(13) * 1.35
      } else {
        kicker(label, margin, y + KICKER_PT * 0.82, KICKER_CREAM)
        y += KICKER_PT * 0.82
      }
      y += px(8)
      if (has(tip)) {
        flowPara(tip, contentW, { size: px(12), lh: 1.45, rgb: MUTE_CREAM, face: 'bodyItalic' }, cont)
        y += px(4)
      }
      flowPara(text, contentW, { size: px(15), rgb: ON_CREAM }, cont)
      y += px(20)
    }

    // ═════════════════════════════════════════════════════════════════
    // The book's plan. Built before anything is drawn, because the cover
    // lists the sections and every divider is numbered — both of which
    // need to know what the book turns out to contain.
    // ═════════════════════════════════════════════════════════════════

    const promise = clean(pack?.messagingPromise)
    const proof = clean(pack?.messagingProof)
    const personality = clean(pack?.messagingPersonality)
    const voice = clean(pack?.voice) || clean(pack?.toneOfVoice)

    /* The plan is read from bookDocument.js, not written out here. It used to
       live in this file as a private array while the on-screen book kept its
       own list, and the two drifted into naming different pages in different
       orders. Deriving means a page can only be added, renumbered or removed
       in one place. */
    const plan = bookPlan(pack)
    const foundations = plan.foundations

    const sections = plan.sections

    /* Section numbers run 01 for Foundations then one per drawn section, so a
       book missing Imagery numbers Applications 05 rather than leaving a gap
       where a section the reader never saw would have been. */
    const foundationsNum = plan.foundationsNum

    /* The appendix carries what the fifteen-page design has no page for. It is
       here rather than dropped because `doUse` / `dontUse`, the agreed brief
       and the handoff note are all things the user wrote for this client, and
       a deliverable that silently stops including them is the same failure as
       a page that clips its own text. */
    /* The owner's wording, carried over unchanged. Capitalisation is a
       typographic decision, so these belong with the type spec even though
       the fifteen-page layout has no page for them. */
    const CASE_RULE = {
      sentence: 'Headings use sentence case - capital on the first word only, as in a sentence.',
      title: 'Headings use title case - capital on each significant word.',
    }
    const CAPS_RULE = {
      never: 'Never set copy in ALL CAPS.',
      sparing: 'ALL CAPS for short labels and eyebrows only - never for a sentence or a paragraph.',
      labels: 'ALL CAPS is reserved for UI labels and navigation, where the string is one or two words.',
    }
    const writingRules = [
      ['Case', CASE_RULE[pack?.writingCase]],
      ['Capitals', CAPS_RULE[pack?.writingCaps]],
      ['Notes', pack?.writingNotes],
    ].filter(([, v]) => has(v))

    const messagingRows = [
      ['The plan', pack?.messagingPlan],
      ['The one action', pack?.messagingCta],
    ].filter(([, v]) => has(v))

    const handoffRows = [
      ['Handoff note', pack?.handoffNote],
      ['What we learned', pack?.learnings],
      ['Technical notes', pack?.technical],
      ['Accessibility', pack?.accessibilityNeeds],
      ['Pantone match', pack?.printPantone],
      ['Stock', pack?.printStock],
      ['Finish', pack?.printFinish],
    ].filter(([, v]) => has(v))

    const appendix = [
      { id: 'brief', title: 'Agreed brief', ok: chapters.length > 0 },
      { id: 'messaging', title: 'Messaging', ok: messagingRows.length > 0 },
      { id: 'writing', title: 'Writing', ok: writingRules.length > 0 },
      { id: 'usage', title: 'Usage', ok: has(pack?.doUse) || has(pack?.dontUse) },
      { id: 'handoff', title: 'Handoff', ok: handoffRows.length > 0 },
    ].filter((a) => a.ok)

    /* What the cover lists. Derived from the sections that will actually be
       drawn — a contents line naming a page the reader will not find is worse
       than no contents line. */
    const coverNav = [
      ...sections.map((s) => s.short),
      ...appendix.filter((a) => a.id === 'usage').map(() => 'Usage'),
    ]

    // ═══════════════════════════════════════════ 1. COVER

    startSheet(INK, 'Cover')
    {
      const top = margin
      setFace('label', px(13), GOLD)
      tracked('Visual Identity System', margin, top + px(13) * 0.82, px(13) * track(0.16))
      setFace('body', px(13), MUTE_INK)
      pdf.text(pdfSafeText(day), pageW - margin, top + px(13) * 0.82, { align: 'right' })

      /* Mark, title and tagline are one block, centred in the space between
         the top row and the contents row — the middle child of the design's
         space-between column. */
      const navY = pageH - bleed - px(48)
      const MARK = px(72)
      const TITLE = px(64)
      setFace('display', TITLE)
      /* The design caps the title at 9ch so a company name breaks into the
         two or three big lines the cover is built around. `ch` is the width
         of a zero, so it is measured rather than guessed at.

         But `splitTextToSize` hard-breaks any single word wider than the cap,
         and letters are wider than a zero — so "Aurora Bakehouse" came out as
         "Aurora Bak / ehouse" on the cover of the client's book. Verified:
         Harbor & Hearth, Fernbrook Ferments and Sparrow all broke correctly at
         their spaces; only a long single word failed.

         So the type shrinks to fit the widest word instead of the word being
         cut. A cover set a few points smaller is a design choice; a client's
         name sliced in half is a defect, and it is the first thing they see. */
      let TITLE_FIT = TITLE
      const longestWord = String(projectName || '')
        .split(/\s+/)
        .reduce((a, b) => (b.length > a.length ? b : a), '')

      /* The cap is measured ONCE, at the design's own size, and then held
         fixed. Measuring it inside the loop was the first attempt and it could
         never converge: `getTextWidth` scales with the current font size, so
         shrinking the type shrank the cap by exactly the same ratio and the
         word was always still too wide. The line length the design wants is an
         absolute width on the page, not a ratio to whatever size the type
         happens to be. */
      setFace('display', TITLE)
      const capW = pdf.getTextWidth('0') * 9

      setFace('display', TITLE_FIT)
      while (TITLE_FIT > px(26) && pdf.getTextWidth(pdfSafeText(longestWord)) > capW) {
        TITLE_FIT -= px(2)
        setFace('display', TITLE_FIT)
      }
      const titleLines = wrap(projectName, capW)
      const blockH =
        MARK + px(32) + titleLines.length * TITLE_FIT * 0.95 + (tagline ? px(22) + px(20) * 1.4 : 0)
      const bandTop = top + px(13) + px(40)
      let by = Math.max(bandTop, bandTop + (navY - px(24) - bandTop - blockH) / 2)

      box(margin, by, MARK, MARK, GOLD)
      setFace('display', px(24), ON_GOLD)
      pdf.text(pdfSafeText(monogram), margin + MARK / 2, by + MARK / 2 + px(24) * 0.36, {
        align: 'center',
      })
      by += MARK + px(32)

      setFace('display', TITLE_FIT, ON_INK)
      titleLines.forEach((l, i) => {
        pdf.text(pdfSafeText(l), margin, by + TITLE_FIT * 0.78 + i * TITLE_FIT * 0.95)
      })
      by += titleLines.length * TITLE_FIT * 0.95

      if (tagline) {
        by += px(22)
        setFace('bodyItalic', px(20), GOLD)
        pdf.text(pdfSafeText(tagline), margin, by + px(20) * 0.82)
      }

      if (coverNav.length) {
        setFace('label', px(11), MUTE_INK)
        let nx = margin
        pdf.setCharSpace(px(11) * 0.06)
        coverNav.forEach((w) => {
          const t = pdfSafeText(w.toUpperCase())
          pdf.text(t, nx, navY)
          /* getTextWidth already reports the tracked width — adding the
             letter-spacing again here made every gutter grow with the length
             of the word before it. */
          nx += pdf.getTextWidth(t) + px(24)
        })
        pdf.setCharSpace(0)
      }
    }

    // ═══════════════════════════════════════════ 2-4. FOUNDATIONS

    const foundationKicker = `${foundationsNum} — Foundations`

    const drawVoice = (f) => {
      contentPage(foundationKicker, f.title, f.sub)
      const colW = (contentW - px(48)) / 2
      const leftX = margin
      const rightX = margin + colW + px(48)

      const leftRows = [
        /* The designer's own positioning line, first, because it is the one
           sentence the rest of the page qualifies. Before this the book had no
           positioning at all: the Story page fell back to the auto-composed
           brief — "Client: X Goal: Y Story: Z" run together — and printed that
           under a heading promising the client's story. */
        ['Positioning', clean(pack?.positioning), 'bodyItalic', px(19)],
        ['Tagline', tagline, 'bodyItalic', px(19)],
        ['Promise', promise, 'body', px(15)],
        ['Proof', proof, 'body', px(15)],
      ].filter(([, v]) => has(v))
      const rightRows = [
        ['Personality', personality, 'body', px(15)],
        ['Voice', voice, 'body', px(15)],
      ].filter(([, v]) => has(v))

      const colHeight = (rows) =>
        rows.reduce(
          (h, [, text, face, size], i) =>
            h + KICKER_PT * 0.82 + px(10) + paraH(text, colW, size, 1.55, face) + (i < rows.length - 1 ? px(18) : 0),
          0
        )

      const top = y
      line(margin, top, margin + contentW, top, HAIRLINE)
      const bodyTop = top + px(20)
      const h = Math.max(colHeight(leftRows), colHeight(rightRows))

      const drawCol = (rows, x) => {
        let cy = bodyTop
        rows.forEach(([label, text, face, size], i) => {
          kicker(label, x, cy + KICKER_PT * 0.82, KICKER_CREAM)
          cy += KICKER_PT * 0.82 + px(10)
          cy += para(text, x, cy, colW, { size, lh: 1.55, face, rgb: ON_CREAM })
          if (i < rows.length - 1) cy += px(18)
        })
      }
      if (leftRows.length) drawCol(leftRows, leftX)
      if (rightRows.length) drawCol(rightRows, rightX)
      if (leftRows.length && rightRows.length) {
        line(margin + colW + px(24), top, margin + colW + px(24), bodyTop + h, HAIRLINE)
      }
      y = bodyTop + h + px(28)

      if (has(decision)) {
        const padX = px(24)
        const labelW = px(74)
        const textW = contentW - padX * 2 - labelW
        const boxH = paraH(decision, textW, px(15), 1.5) + px(40)
        if (y + boxH > floorY()) y = floorY() - boxH
        box(margin, y, contentW, boxH, INK)
        kicker('Decision', margin + padX, y + px(20) + KICKER_PT * 0.82, GOLD)
        para(decision, margin + padX + labelW, y + px(18), textW, { size: px(15), rgb: ON_INK })
      }
    }

    /** The label / value table shared by Story — 120px label column. */
    const drawStory = (f) => {
      contentPage(foundationKicker, f.title)
      const labelW = px(120)
      const valueW = contentW - labelW
      const rows = [
        ['Origin', story],
        ['What we do', pack?.usp],
        ['What matters', d.brandWords],
        ['This project', d.goal],
      ].filter(([, v]) => has(v))

      const cont = () => contentPage(foundationKicker, f.title, 'Continued.')
      rows.forEach(([label, text], i) => {
        const rowH = Math.max(paraH(text, valueW, px(15), 1.5), KICKER_PT) + px(32)
        if (y + rowH > floorY() && i > 0) cont()
        line(margin, y, margin + contentW, y, HAIRLINE)
        kicker(label, margin, y + px(16) + KICKER_PT * 0.82, KICKER_CREAM)
        const used = para(text, margin + labelW, y + px(16), valueW, { size: px(15) })
        y += Math.max(used, KICKER_PT) + px(32)
      })
      line(margin, y, margin + contentW, y, HAIRLINE)
    }

    const drawAudience = (f) => {
      contentPage(foundationKicker, f.title)
      const colW = (contentW - px(48)) / 2
      const cells = [
        ['Who they are', d.audience],
        ['How they feel', d.feel],
        ['Frustration', d.audiencePains],
        ['Three words', d.brandWords],
      ].filter(([, v]) => has(v))

      const rowsOf = []
      for (let i = 0; i < cells.length; i += 2) rowsOf.push(cells.slice(i, i + 2))

      rowsOf.forEach((row, ri) => {
        const h = Math.max(
          ...row.map(([, t]) => KICKER_PT * 0.82 + px(10) + paraH(t, colW, px(15), 1.5))
        )
        row.forEach(([label, text], ci) => {
          const x = margin + ci * (colW + px(48))
          kicker(label, x, y + KICKER_PT * 0.82, KICKER_CREAM)
          para(text, x, y + KICKER_PT * 0.82 + px(10), colW, { size: px(15) })
        })
        if (row.length === 2) {
          line(margin + colW + px(24), y - px(4), margin + colW + px(24), y + h + px(16), HAIRLINE)
        }
        y += h + px(20)
        if (ri < rowsOf.length - 1) {
          line(margin, y, margin + contentW, y, HAIRLINE)
          y += px(20)
        }
      })

      if (has(d.brandAsPerson)) {
        y += px(24)
        const textW = contentW - px(48)
        const boxH = paraH(d.brandAsPerson, textW, px(17), 1.5, 'bodyItalic') + px(52)
        if (y + boxH > floorY()) y = floorY() - boxH
        box(margin, y, contentW, boxH, GOLD)
        /* Ink at 70% on the accent field, as the design has it. A nudged gold
           kicker would be gold on gold — the one place the derived kicker
           colour has no contrast to work with. */
        kicker('If we were a person', margin + px(24), y + px(20) + KICKER_PT * 0.82, quietOn(ON_GOLD, GOLD, 0.75))
        para(d.brandAsPerson, margin + px(24), y + px(20) + KICKER_PT * 0.82 + px(10), textW, {
          size: px(17),
          face: 'bodyItalic',
          rgb: ON_GOLD,
        })
      }
    }

    const FOUNDATION_DRAW = { voice: drawVoice, story: drawStory, audience: drawAudience }
    foundations.forEach((f) => FOUNDATION_DRAW[f.id](f))

    // ═══════════════════════════════════════════ SECTIONS

    /** The wordmark lockup, set as the design sets it: monogram + wordmark. */
    const lockup = (x, cy, size, rgb, maxW) => {
      setFace('heading', size, rgb)
      let text = `${monogram} ${wordmark}`
      while (pdf.getTextWidth(pdfSafeText(text)) > maxW && size > px(10)) {
        size -= 0.5
        setFace('heading', size, rgb)
      }
      pdf.text(pdfSafeText(text), x, cy + size * 0.36, { align: 'center' })
    }

    const drawLogoSection = (s) => {
      sectionOpen(s.num, s.divider, true, s.page)

      /* The direction the logo was drawn to, in the designer's own words.
         It sits above the lockups because it is the reason they look the way
         they do — the reader should have it before the evidence, not after.

         It was written on the Design page and printed nowhere: the only field
         the book rendered on screen that never reached the client's PDF. A
         field with an editor and no destination is the same defect as a panel
         bound to a field nothing writes, just pointing the other way. */
      const direction = clean(pack?.logoDirection)
      if (direction) {
        para(direction, margin, y, contentW, { size: px(14), lh: 1.55, rgb: MUTE_CREAM })
        y += paraH(direction, contentW, px(14), 1.55) + px(18)
      }

      // 2x2 lockups on four fields, 2px gutters over a hairline ground
      const gap = px(2)
      const cellW = (contentW - gap) / 2
      const cellH = px(64)
      const fields = [
        [WHITE, textOn('#ffffff', inkHex)],
        [INK, ON_INK],
        [GOLD, ON_GOLD],
        [BLACK, WHITE],
      ]
      box(margin, y, contentW, cellH * 2 + gap, mixRgb(INK, CREAM, 0.1))
      fields.forEach(([bg, fg], i) => {
        const cx = margin + (i % 2) * (cellW + gap)
        const cy = y + Math.floor(i / 2) * (cellH + gap)
        box(cx, cy, cellW, cellH, bg)
        lockup(cx + cellW / 2, cy + cellH / 2, px(20), fg, cellW - px(36))
      })
      y += cellH * 2 + gap + px(24)

      /* Clear space as a DIAGRAM, and minimum size shown at size.
         Both were prose. "Clearspace ~ half the mark height on all sides" is a
         sentence a printer cannot measure, and "28px digital · 0.6in print" is
         a number nobody can picture — every published guide draws both, because
         both are spatial facts. The app is the one place in the chain that
         knows the mark's real bounding box, so it is the one place that can
         draw them without the designer redrawing them by hand. */
      const src = pack?.logoImage
      const fmt = imageFormatFromDataUrl(src)

      /** The mark if there is one, else the monogram — at any size. */
      const drawMark = (mx, my, w, h) => {
        if (fmt && src) {
          try {
            pdf.addImage(src, fmt, mx, my, w, h)
            return
          } catch {
            /* fall through to the monogram */
          }
        }
        const fs = Math.min(h * 0.7, w * 0.7)
        setFace('heading', fs, ON_CREAM)
        pdf.text(pdfSafeText(monogram), mx + w / 2, my + h / 2 + fs * 0.36, {
          align: 'center',
        })
      }

      const BOXW = px(110)
      /* X is the module every guide uses: the clear space is expressed as a
         multiple of it, so the rule survives the mark being scaled. Half the
         mark height is the app's own default and what the copy already says. */
      const X = BOXW * 0.22
      const inner = BOXW - X * 2

      outline(margin, y, BOXW, BOXW, INK, 0.75, [2, 2])
      drawMark(margin + X, y + X, inner, inner)

      // The mark's own bounding box, so the gap being measured is visible.
      pdf.setLineDashPattern([1, 2], 0)
      outline(margin + X, y + X, inner, inner, mixRgb(INK, CREAM, 0.4), 0.5)
      pdf.setLineDashPattern([], 0)

      /* One X label per side, in the gap it measures. Without these the two
         boxes are decoration — the label is what turns them into a rule. */
      setFace('label', px(8), mixRgb(INK, CREAM, 0.35))
      const midX = margin + BOXW / 2
      const midY = y + BOXW / 2
      pdf.text('X', midX, y + X / 2 + px(3), { align: 'center' })
      pdf.text('X', midX, y + BOXW - X / 2 + px(3), { align: 'center' })
      pdf.text('X', margin + X / 2, midY + px(3), { align: 'center' })
      pdf.text('X', margin + BOXW - X / 2, midY + px(3), { align: 'center' })

      const specW = contentW - BOXW - px(24)
      const specX = margin + BOXW + px(24)
      const spec = [clean(pack?.logoClearspace) || DEFAULT_LOGO_CLEARSPACE, clean(pack?.logoMinSize) || DEFAULT_LOGO_MIN_SIZE]
        .filter(Boolean)
        .join(' ')
      /* Say which of these rules nobody chose. The fallbacks are deliberate —
         a book should not be blank where a rule belongs — but without this the
         page reads the same whether a rule was decided or defaulted, and the
         client has no way to tell. Set smaller and muted: it is a footnote to
         the rules, not a warning about them. */
      const defaultsNote = logoDefaultsNote(pack)
      const specH = paraH(spec, specW, px(14), 1.6)
      const noteH = defaultsNote ? paraH(defaultsNote, specW, px(10), 1.5) + px(8) : 0
      const blockTop = y + (BOXW - (specH + noteH)) / 2
      para(spec, specX, blockTop, specW, { size: px(14), lh: 1.6 })
      if (defaultsNote) {
        para(defaultsNote, specX, blockTop + specH + px(8), specW, {
          size: px(10),
          lh: 1.5,
          rgb: MUTE_CREAM,
        })
      }
      y += BOXW + px(22)

      /* Minimum size, drawn at descending sizes rather than stated.
         "28px digital · 0.6in print" tells a client a number; the ladder tells
         them what it looks like when the mark stops working, which is the
         judgement the rule exists to support. The last step is the smallest
         the rule permits, labelled as the floor. */
      {
        const steps = [
          { w: px(78), label: 'Full size' },
          { w: px(52), label: 'Reduced' },
          { w: px(34), label: 'Small' },
          { w: px(22), label: 'Minimum' },
        ]
        const rowH = px(78)
        if (y + rowH + px(34) < floorY()) {
          kicker('Minimum size', margin, y + KICKER_PT * 0.82, KICKER_CREAM)
          y += KICKER_PT * 0.82 + px(12)
          let sx = margin
          const gapX = px(22)
          for (const step of steps) {
            // Baseline-aligned, so the ladder reads as one descending row.
            drawMark(sx, y + (rowH - step.w), step.w, step.w)
            setFace('label', px(8), mixRgb(INK, CREAM, 0.35))
            pdf.text(pdfSafeText(step.label), sx, y + rowH + px(11), { align: 'left' })
            sx += step.w + gapX
          }
          const floorNote = clean(pack?.logoMinSize) || DEFAULT_LOGO_MIN_SIZE
          setFace('body', px(10), MUTE_CREAM)
          pdf.text(
            pdfSafeText(`Never below: ${floorNote}`),
            margin + contentW,
            y + rowH + px(11),
            { align: 'right' }
          )
          y += rowH + px(30)
        }
      }

      /* Misuse, shown rather than listed.
         A client who has read "do not distort" still distorts it; one who has
         seen it next to the correct mark does not. Every reference guide draws
         this, and the pills below stay as the written rule — the pictures are
         what make the rule land.

         The four are chosen to work for a monogram as well as real artwork,
         which rules out recolouring (an embedded image cannot be recoloured
         here). Each is the wrong thing actually done, struck through, and
         captioned with what is wrong. */
      let drewDontVisuals = false
      {
        const cells = [
          { id: 'stretch', caption: 'Never stretch or squash' },
          { id: 'crowd', caption: 'Never crowd the clear space' },
          { id: 'busy', caption: 'Never on a busy field' },
          { id: 'lowcontrast', caption: 'Never on a low-contrast colour' },
        ]
        const gapX = px(14)
        const cw = (contentW - gapX * 3) / 4
        const ch = px(64)
        if (y + ch + px(30) < floorY()) {
          kicker("Don't", margin, y + KICKER_PT * 0.82, KICKER_CREAM)
          y += KICKER_PT * 0.82 + px(10)
          cells.forEach((cell, i) => {
            const cx = margin + i * (cw + gapX)
            const pad = px(10)
            const inner = ch - pad * 2

            if (cell.id === 'busy') {
              // A stand-in for photography: enough visual noise to make the point.
              box(cx, y, cw, ch, mixRgb(INK, CREAM, 0.55))
              pdf.setDrawColor(...mixRgb(INK, CREAM, 0.15))
              pdf.setLineWidth(0.6)
              /* Clamped to the cell rather than clipped. Each stripe runs
                 (cx+s, y+ch) → (cx+s+ch, y); drawn unclamped the negative
                 starts hang left into the previous cell, which they did —
                 the "crowd the clear space" panel came out hatched. */
              for (let s = -ch; s < cw; s += px(7)) {
                const t0 = Math.max(0, -s)
                const t1 = Math.min(ch, cw - s)
                if (t1 <= t0) continue
                pdf.line(cx + s + t0, y + ch - t0, cx + s + t1, y + ch - t1)
              }
              drawMark(cx + (cw - inner) / 2, y + pad, inner, inner)
            } else if (cell.id === 'lowcontrast') {
              box(cx, y, cw, ch, GOLD)
              drawMark(cx + (cw - inner) / 2, y + pad, inner, inner)
            } else if (cell.id === 'stretch') {
              outline(cx, y, cw, ch, mixRgb(INK, CREAM, 0.2), 0.6)
              // Deliberately wrong aspect — the distortion IS the illustration.
              drawMark(cx + pad, y + pad + inner * 0.2, cw - pad * 2, inner * 0.6)
            } else {
              outline(cx, y, cw, ch, mixRgb(INK, CREAM, 0.2), 0.6)
              // Flush to the edge: no clear space at all.
              drawMark(cx, y + ch - inner, inner, inner)
            }

            /* Struck through, so a cell skimmed out of context cannot be read
               as an example to follow. */
            pdf.setDrawColor(...INK)
            pdf.setLineWidth(1)
            pdf.line(cx, y + ch, cx + cw, y)

            setFace('body', px(8), MUTE_CREAM)
            for (const [li, l] of wrap(cell.caption, cw).entries()) {
              pdf.text(pdfSafeText(l), cx, y + ch + px(11) + li * px(9))
            }
          })
          y += ch + px(30)
          drewDontVisuals = true
        }
      }

      /* Don't — the written rule, directly under the pictures that show it.
         The heading is not repeated over both; the page printed "DON'T" twice
         in a row the first time these were drawn. */
      const donts = logoDontsList(pack)
      if (donts.length) {
        if (!drewDontVisuals) {
          kicker("Don't", margin, y + KICKER_PT * 0.82, KICKER_CREAM)
          y += KICKER_PT * 0.82 + px(10)
        }
        setFace('body', px(12), MUTE_CREAM)
        let px0 = margin
        const pillH = px(26)
        donts.forEach((t) => {
          const label = pdfSafeText(t)
          const w = pdf.getTextWidth(label) + px(24)
          if (px0 + w > margin + contentW) {
            px0 = margin
            y += pillH + px(6)
          }
          if (y + pillH > floorY()) return
          outline(px0, y, w, pillH, mixRgb(INK, CREAM, 0.2), 0.6)
          setFace('body', px(12), MUTE_CREAM)
          pdf.text(label, px0 + px(12), y + pillH / 2 + px(12) * 0.36)
          px0 += w + px(10)
        })
        y += pillH
      }
    }

    const drawColorSection = (s) => {
      sectionOpen(s.num, s.divider, false, s.page)

      /* Swatch grid — the palette, named and specified.
         WRAPS rather than truncating. This was `colors.slice(0, 4)`, so a
         palette of five or more silently lost the rest: the screen showed six
         swatches and the client's book printed four, with no indication that
         anything had been dropped. Worse, it cut by palette INDEX rather than
         by role, so with the palette reordered the discarded colour could be
         the Background. The store allows eight palette colours and the role
         vocabulary now has nine jobs, so passing four is the normal case, not
         an edge one. */
      const perRow = Math.min(4, Math.max(1, colors.length))
      const gap = px(14)
      const swW = (contentW - gap * (perRow - 1)) / perRow
      const swH = px(80)
      const rowH = swH + px(10) + KICKER_PT + px(16)
      colors.forEach((hex, i) => {
        const rgb = hexToRgb(hex) || [0, 0, 0]
        const col = i % perRow
        const row = Math.floor(i / perRow)
        const x = margin + col * (swW + gap)
        const yy = y + row * rowH
        box(x, yy, swW, swH, rgb)
        /* Cream on cream is invisible without an edge, exactly as the design
           outlines its lightest swatch. */
        if (contrastRatio(hex, creamHex) < 1.25) outline(x, yy, swW, swH, mixRgb(INK, CREAM, 0.2), 0.6)
        const role = colorSys.roleRows.find((r) => r.hex === hex)
        kicker(
          `${role ? role.label || role.role : `Swatch ${i + 1}`} · ${hex.toUpperCase()}`,
          x,
          yy + swH + px(10) + KICKER_PT * 0.82,
          KICKER_CREAM
        )
      })
      const swatchRows = Math.max(1, Math.ceil(colors.length / perRow))
      y += swatchRows * rowH + px(10)

      /* Tints and shades — a screen-only feature until now.
         `tintsAndShades` has existed in color.js all along and DesignView has
         drawn these on the designer's screen at src/views/DesignView.jsx.
         The client's book has never contained them, so a system the designer
         built and reviewed as five steps was delivered as one flat chip. That
         is the same screen-only gap the page backgrounds had.

         Every printed brand guide worth copying carries this: a client needs
         the lighter step for a hover state or a table stripe, and inventing
         one themselves is how a palette drifts. Drawn as a continuous ramp per
         brand colour, labelled with the hexes so they can be used, not just
         admired. */
      const ramps = colors
        .map((hex) => ({ hex, steps: tintsAndShades(hex, { steps: 2 }) }))
        .filter((r) => r.steps.length > 1)
      if (ramps.length) {
        kicker('Tints and shades', margin, y + KICKER_PT * 0.82, KICKER_CREAM)
        y += KICKER_PT * 0.82 + px(12)
        const chipH = px(26)
        const labelH = px(9)
        for (const ramp of ramps) {
          const n = ramp.steps.length
          const chipW = contentW / n
          ramp.steps.forEach((step, i) => {
            const rgb = hexToRgb(step) || [0, 0, 0]
            box(margin + i * chipW, y, chipW, chipH, rgb)
            if (contrastRatio(step, creamHex) < 1.25) {
              outline(margin + i * chipW, y, chipW, chipH, mixRgb(INK, CREAM, 0.2), 0.5)
            }
          })
          /* Ends only. Labelling all five at this size sets 30-odd hexes in
             8pt across one page, which is a wall rather than a reference —
             the ramp between two named ends is readable without them. */
          setFace('body', labelH, MUTE_CREAM)
          pdf.text(pdfSafeText(ramp.steps[0].toUpperCase()), margin, y + chipH + labelH * 1.3)
          pdf.text(
            pdfSafeText(ramp.steps[n - 1].toUpperCase()),
            margin + contentW,
            y + chipH + labelH * 1.3,
            { align: 'right' }
          )
          y += chipH + labelH * 1.3 + px(10)
        }
        y += px(6)
      }

      // Proportion bar — the roles' shares of a layout
      kicker('Color usage proportion', margin, y + KICKER_PT * 0.82, KICKER_CREAM)
      y += KICKER_PT * 0.82 + px(10)
      const bar = [
        [INK, 0.55],
        [GOLD, 0.2],
        [TAN, 0.25],
      ]
      let bx = margin
      bar.forEach(([rgb, share]) => {
        box(bx, y, contentW * share, px(28), rgb)
        bx += contentW * share
      })
      y += px(28) + px(10)
      y += para(
        'Ink dominates backgrounds and text. Accent is reserved for calls to action - never more than one accent moment per layout. The quiet tone fills the remaining space.',
        margin,
        y,
        contentW,
        { size: px(14), lh: 1.6 }
      )
      y += px(20)

      // AA pairs — measured, not asserted
      const pairs = colorSys.passPairs.slice(0, 3)
      if (pairs.length) {
        kicker('AA pass pairs (body >= 4.5:1)', margin, y + KICKER_PT * 0.82, KICKER_CREAM)
        y += KICKER_PT * 0.82 + px(10)
        pairs.forEach((p) => {
          const rowH = px(30)
          if (y + rowH > floorY()) return
          const bg = hexToRgb(p.bg) || CREAM
          const fg = hexToRgb(p.fg) || INK
          box(margin, y, contentW, rowH, bg)
          if (contrastRatio(p.bg, creamHex) < 1.25) outline(margin, y, contentW, rowH, HAIRLINE, 0.6)
          setFace('heading', px(14), fg)
          pdf.text('Aa', margin + px(14), y + rowH / 2 + px(14) * 0.36)
          setFace('body', px(13), fg)
          pdf.text(
            pdfSafeText(`${p.fg.toUpperCase()} on ${p.bg.toUpperCase()}`),
            margin + px(44),
            y + rowH / 2 + px(13) * 0.36
          )
          pdf.text(pdfSafeText(p.label || formatRatio(p.ratio)), pageW - margin - px(14), y + rowH / 2 + px(13) * 0.36, {
            align: 'right',
          })
          y += rowH + px(2)
        })
      }
    }

    const drawTypeSection = (s) => {
      sectionOpen(s.num, s.divider, true, s.page)

      const headingName = clean(pack?.typeHeading) || 'Heading face'
      const bodyName = clean(pack?.typeBody) || 'Body face'

      /* The specimens are set in the book's own faces and NAME the project's,
         because the book cannot embed a typeface it was never given. Saying
         "Heading - Fraunces SemiBold" over a line the reader can see is a
         specification; silently setting it in Archivo and calling it Fraunces
         would be a lie in the one document that has to be trusted about type. */
      kicker(`Heading — ${headingName}`, margin, y + KICKER_PT * 0.82, KICKER_CREAM)
      y += KICKER_PT * 0.82 + px(10)
      y += para('The quick brown fox jumps over the lazy dog.', margin, y, contentW, {
        size: px(34),
        lh: 1.15,
        face: 'heading',
      })
      y += px(22)

      kicker(`Body — ${bodyName}`, margin, y + KICKER_PT * 0.82, KICKER_CREAM)
      y += KICKER_PT * 0.82 + px(10)
      y += para(
        'Body copy should stay calm and readable. Hierarchy beats decoration. Keep line length comfortable and reserve accent color for actions.',
        margin,
        y,
        contentW * 0.72,
        { size: px(16), lh: 1.6 }
      )
      y += px(26)

      /* The designer's reason for this pairing, when they gave one. Typed on
         the Identity page and, before this, printed nowhere — a write-only
         field. Omitted entirely when blank (same rule as the imagery
         rationale) so an unused note never leaves an empty heading behind. */
      if (has(pack?.typeWhy)) {
        kicker('Why these faces', margin, y + KICKER_PT * 0.82, KICKER_CREAM)
        y += KICKER_PT * 0.82 + px(10)
        y += para(pack.typeWhy, margin, y, contentW * 0.72, {
          size: px(15),
          lh: 1.5,
        })
        y += px(22)
      }

      const labelW = px(110)
      TYPE_SCALE.forEach((row) => {
        const rowH = px(46)
        if (y + rowH > floorY()) return
        line(margin, y, margin + contentW, y, HAIRLINE)
        const sample = row.id === 'display' || row.id === 'h1' ? 'display' : 'body'
        const sampleSize = row.id === 'display' ? px(30) : row.id === 'h1' ? px(22) : px(16)
        setFace(sample, sampleSize, ON_CREAM)
        pdf.text('Aa', margin, y + px(12) + sampleSize * 0.78)
        setFace('body', px(13), MUTE_CREAM)
        pdf.text(
          pdfSafeText(`${row.label} · ${row.size} · ${row.weight} · ${row.use}`),
          margin + labelW,
          y + rowH / 2 + px(13) * 0.36
        )
        y += rowH
      })
      line(margin, y, margin + contentW, y, HAIRLINE)
    }

    const drawImagerySection = (s) => {
      sectionOpen(s.num, s.divider, false, s.page)
      const cont = () => contentPage(`${s.num} — ${s.name}`, s.page, 'Continued.')

      ;[
        ['Do', pack?.imageryDo],
        ["Don't", pack?.imageryDont],
        ['Style', pack?.imageryStyle],
      ]
        .filter(([, v]) => has(v))
        .forEach(([label, text]) => {
          setFace('bodyStrong', px(15), ON_CREAM)
          const lead = `${label}: `
          const leadW = pdf.getTextWidth(pdfSafeText(lead))
          if (y + px(24) > floorY()) cont()
          pdf.text(pdfSafeText(lead), margin, y + px(15) * 0.82)
          /* The lead-in sits on the first line; the rest wraps full width
             underneath, which is what a run-in paragraph does. */
          setFace('body', px(15), ON_CREAM)
          const first = wrap(text, contentW - leadW)[0] || ''
          pdf.text(pdfSafeText(first), margin + leadW, y + px(15) * 0.82)
          y += px(15) * 1.55
          const rest = clean(text).slice(first.length).trim()
          if (rest) flowPara(rest, contentW, { size: px(15), lh: 1.55 }, cont)
          y += px(8)
        })

      y += px(14)

      /* The mood board is the project's own pins. Where there are none the
         grid is drawn in the palette instead - a shape for photography that
         has not been shot yet, which is what the design's placeholder blocks
         mean. It is never filled with stand-in photographs. */
      const gap = px(4)
      const rowH = px(80)
      const colW = (contentW - gap * 2) / 3
      const gridH = rowH * 2 + gap
      if (y + gridH <= floorY()) {
        const slots = [
          { x: margin, y: y, w: colW, h: gridH },
          { x: margin + colW + gap, y: y, w: colW, h: rowH },
          { x: margin + (colW + gap) * 2, y: y, w: colW, h: rowH },
          { x: margin + colW + gap, y: y + rowH + gap, w: colW, h: rowH },
          { x: margin + (colW + gap) * 2, y: y + rowH + gap, w: colW, h: rowH },
        ]
        const fallback = [TAN, INK, GOLD, WHITE, INK]
        const imagePins = pins.filter((p) => imageFormatFromDataUrl(p?.visual))
        slots.forEach((sl, i) => {
          const pin = imagePins[i]
          box(sl.x, sl.y, sl.w, sl.h, fallback[i])
          if (pin) {
            try {
              pdf.addImage(pin.visual, imageFormatFromDataUrl(pin.visual), sl.x, sl.y, sl.w, sl.h)
            } catch {
              /* the palette block stays */
            }
          } else if (fallback[i] === WHITE) {
            outline(sl.x, sl.y, sl.w, sl.h, HAIRLINE, 0.6)
          }
        })
        y += gridH
      }
    }

    /** What each mock is called and what field it sits on. */
    const drawAppsSection = (s) => {
      const blurb = clean(touchpointsBlurb(surfaces, d.deliverablesPicked))
      sectionOpen(s.num, s.divider, true, s.page, blurb)

      const gap = px(2)
      const cellW = (contentW - gap) / 2
      const cellH = px(110)
      const fields = [
        [WHITE, textOn('#ffffff', inkHex), KICKER_CREAM],
        [INK, ON_INK, KICKER_INK],
        [TAN, ON_TAN, KICKER_TAN],
        [WHITE, textOn('#ffffff', inkHex), KICKER_CREAM],
      ]

      const perPage = 4
      for (let i = 0; i < touchpoints.length; i += perPage) {
        if (i > 0) contentPage(`${s.num} — ${s.name}`, s.page, 'Continued.')
        const group = touchpoints.slice(i, i + perPage)
        const rows = Math.ceil(group.length / 2)
        box(margin, y, contentW, cellH * rows + gap * (rows - 1), mixRgb(INK, CREAM, 0.1))
        group.forEach((t, j) => {
          const [bg, fg, kick] = fields[j % fields.length]
          const cx = margin + (j % 2) * (cellW + gap)
          const cy = y + Math.floor(j / 2) * (cellH + gap)
          box(cx, cy, cellW, cellH, bg)
          kicker(touchpointLabel(t), cx + px(20), cy + px(20) + KICKER_PT * 0.82, kick)
          /* A card carries contact details, so the card mock does too — but
             only real ones. Inventing "hello@brand.example" would put a dead
             address in front of a client on the one page that looks most like
             a finished artefact. */
          const card = t === 'businessCard' && contactLine
          let ty = cy + cellH - px(20)
          if (card) {
            setFace('body', px(9), fg)
            pdf.text(pdfSafeText(contactLine).slice(0, 44), cx + px(20), ty)
            ty -= px(14)
          }
          if (tagline) {
            setFace('bodyItalic', px(12), fg === ON_INK ? GOLD : kick)
            pdf.text(pdfSafeText(tagline), cx + px(20), ty)
            ty -= px(16)
          }
          setFace('heading', px(17), fg)
          pdf.text(pdfSafeText(wordmark), cx + px(20), ty)

          /* The trim size, top-right of the mock.
             Every reference guide specifies its stationery — "3.5 × 2 in",
             "A4", "M–XL–XXL" — because a mock without a size is a picture and
             a mock with one is a brief a printer can quote from. These are the
             standard sizes for each surface, so they are stated as the common
             specification rather than as this project's decision; anything
             genuinely bespoke belongs in the designer's own note. */
          const spec = TOUCHPOINT_SPECS[t]
          if (spec) {
            setFace('label', px(8), kick)
            pdf.text(pdfSafeText(spec), cx + cellW - px(20), cy + px(20) + px(6), {
              align: 'right',
            })
          }
        })
        y += cellH * rows + gap * (rows - 1) + px(16)
        para('Mocks are direction proofs only - not production die-lines.', margin, y, contentW, {
          size: px(13),
          lh: 1.5,
          rgb: MUTE_CREAM,
        })
      }
    }

    const SECTION_DRAW = {
      logo: drawLogoSection,
      color: drawColorSection,
      type: drawTypeSection,
      imagery: drawImagerySection,
      apps: drawAppsSection,
    }
    sections.forEach((s) => SECTION_DRAW[s.id](s))

    // ═══════════════════════════════════════════ CLOSING

    startSheet(INK, 'Closing')
    sheetFoots.push({ page: pageIndex, dark: true })
    {
      const MARK = px(64)
      const H1 = px(44)
      const headline = 'Thank you for building this with us.'
      setFace('display', H1)
      const lines = wrap(headline, contentW * 0.52)
      const blockH = MARK + px(28) + lines.length * H1 * 1.05 + (tagline ? px(18) + px(18) * 1.5 : 0)
      let cy = pageH - bleed - px(48) - blockH

      box(margin, cy, MARK, MARK, GOLD)
      setFace('display', px(20), ON_GOLD)
      pdf.text(pdfSafeText(monogram), margin + MARK / 2, cy + MARK / 2 + px(20) * 0.36, { align: 'center' })
      cy += MARK + px(28)

      setFace('display', H1, ON_INK)
      lines.forEach((l, i) => pdf.text(pdfSafeText(l), margin, cy + H1 * 0.78 + i * H1 * 1.05))
      cy += lines.length * H1 * 1.05

      if (tagline) {
        cy += px(18)
        setFace('bodyItalic', px(18), GOLD)
        pdf.text(pdfSafeText(tagline), margin, cy + px(18) * 0.82)
      }

      /* Who to ask. Every printed brand guide ends on a contact page, and this
         one ended on a headline — while the project already held orgPhone,
         orgAddress and a whole `contacts` array of named people with titles,
         none of which the book had ever printed. The client is left holding a
         document with no way to reach whoever made it.

         Right column, so it sits opposite the headline rather than pushing it
         off the page. Placeholder addresses are filtered the same way
         `contactLine` already filters them — a demo value in a real handoff is
         worse than a blank. */
      const people = Array.isArray(pack?.contacts) ? pack.contacts : []
      const isReal = (v) =>
        clean(v) && !/\.example\b|example\.com|brand\.example|you@example/i.test(v)
      const orgRows = [
        clean(pack?.orgEmail),
        clean(pack?.orgWebsite),
        clean(pack?.orgPhone),
        clean(pack?.orgAddress),
      ].filter(isReal)
      const peopleRows = people
        .filter((c) => isReal(c?.name) || isReal(c?.email))
        .slice(0, 3)
        .map((c) =>
          [clean(c.name), clean(c.title)].filter(Boolean).join(' · ') +
          (isReal(c.email) ? `\n${clean(c.email)}` : '')
        )

      if (orgRows.length || peopleRows.length) {
        const colX = margin + contentW * 0.58
        const colW = contentW * 0.42
        let ky = pageH - bleed - px(48) - blockH
        kicker('Get in touch', colX, ky + KICKER_PT * 0.82, GOLD)
        ky += KICKER_PT * 0.82 + px(14)
        setFace('body', px(11), ON_INK)
        for (const row of orgRows) {
          for (const l of wrap(row, colW)) {
            pdf.text(pdfSafeText(l), colX, ky + px(11) * 0.82)
            ky += px(11) * 1.5
          }
        }
        for (const block of peopleRows) {
          ky += px(8)
          for (const l of block.split('\n')) {
            pdf.text(pdfSafeText(l), colX, ky + px(11) * 0.82)
            ky += px(11) * 1.5
          }
        }
      }
    }

    // ═══════════════════════════════════════════ APPENDIX

    /* Where the brief starts, so Handoff can point at it rather than echoing
       a capped copy that drifts as the first one is edited. Recorded as it is
       drawn - a page number worked out any other way is a guess. */
    let briefStartPage = 0

    appendix.forEach((a) => {
      const kick = `Appendix — ${a.title}`
      const cont = () => contentPage(kick, a.title, 'Continued.')

      if (a.id === 'brief') {
        contentPage(kick, a.title, 'The record of what was agreed.')
        briefStartPage = pageIndex + 1
        chapters.forEach((ch) => {
          if (y + px(60) > floorY()) cont()
          setFace('heading', px(15), ON_CREAM)
          pdf.text(pdfSafeText(`${ch.num} · ${ch.title}`), margin, y + px(15) * 0.78)
          y += px(15) * 0.78 + px(12)
          /* The worked example travels with the question. A brief answer read
             back months later without the example that framed it is the
             answer to a question nobody can reconstruct. */
          /* A dozen tips already open with "e.g." in the schema - don't say
             it twice. */
          ch.rows.forEach((r) =>
            flowField(
              r.label,
              r.answer,
              cont,
              /* No tip. These are the grey examples that sit under the form
                 fields to help the designer answer — "e.g. Sarah Whitton,
                 Owner", "e.g. you@studio.com". They were printed in italics
                 above the client's real answer, so every book carried a
                 fictional person's name and a stranger's email address in its
                 appendix. A hint is scaffolding for filling the form in; it is
                 not part of what the client agreed to. */
              '',
              true
            )
          )
          y += px(6)
        })
        return
      }

      if (a.id === 'messaging') {
        contentPage(kick, a.title, 'What we want the reader to do next.')
        messagingRows.forEach(([label, text]) => flowField(label, text, cont))
        return
      }

      if (a.id === 'writing') {
        contentPage(kick, a.title, 'How the words are set.')
        writingRules.forEach(([label, text]) => flowField(label, text, cont))
        return
      }

      if (a.id === 'usage') {
        contentPage(kick, a.title, 'Ship rules - clear guardrails, room to make.')
        if (has(pack?.doUse)) flowField('Do', pack.doUse, cont)
        if (has(pack?.dontUse)) flowField("Don't", pack.dontUse, cont)
        return
      }

      contentPage(kick, a.title, 'What to take into your design tool next.')
      handoffRows.forEach(([label, text]) => flowField(label, text, cont))
      if (briefStartPage) {
        if (y + px(30) > floorY()) cont()
        y += px(10)
        setFace('body', px(13), MUTE_CREAM)
        pdf.text(
          pdfSafeText(`Full agreed brief - page ${String(briefStartPage).padStart(2, '0')}`),
          margin,
          y + px(13) * 0.82
        )
      }
    })

    footerAll()
    runningHeaderAll()
    gridGuidesAll()
    cropMarksAll()

    const slug = slugifyFilename(pack?.projectName, 'brand-pack')
    const name = `${slug}-brand-book.pdf`
    let blob
    try {
      const ab = pdf.output('arraybuffer')
      blob = new Blob([ab], { type: 'application/pdf' })
    } catch {
      blob = pdf.output('blob')
      if (!blob.type) blob = new Blob([blob], { type: 'application/pdf' })
    }

    if (options.returnBlobOnly) {
      return {
        ok: true,
        blob,
        method: 'blob',
        mode: 'vector',
        pages: pdf.getNumberOfPages(),
        /* Filled in so the caller never has to guess a page's name. Any page
           the generator somehow didn't label still gets an entry, so the list
           always lines up 1:1 with the pages in the file. */
        pageTitles: Array.from(
          { length: pdf.getNumberOfPages() },
          (_, i) => pageTitles[i] || `Page ${i + 1}`
        ),
      }
    }

    if (handlePromise) {
      const written = await writeToSaveHandle(handlePromise, blob)
      if (written.ok || written.cancelled) {
        return { ...written, method: 'file-picker', mode: 'vector', pages: pdf.getNumberOfPages() }
      }
    }
    try {
      pdf.save(name)
      return { ok: true, method: 'jspdf-save', mode: 'vector', pages: pdf.getNumberOfPages() }
    } catch {
      /* fall through */
    }
    const viaAnchor = downloadBlob(blob, name)
    if (viaAnchor.ok) {
      return {
        ...viaAnchor,
        method: viaAnchor.method || 'anchor',
        mode: 'vector',
        pages: pdf.getNumberOfPages(),
      }
    }
    return { ok: false, error: 'Browser blocked the download' }
  } catch (e) {
    return { ok: false, error: e?.message || 'Vector PDF failed' }
  }
}
