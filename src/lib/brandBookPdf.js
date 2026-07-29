/**
 * Application-first brand book (vector PDF).
 * Designed like a leave-behind system deck: cover world → strategy → agreed
 * brief → logo → color → type → imagery → applications — not a form dump.
 */
import { mapPaletteRoles, normalizeHex, bestTextOn } from './color'
import {
  buildColorSystem,
  decisionLineFromPack,
  DEFAULT_LOGO_CLEARSPACE,
  DEFAULT_LOGO_MIN_SIZE,
  TYPE_SCALE,
  ROLE_JOBS,
} from './brandSystem'
import { filledDetectiveChapters } from './detectiveBrief'
import { pinVisualKind } from './moodPins'
import { touchpointsFor, touchpointsBlurb } from './touchpoints'
import { slugifyFilename, downloadBlob, writeToSaveHandle } from './exportFiles'

// ── Shared PDF text / image helpers (WinAnsi-safe + raster only) ─────────

function pdfSafeText(input) {
  return String(input ?? '')
    .replace(/\u202f|\u00a0/g, ' ')
    .replace(/[\u2018\u2019\u201a\u2032]/g, "'")
    .replace(/[\u201c\u201d\u201e\u2033\u2036]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
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

function drawMonogramMark(pdf, x, y, size, inkRgb, wordmark) {
  const [r, g, b] = inkRgb || [28, 25, 23]
  const cx = x + size / 2
  const cy = y + size / 2
  const rad = size * 0.36
  pdf.setDrawColor(r, g, b)
  pdf.setLineWidth(Math.max(2, size * 0.085))
  pdf.circle(cx, cy, rad, 'S')
  pdf.setLineWidth(Math.max(1.5, size * 0.06))
  const yArc = cy + rad * 0.55
  pdf.line(cx - rad * 0.55, yArc, cx + rad * 0.55, yArc)
  const letters = String(wordmark || 'B')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(Math.max(11, size * 0.32))
  pdf.setTextColor(r, g, b)
  pdf.text(letters || 'B', cx, cy + size * 0.11, { align: 'center' })
}

/**
 * Application-first multi-page brand book.
 * @param {object} packIn
 * @param {Promise|null} handlePromise
 * @param {{ hideWatermark?: boolean, returnBlobOnly?: boolean }} [options]
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
    const hideWatermark = !!options.hideWatermark

    const pageW = 612
    const pageH = 792
    const margin = 40
    const contentW = pageW - margin * 2
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true })

    const colors = (pack?.palette || [])
      .map((c) => normalizeHex(c) || c)
      .filter(Boolean)
    const roles = {
      ...mapPaletteRoles(colors),
      ...(pack?.colorRoles || {}),
    }
    const coverHex = packCoverHex(pack)
    const coverRgb = hexToRgb(coverHex) || [28, 25, 23]
    const fgHex = bestTextOn(coverHex)
    const fgRgb = hexToRgb(fgHex) || [250, 250, 249]
    const accentHex =
      normalizeHex(roles.accent) || colors[1] || colors[0] || '#0F766E'
    const accentRgb = hexToRgb(accentHex) || [15, 118, 110]
    const quietHex =
      normalizeHex(roles.quiet) || colors[colors.length - 1] || '#FAFAF9'
    const quietRgb = hexToRgb(quietHex) || [250, 250, 249]
    const inkOnQuiet = hexToRgb(bestTextOn(quietHex)) || [28, 25, 23]
    const inkOnAccent = hexToRgb(bestTextOn(accentHex)) || [255, 255, 255]
    const wordmark =
      String(pack?.logoWordmark || '').trim() ||
      pack?.projectName ||
      'Brand'
    const projectName = String(pack?.projectName || 'Untitled project')
    const tag = String(pack?.tagline || '').trim() || 'Tagline TBD'
    const day = new Date().toLocaleDateString()
    const colorSys = buildColorSystem(colors, pack?.colorRoles)
    const doT = String(pack?.doUse || '').trim()
    const dontT = String(pack?.dontUse || '').trim()
    const pins = Array.isArray(pack?.pins) ? pack.pins : []
    const decision = decisionLineFromPack(pack)
    const voice = String(pack?.voice || '').trim()
    const chapters = filledDetectiveChapters(pack?.detective || {})

    let pageIndex = 0
    let y = margin

    const newPage = () => {
      pdf.addPage()
      pageIndex += 1
      y = margin
    }

    const tryLogo = (x, yy, size, inkRgb, opts = {}) => {
      const monochrome = !!opts.monochrome
      const src = pack?.logoImage
      const fmt = imageFormatFromDataUrl(src)
      if (!monochrome && fmt && src) {
        try {
          pdf.addImage(src, fmt, x, yy, size, size)
          return true
        } catch {
          /* fall through */
        }
      }
      drawMonogramMark(pdf, x, yy, size, inkRgb || inkOnQuiet, wordmark)
      return false
    }

    const footerAll = () => {
      const total = pdf.getNumberOfPages()
      const left = hideWatermark
        ? pdfSafeText(projectName).slice(0, 40)
        : pdfSafeText(`Creative Companion · ${projectName}`).slice(0, 48)
      // Page 1 is a clean cover — no TOC, no page chrome footer
      for (let i = 2; i <= total; i++) {
        pdf.setPage(i)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        /* 100, not 150. #969696 on white measures 2.96:1 — under the 4.5:1
           floor — on a footer that carries the page numbers and the studio
           name in a document sent to clients. 100,100,100 is 5.92:1 and is
           already this file's dominant muted grey, so this fixes the
           contrast and one of its several unlabelled greys at once. */
        pdf.setTextColor(100, 100, 100)
        pdf.text(left, margin, pageH - 22)
        pdf.text(`${i} / ${total}`, pageW - margin, pageH - 22, {
          align: 'right',
        })
      }
    }

    const sectionLabel = (text, color = accentRgb) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(color[0], color[1], color[2])
      pdf.text(pdfSafeText(String(text).toUpperCase()), margin, y)
      y += 14
    }

    const pageHead = (title, sub) => {
      y = margin
      pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
      pdf.rect(0, 0, pageW, 8, 'F')
      pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
      pdf.rect(0, 0, 8, pageH, 'F')
      y = margin + 6
      sectionLabel('Brand system')
      /* Extra headroom for the 24pt title.
         `sectionLabel` advances 14pt, which suits the 10pt body it precedes
         elsewhere. jsPDF positions text by BASELINE, and a 24pt face has
         roughly 17pt of ascent — so a 14pt gap put the title's ascenders
         about 3pt ABOVE the eyebrow's baseline, striking "BRAND SYSTEM"
         through on every page of the book.

         Found twice independently, and fixed here at +14 rather than the
         +10 of the other attempt: derived from the ascent rather than
         eyeballed, so it survives a change to TITLE_PT. Stays local to this
         heading rather than changing the shared helper, which is correct at
         14pt for the 10pt body it precedes elsewhere. */
      const TITLE_PT = 24
      y += TITLE_PT - 14 + 4
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(TITLE_PT)
      pdf.setTextColor(20, 18, 17)
      pdf.text(pdfSafeText(title), margin, y)
      y += 18
      if (sub) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(90, 90, 90)
        const lines = pdf.splitTextToSize(pdfSafeText(sub), contentW)
        pdf.text(lines, margin, y)
        y += lines.length * 13 + 8
      } else {
        y += 6
      }
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.6)
      pdf.line(margin, y, margin + contentW, y)
      y += 14
    }

    /* The bottom of the writable area. Below this sits the footer band that
       `footerAll` draws at pageH - 22. */
    const floorY = () => pageH - 60

    /**
     * The book's one pagination mechanism.
     *
     * Most sections used to write straight down the page with no room check
     * at all, so a long answer in Story, Imagery, Usage or Handoff ran off the
     * bottom edge and simply never appeared in the file the client was sent.
     * Silently dropping something the user typed, from the deliverable, is the
     * worst failure this document has — worse than an ugly page break, because
     * nothing on screen or in the file says it happened.
     *
     * Callers declare the height they are about to consume; if it will not fit,
     * the section continues on a fresh page under its own heading so the reader
     * never loses the thread. One helper rather than a copy per section: a
     * fifth copy is how four of them came to be missing in the first place.
     *
     * @returns {boolean} true if it broke to a new page
     */
    const ensureRoomFor = (need, title, sub = 'Continued.') => {
      if (y + need <= floorY()) return false
      newPage()
      if (title) pageHead(title, sub)
      return true
    }

    /**
     * Draw pre-wrapped lines, breaking across pages when they don't fit.
     *
     * `lineH` is the caller's own cursor advance rather than jsPDF's internal
     * leading, which is smaller. Reserving the larger of the two means a chunk
     * always occupies less room than was claimed for it, so a block can never
     * spill past the floor — and output is byte-identical to before whenever
     * the block did fit, which is the common case.
     */
    const writeFlowingLines = (lines, lineH, title, sub = 'Continued.') => {
      let i = 0
      while (i < lines.length) {
        const room = Math.floor((floorY() - y) / lineH)
        if (room < 1) {
          newPage()
          if (title) pageHead(title, sub)
          continue
        }
        const chunk = lines.slice(i, i + room)
        pdf.text(chunk, margin, y)
        y += chunk.length * lineH
        i += chunk.length
        if (i < lines.length) {
          newPage()
          if (title) pageHead(title, sub)
        }
      }
    }

    // ═══════════════════════════════════════════════
    // 1. COVER — full brand world (clean, centered)
    // ═══════════════════════════════════════════════
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.rect(0, 0, pageW, pageH, 'F')
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.rect(0, 0, pageW, 10, 'F')

    // Centered stack: label → logo → name → tagline → rule
    const cx = pageW / 2
    const markSizeCover = 88
    // Vertically center the brand block in the upper two-thirds
    let cy = pageH * 0.22

    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('VISUAL IDENTITY SYSTEM', cx, cy, { align: 'center' })

    cy += 32
    tryLogo(cx - markSizeCover / 2, cy, markSizeCover, fgRgb, {
      monochrome: true,
    })
    cy += markSizeCover + 40

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(36)
    const titleLines = pdf.splitTextToSize(
      pdfSafeText(projectName),
      contentW - 24
    )
    pdf.text(titleLines, cx, cy, { align: 'center' })
    cy += titleLines.length * 40 + 16

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(16)
    const tagLines = pdf.splitTextToSize(pdfSafeText(tag), contentW - 24)
    pdf.text(tagLines, cx, cy, { align: 'center' })
    cy += tagLines.length * 22 + 20

    // Centered gold rule
    const ruleW = 56
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.rect(cx - ruleW / 2, cy, ruleW, 3, 'F')

    // Quiet meta — centered, single line
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const meta = hideWatermark
      ? day
      : `${day}  ·  Creative Companion`
    pdf.text(meta, cx, pageH - 40, { align: 'center' })

    // ═══════════════════════════════════════════════
    // ═══════════════════════════════════════════════
    // 1b. STORY — why this brand exists, in the client's words
    // ═══════════════════════════════════════════════
    /* Every style-guide structure opens with the brand story, and the brief
       has asked for it all along ("How did the business start?", "What does
       your business do?", "three words a customer would use"). None of the
       three were printed anywhere. A guide without them is a spec sheet. */
    const storyBlocks = [
      ['Story', pack?.story],
      ['What they do', pack?.usp],
      ['In their words', pack?.toneOfVoice],
    ].filter(([, v]) => String(v || '').trim())

    if (storyBlocks.length) {
      newPage()
      pageHead('Story', 'Why this brand exists, in their own words.')
      storyBlocks.forEach(([label, value]) => {
        /* Wrap at the body face before measuring — splitTextToSize wraps to
           whatever size is currently set, and the label above it is 8pt. */
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        const lines = pdf.splitTextToSize(pdfSafeText(String(value)), contentW)
        // Keep the label with at least its first line rather than stranding it.
        ensureRoomFor(14 + 15, 'Story')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
        pdf.text(pdfSafeText(label.toUpperCase()), margin, y)
        y += 14
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(40, 40, 40)
        writeFlowingLines(lines, 15, 'Story')
        y += 18
      })
    }

    // 2. STRATEGY STRIP — one page, designed tiles
    // ═══════════════════════════════════════════════
    newPage()
    pageHead(
      'Direction',
      'Who we are for, how we sound, and the promise we keep.'
    )

    // Tagline hero
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.roundedRect(margin, y, contentW, 76, 8, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.text('TAGLINE', margin + 18, y + 22)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(17)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const tBig = pdf.splitTextToSize(pdfSafeText(tag), contentW - 36)
    pdf.text(tBig.slice(0, 2), margin + 18, y + 46)
    y += 70  // Reduced from 90 to 70 to reduce top-heaviness

    // 2×2 personality / pillars — tall enough for 4 lines so voice isn't clipped
    const cellW = (contentW - 12) / 2
    const cellH = 88  // Reduced from 104 to 88 to reduce empty space under short copy
    const tiles = [
      {
        label: 'Promise',
        body: pack?.messagingPromise || voice || '—',
        bg: quietRgb,
        ink: inkOnQuiet,
      },
      {
        label: 'Proof',
        body: pack?.messagingProof || decision || '—',
        bg: [245, 245, 244],
        ink: [40, 40, 40],
      },
      {
        label: 'Personality',
        body: pack?.messagingPersonality || voice || '—',
        bg: accentRgb,
        ink: inkOnAccent,
      },
      {
        label: 'Voice',
        body: voice || pack?.brief || '—',
        bg: coverRgb,
        ink: fgRgb,
      },
    ]
    tiles.forEach((tile, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const x = margin + col * (cellW + 12)
      const yy = y + row * (cellH + 10)
      /* Round `yy`, the per-ROW position — not `y`, the top of the block.
         Rounding `y` gave every tile the same vertical origin, so row two
         (Personality, Voice) painted directly over row one (Promise, Proof)
         and the Direction page showed two tiles where there are four.
         Same stale-snapshot mistake as the Agreed brief block, in a second
         place: there the cursor advanced under a captured value, here a
         computed row offset was discarded for the value it was derived from. */
      const crispX = Math.round(x)
      const crispY = Math.round(yy)
      const crispCellW = Math.round(cellW)
      const crispCellH = Math.round(cellH)

      pdf.setFillColor(tile.bg[0], tile.bg[1], tile.bg[2])
      pdf.roundedRect(crispX, crispY, crispCellW, crispCellH, 6, 6, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(tile.ink[0], tile.ink[1], tile.ink[2])
      pdf.text(tile.label.toUpperCase(), crispX + 14, crispY + 18)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      const bl = pdf.splitTextToSize(pdfSafeText(tile.body), crispCellW - 28)
      if (bl.length > 0) {
        pdf.text(bl.slice(0, 4), crispX + 14, crispY + 32)
      }
    })
    y += 2 * (cellH + 10) + 8  // Reduced from +14 to +8

    // One-line decision if any
    if (decision) {
      y += 10
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('DIRECTION DECISION', margin, y)
      y += 12
      pdf.setFont('helvetica', 'italic')  // Italic for emphasis
      pdf.setFontSize(11)
      pdf.setTextColor(30, 28, 27)
      const dl = pdf.splitTextToSize(pdfSafeText('« ' + decision + ' »'), contentW)  // Add quotes
      pdf.text(dl.slice(0, 3), margin, y)
      y += 18  // Extra space after decision
    }

    /* THE ASK — StoryBrand's plan and single call to action.
       Promise and Proof say what the brand claims; these say what the reader
       is meant to DO about it. Every piece of collateral designed from this
       book should end in the CTA, so it belongs on the same page as the
       pillars rather than buried in the brief section. */
    const askBlocks = [
      ['The plan', pack?.messagingPlan],
      ['The one action', pack?.messagingCta],
    ].filter(([, v]) => String(v || '').trim())

    if (askBlocks.length) {
      /* The tiles and an optional decision have already consumed most of the
         page; measure before writing rather than trusting it fits. */
      const need = askBlocks.length * 46 + 16
      if (y + need > pageH - 60) {
        newPage()
        pageHead('Direction', 'What we want the reader to do.')
      } else {
        y += 10
      }
      askBlocks.forEach(([label, value]) => {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
        pdf.text(pdfSafeText(label.toUpperCase()), margin, y)
        y += 13
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(40, 40, 40)
        const lines = pdf.splitTextToSize(pdfSafeText(String(value)), contentW)
        pdf.text(lines, margin, y)
        y += lines.length * 15 + 14
      })
    }

    // ═══════════════════════════════════════════════
    // 3. AGREED BRIEF — the record of what was agreed, not a form
    // ═══════════════════════════════════════════════
    // Pattern from two studio reference briefs (see todo.md): a question is
    // never asked bare. Every answer keeps its worked example (the field's
    // `tip`) directly beneath the question, and the answer itself sits in a
    // visually distinct box rather than running on as plain text — the same
    // distinction the on-screen form already makes between label and input.
    let briefStartPage = 0
    if (chapters.length) {
      newPage()
      briefStartPage = pageIndex + 1
      pageHead('Agreed brief', 'The answers that shaped this system.')

      /* Delegates to the shared helper so the book has exactly one pagination
         mechanism. This section was the only one that ever had a room check;
         four others went without, which is precisely the failure a private
         copy invites. Keeps its own full sub-heading on continuation pages
         rather than "Continued." — unchanged from before. */
      const ensureRoom = (need) =>
        ensureRoomFor(
          need,
          'Agreed brief',
          'The answers that shaped this system.'
        )

      chapters.forEach((ch) => {
        ensureRoom(36) // Increased from 28 to provide more space after section header
        sectionLabel(`${ch.num} · ${ch.title}`)
        y += 6 // Additional space after section header (similar to page 2 fix)

        ch.rows.forEach((row) => {
          // Improved field rhythm with better spacing for readability
          const qLh = 13
          const tipLh = 11
          const ansLh = 13
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10)
          const qLines = pdf.splitTextToSize(pdfSafeText(row.label), contentW)
          // A dozen tips already open with "e.g." in the schema — don't
          // double it.
          const tipText = row.tip
            ? /^e\.g\.?\s/i.test(row.tip)
              ? row.tip
              : `e.g. ${row.tip}`
            : ''
          const tipLines = tipText
            ? pdf.splitTextToSize(pdfSafeText(tipText), contentW)
            : []
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
          // A long, thoughtfully-written answer silently cut off mid-
          // sentence in a client-facing document is worse than one that
          // says plainly it's been shortened.
          const ansLinesFull = pdf.splitTextToSize(
            pdfSafeText(row.answer),
            contentW - 20
          )
          const ansTruncated = ansLinesFull.length > 5
          const ansLines = ansTruncated
            ? [...ansLinesFull.slice(0, 4), '… (see full answer in-app)']
            : ansLinesFull

          // Single-line answers get a slim chip; multi-line keep readable pad
          const boxPadY = ansLines.length <= 1 ? 7 : 9
          const boxH = Math.max(
            26,
            ansLines.length * ansLh + boxPadY * 2
          )
          const blockH =
            qLines.length * qLh +
            (tipLines.length ? tipLines.length * tipLh + 4 : 0) + // Increased from +2 to +4 for better question-tip separation
            4 + // Increased from 3 to 4 for better tip-to-box spacing
            boxH +
            8
          ensureRoom(blockH)

          // Use crisp coordinates for better rendering
          const crispMargin = Math.round(margin)
          const crispContentW = Math.round(contentW)
          const crispBoxH = Math.round(boxH)
          /* Rounded AT EACH DRAW, not captured once.
             `const crispY = Math.round(y)` here snapshotted the cursor before
             anything was written, and the question, the tip and the answer
             box were then all drawn at that one value while `y` advanced
             underneath them — so every field printed its question on top of
             its own tip. Only fields with no tip (the spectrum) escaped it.
             A rounding helper has to read the cursor when it is used. */
          const crisp = () => Math.round(y)

          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10)
          pdf.setTextColor(20, 18, 17)
          pdf.text(qLines, crispMargin, crisp())
          y += qLines.length * qLh
          y += 4 // Added space between question and tip (was 0)

          if (tipLines.length) {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(9)
            pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
            pdf.text(tipLines, crispMargin, crisp())
            y += tipLines.length * tipLh + 4 // Increased from +2 to +4 for better spacing
          }
          y += 4 // Increased from 3 to 4 for better gap before box

          pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
          pdf.roundedRect(crispMargin, crisp(), crispContentW, crispBoxH, 4, 4, 'F')
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
          pdf.setTextColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
          // Vertically center single-line text; multi-line starts after pad
          const textY =
            ansLines.length <= 1
              ? crisp() + crispBoxH / 2 + 3.5
              : crisp() + boxPadY + 9
          pdf.text(ansLines, crispMargin + 10, textY)
          y += boxH + 8
        })
      })
    }

    // ═══════════════════════════════════════════════
    // 4. LOGO SYSTEM
    // ═══════════════════════════════════════════════
    newPage()
    pageHead('Logo system', 'Primary lockups, reverse, mono, and clearspace.')

    const lockW = (contentW - 12) / 2
    const lockH = 132
    const markSize = 52

    const lockup = (x, yy, w, h, label, bg, ink, border) => {
      pdf.setFillColor(bg[0], bg[1], bg[2])
      if (border) {
        pdf.setDrawColor(border[0], border[1], border[2])
        pdf.setLineWidth(0.8)
        pdf.roundedRect(x, yy, w, h, 8, 8, 'FD')
      } else {
        pdf.roundedRect(x, yy, w, h, 8, 8, 'F')
      }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(7)
      pdf.setTextColor(ink[0], ink[1], ink[2])
      pdf.text(label.toUpperCase(), x + 14, yy + 16)
      tryLogo(x + 16, yy + 36, markSize, ink, { monochrome: true })
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      const wm = pdf.splitTextToSize(pdfSafeText(wordmark), w - markSize - 44)
      pdf.text(wm.slice(0, 2), x + 16 + markSize + 12, yy + 36 + markSize / 2 + 4)
    }

    lockup(margin, y, lockW, lockH, 'Primary', quietRgb, inkOnQuiet, [220, 220, 220])
    lockup(margin + lockW + 12, y, lockW, lockH, 'Reverse', coverRgb, fgRgb, null)
    y += lockH + 10
    lockup(margin, y, lockW, lockH, 'Mono', [255, 255, 255], [28, 25, 23], [200, 200, 200])
    lockup(margin + lockW + 12, y, lockW, lockH, 'On accent', accentRgb, inkOnAccent, null)
    y += lockH + 14

    // Clearspace + don'ts row
    // Box is 96pt tall; text baseline needs clear air below it (font sits
    // above the y we pass). Too little advance caused "DON'T" to sit inside
    // the dashed clearspace square.
    const clearBox = 96
    const clearTop = y
    const cs = 64
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineDashPattern([2, 2], 0)
    pdf.rect(margin, clearTop, clearBox, clearBox)
    pdf.setLineDashPattern([], 0)
    tryLogo(margin + 16, clearTop + 16, cs, inkOnQuiet, { monochrome: true })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('CLEARSPACE', margin + 112, clearTop + 16)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(50, 50, 50)
    const clearLines = pdf
      .splitTextToSize(
        pdfSafeText(pack?.logoClearspace || DEFAULT_LOGO_CLEARSPACE),
        contentW - 120
      )
      .slice(0, 3)
    pdf.text(clearLines, margin + 112, clearTop + 32)
    pdf.text(
      pdfSafeText(`Min: ${pack?.logoMinSize || DEFAULT_LOGO_MIN_SIZE}`),
      margin + 112,
      clearTop + 78
    )
    // Clearspace box bottom + gap, never underlap following labels
    y = clearTop + clearBox + 22

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text("DON'T", margin, y)
    y += 12
    const avoidW = (contentW - 16) / 3
    ;['Stretch', 'Recolor wild', 'Low contrast'].forEach((lab, i) => {
      const x = margin + i * (avoidW + 8)
      pdf.setFillColor(252, 246, 246)
      pdf.setDrawColor(210, 170, 170)
      pdf.roundedRect(x, y, avoidW, 32, 4, 4, 'FD')
      // strike visual
      pdf.setDrawColor(180, 80, 80)
      pdf.setLineWidth(1.2)
      pdf.line(x + 10, y + 16, x + avoidW - 10, y + 16)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(153, 27, 27)
      pdf.text(lab.toUpperCase(), x + 10, y + 14)
    })
    y += 40

    // ═══════════════════════════════════════════════
    // 5. COLOR SYSTEM — designed spread
    // ═══════════════════════════════════════════════
    newPage()
    pageHead('Color system', 'Roles first. Use them as jobs, not decoration.')

    if (colors.length) {
      const n = Math.min(colors.length, 5)
      const swW = contentW / n
      const swH = 100
      colors.slice(0, n).forEach((hex, i) => {
        const rgb = hexToRgb(hex) || [136, 136, 136]
        const x = margin + i * swW
        pdf.setFillColor(rgb[0], rgb[1], rgb[2])
        pdf.rect(x, y, swW - 3, swH, 'F')
        const labInk = hexToRgb(bestTextOn(hex)) || [255, 255, 255]
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(labInk[0], labInk[1], labInk[2])
        pdf.text(String(hex).toUpperCase(), x + 8, y + swH - 14)
      })
      y += swH + 16
    }

    // Role rows as full-width bars
    colorSys.roleRows.forEach((row) => {
      const rgb = hexToRgb(row.hex) || [136, 136, 136]
      const ink = hexToRgb(bestTextOn(row.hex)) || [255, 255, 255]
      pdf.setFillColor(rgb[0], rgb[1], rgb[2])
      pdf.roundedRect(margin, y, contentW, 40, 4, 4, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(ink[0], ink[1], ink[2])
      pdf.text(row.role.toUpperCase(), margin + 14, y + 16)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text(
        pdfSafeText(
          `${row.hex}  ·  ${row.rgb || ''}  ·  ${ROLE_JOBS[row.role] || row.job || ''}`
        ),
        margin + 14,
        y + 30
      )
      y += 46
    })

    // AA pairs compact
    if (colorSys.passPairs?.length) {
      y += 2
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('AA PASS PAIRS (BODY >= 4.5:1)', margin, y)
      y += 12
      colorSys.passPairs.slice(0, 6).forEach((p) => {
        const fg = hexToRgb(p.fg) || [0, 0, 0]
        const bg = hexToRgb(p.bg) || [255, 255, 255]
        pdf.setFillColor(bg[0], bg[1], bg[2])
        pdf.roundedRect(margin, y, 32, 15, 2, 2, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(fg[0], fg[1], fg[2])
        pdf.text('Aa', margin + 8, y + 11)
        pdf.setTextColor(40, 40, 40)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.text(
          pdfSafeText(`${p.fg} on ${p.bg}  ·  ${p.label}`),
          margin + 40,
          y + 11
        )
        y += 18
      })
    }

    // ═══════════════════════════════════════════════
    // 6. TYPE — specimen spread
    // ═══════════════════════════════════════════════
    newPage()
    pageHead(
      'Typography',
      'Face names for implementation. Specimens render in Helvetica for portability.'
    )

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('HEADING', margin, y)
    y += 22
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(28)
    pdf.setTextColor(20, 18, 17)
    pdf.text(pdfSafeText(pack?.typeHeading || 'Heading face'), margin, y)
    y += 24
    pdf.setFontSize(16)
    pdf.text('The quick brown fox jumps over the lazy dog.', margin, y)
    y += 28

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('BODY', margin, y)
    y += 16
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(13)
    pdf.setTextColor(40, 40, 40)
    pdf.text(pdfSafeText(pack?.typeBody || 'Body face'), margin, y)
    y += 18
    const bodySample = pdf.splitTextToSize(
      'Body copy should stay calm and readable. Hierarchy beats decoration. Keep line length comfortable and reserve accent color for actions.',
      contentW
    )
    pdf.setFontSize(11)
    pdf.text(bodySample, margin, y)
    y += bodySample.length * 14 + 18

    // Scale as designed rows
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('TYPE SCALE', margin, y)
    y += 12
    TYPE_SCALE.forEach((row) => {
      pdf.setFillColor(250, 250, 249)
      pdf.roundedRect(margin, y, contentW, 26, 3, 3, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(20, 18, 17)
      pdf.text(row.label, margin + 12, y + 17)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(80, 80, 80)
      pdf.text(
        pdfSafeText(`${row.size} · ${row.weight} — ${row.use}`),
        margin + 90,
        y + 17
      )
      y += 30
    })

    /* WRITING — the style-guide TOC's fifth section (Story, Audience, Visual,
       Voice, Writing), and the only one this book had nothing for. Voice says
       how the brand sounds; this says how the words are actually set. It sits
       under Typography because capitalisation is a typographic decision that
       whoever is setting the type needs in front of them. */
    const CASE_RULE = {
      sentence:
        'Headings use sentence case — capital on the first word only, as in a sentence.',
      title: 'Headings use title case — capital on each significant word.',
    }
    const CAPS_RULE = {
      never: 'Never set copy in ALL CAPS.',
      sparing:
        'ALL CAPS for short labels and eyebrows only — never for a sentence or a paragraph.',
      labels:
        'ALL CAPS is reserved for UI labels and navigation, where the string is one or two words.',
    }
    const writingRules = [
      CASE_RULE[pack?.writingCase],
      CAPS_RULE[pack?.writingCaps],
      String(pack?.writingNotes || '').trim(),
    ].filter(Boolean)

    if (writingRules.length) {
      if (y + writingRules.length * 30 + 30 > pageH - 60) {
        newPage()
        pageHead('Writing', 'How the words are set.')
      } else {
        y += 14
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text('WRITING', margin, y)
        y += 14
      }
      writingRules.forEach((rule) => {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(40, 40, 40)
        const lines = pdf.splitTextToSize(pdfSafeText(rule), contentW)
        pdf.text(lines, margin, y)
        y += lines.length * 14 + 8
      })
    }

    // ═══════════════════════════════════════════════
    // 7. IMAGERY (if any)
    // ═══════════════════════════════════════════════
    if (
      pins.length ||
      pack?.imageryStyle ||
      pack?.imageryDo ||
      pack?.imageryDont
    ) {
      newPage()
      pageHead(
        'Imagery',
        'Style rules and starred leave-behind references (max 6).'
      )
      if (pack?.imageryStyle || pack?.imageryDo || pack?.imageryDont) {
        const rules = [
          pack.imageryStyle && `Style: ${pack.imageryStyle}`,
          pack.imageryDo && `Do: ${pack.imageryDo}`,
          pack.imageryDont && `Don't: ${pack.imageryDont}`,
        ].filter(Boolean)
        rules.forEach((r) => {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(10)
          pdf.setTextColor(40, 40, 40)
          const lines = pdf.splitTextToSize(pdfSafeText(r), contentW)
          writeFlowingLines(lines, 12, 'Imagery')
          y += 4
        })
        y += 8
      }
      if (pins.length) {
        const cols = 3
        const gap = 10
        const cellW = (contentW - gap * (cols - 1)) / cols
        const cellH = 124
        const shown = pins.slice(0, 6)
        /* The grid draws at absolute offsets from y, so it cannot flow — if
           the rules above pushed the cursor down, move the whole grid to a
           fresh page rather than letting the second row fall off the edge. */
        const gridH = Math.ceil(shown.length / cols) * (cellH + 22)
        ensureRoomFor(gridH, 'Imagery')
        shown.forEach((pin, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = margin + col * (cellW + gap)
          const yy = y + row * (cellH + 22)
          pdf.setFillColor(245, 245, 244)
          pdf.setDrawColor(220, 220, 220)
          pdf.roundedRect(x, yy, cellW, cellH, 4, 4, 'FD')
          const kind = pinVisualKind(pin)
          const vis = String(pin.visual || '')
          const fmt = imageFormatFromDataUrl(vis)
          if (kind === 'image' && fmt) {
            try {
              pdf.addImage(vis, fmt, x + 3, yy + 3, cellW - 6, cellH - 6)
            } catch {
              /* skip */
            }
          } else if (kind === 'color' || kind === 'gradient' || /^#/i.test(vis)) {
            const hex = normalizeHex(vis) || '#D6D3D1'
            const rgb = hexToRgb(hex) || [214, 211, 209]
            pdf.setFillColor(rgb[0], rgb[1], rgb[2])
            pdf.rect(x + 3, yy + 3, cellW - 6, cellH - 6, 'F')
          }
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(7)
          pdf.setTextColor(60, 60, 60)
          const note = pdfSafeText(String(pin.note || 'Ref').slice(0, 48))
          pdf.text(
            pdf.splitTextToSize((pin.packHero ? '* ' : '') + note, cellW),
            x,
            yy + cellH + 11
          )
        })
        // The grid drew at offsets from y without moving it; leave the cursor
        // below the grid so anything added after this can't land on top of it.
        y += gridH
      }
    }

    // ═══════════════════════════════════════════════
    // 8. APPLICATIONS — the heart of the book
    // ═══════════════════════════════════════════════
    /* This page used to draw the same four mocks for every project — card,
       social, packaging, signage — whatever the brand was actually for. An
       app-only brand got a carrier bag; a bakery got a social tile it had no
       account for. Meanwhile "Where will this be used?" was asked in the
       brief and consumed by nothing.

       Each mock is now a renderer keyed by touchpoint, and `touchpointsFor`
       decides which ones run. Every renderer draws inside the box it is
       handed and reads nothing about page position, so the layout loop below
       owns all the coordinates — the crisp-coordinate bug that painted the
       Direction tiles on top of each other came from exactly the opposite
       arrangement. */
    const chosenTouchpoints = touchpointsFor(
      pack?.brandSurfaces,
      pack?.detective?.deliverablesPicked
    )

    const contactLine = [
      String(pack?.orgEmail || '').trim(),
      String(pack?.orgWebsite || '').trim(),
    ]
      .filter(
        (v) =>
          v && !/\.example\b|example\.com|brand\.example|you@example/i.test(v)
      )
      .join('  ·  ')

    const capText = (t, n) => pdfSafeText(String(t || '')).slice(0, n)

    const TOUCHPOINT_MOCKS = {
      businessCard: {
        label: 'BUSINESS CARD',
        h: 130,
        draw: (x, yy, w, h) => {
          pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
          pdf.setDrawColor(210, 210, 210)
          pdf.roundedRect(x, yy, w, h, 6, 6, 'FD')
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.rect(x, yy, 8, h, 'F')
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.rect(x + w - 52, yy, 52, h, 'F')
          tryLogo(x + w - 42, yy + 18, 32, fgRgb)
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(12)
          pdf.setTextColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
          pdf.text(capText(wordmark, 22), x + 20, yy + 34)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.text(capText(tag, 34), x + 20, yy + 50)
          if (contactLine) {
            pdf.setFontSize(7)
            pdf.text(capText(contactLine, 40), x + 20, yy + h - 20)
          }
        },
      },

      print: {
        label: 'PRINT',
        h: 130,
        draw: (x, yy, w, h) => {
          pdf.setFillColor(255, 255, 255)
          pdf.setDrawColor(210, 210, 210)
          pdf.roundedRect(x, yy, w, h, 4, 4, 'FD')
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.rect(x, yy, w, 46, 'F')
          tryLogo(x + 14, yy + 10, 26, fgRgb, { monochrome: true })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(20, 18, 17)
          pdf.text(capText(wordmark, 24), x + 14, yy + 70)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(70, 70, 70)
          pdf.text(capText(tag, 40), x + 14, yy + 86)
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.rect(x + 14, yy + h - 24, w - 28, 3, 'F')
        },
      },

      social: {
        label: 'SOCIAL POST',
        h: 130,
        draw: (x, yy, w, h) => {
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.roundedRect(x, yy, w, h, 6, 6, 'F')
          tryLogo(x + 12, yy + 14, 28, fgRgb, { monochrome: true })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10)
          pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
          pdf.text(
            pdf.splitTextToSize(pdfSafeText(tag), w - 24).slice(0, 2),
            x + 12,
            yy + 66
          )
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.roundedRect(x + 12, yy + h - 30, 52, 16, 3, 3, 'F')
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(7)
          pdf.setTextColor(inkOnAccent[0], inkOnAccent[1], inkOnAccent[2])
          pdf.text('SHOP', x + 26, yy + h - 19)
        },
      },

      website: {
        label: 'WEBSITE',
        h: 130,
        draw: (x, yy, w, h) => {
          pdf.setFillColor(255, 255, 255)
          pdf.setDrawColor(205, 205, 205)
          pdf.roundedRect(x, yy, w, h, 5, 5, 'FD')
          // browser chrome
          pdf.setFillColor(238, 238, 236)
          pdf.rect(x + 1, yy + 1, w - 2, 16, 'F')
          pdf.setFillColor(200, 200, 198)
          for (let d = 0; d < 3; d += 1) {
            pdf.circle(x + 10 + d * 9, yy + 9, 2.6, 'F')
          }
          // hero band
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.rect(x + 1, yy + 17, w - 2, 62, 'F')
          tryLogo(x + 12, yy + 26, 22, fgRgb, { monochrome: true })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
          pdf.text(capText(tag, 30), x + 12, yy + 68)
          // content rows
          pdf.setFillColor(232, 232, 230)
          pdf.rect(x + 12, yy + 90, w - 24, 5, 'F')
          pdf.rect(x + 12, yy + 100, (w - 24) * 0.7, 5, 'F')
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.roundedRect(x + 12, yy + h - 26, 46, 14, 3, 3, 'F')
        },
      },

      app: {
        label: 'APP',
        h: 190,
        draw: (x, yy, w, h) => {
          const phoneW = Math.min(96, w - 24)
          const px = x + (w - phoneW) / 2
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.setDrawColor(190, 190, 190)
          pdf.roundedRect(px, yy, phoneW, h, 12, 12, 'FD')
          // notch
          pdf.setFillColor(fgRgb[0], fgRgb[1], fgRgb[2])
          pdf.roundedRect(px + phoneW / 2 - 14, yy + 7, 28, 5, 2, 2, 'F')
          tryLogo(px + phoneW / 2 - 16, yy + 34, 32, fgRgb, { monochrome: true })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
          pdf.text(capText(wordmark, 16), px + phoneW / 2, yy + 88, {
            align: 'center',
          })
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.roundedRect(px + 14, yy + h - 46, phoneW - 28, 18, 4, 4, 'F')
          pdf.setFontSize(7)
          pdf.setTextColor(inkOnAccent[0], inkOnAccent[1], inkOnAccent[2])
          pdf.text('GET STARTED', px + phoneW / 2, yy + h - 34, {
            align: 'center',
          })
        },
      },

      email: {
        label: 'EMAIL',
        h: 130,
        draw: (x, yy, w, h) => {
          pdf.setFillColor(255, 255, 255)
          pdf.setDrawColor(210, 210, 210)
          pdf.roundedRect(x, yy, w, h, 4, 4, 'FD')
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.rect(x + 1, yy + 1, w - 2, 40, 'F')
          tryLogo(x + 12, yy + 8, 24, fgRgb, { monochrome: true })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9)
          pdf.setTextColor(20, 18, 17)
          pdf.text(capText(wordmark, 24), x + 12, yy + 60)
          pdf.setFillColor(232, 232, 230)
          pdf.rect(x + 12, yy + 70, w - 24, 5, 'F')
          pdf.rect(x + 12, yy + 80, (w - 24) * 0.8, 5, 'F')
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.roundedRect(x + 12, yy + h - 32, 44, 14, 3, 3, 'F')
          if (contactLine) {
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(6)
            pdf.setTextColor(120, 120, 120)
            pdf.text(capText(contactLine, 44), x + 12, yy + h - 8)
          }
        },
      },

      packaging: {
        label: 'PACKAGING',
        h: 190,
        draw: (x, yy, w, h) => {
          const bagW = Math.min(w - 20, w * 0.86)
          pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
          pdf.setDrawColor(200, 200, 200)
          pdf.roundedRect(x, yy, bagW, h, 4, 4, 'FD')
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.rect(x, yy, bagW, 36, 'F')
          tryLogo(x + bagW / 2 - 16, yy + 6, 24, fgRgb, { monochrome: true })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
          pdf.text(capText(wordmark, 20), x + 14, yy + 70)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(8)
          pdf.text(capText(tag, 30), x + 14, yy + 88)
          pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
          pdf.rect(x + 14, yy + h - 28, bagW - 28, 3, 'F')
        },
      },

      merch: {
        label: 'MERCH',
        h: 190,
        draw: (x, yy, w, h) => {
          const toteW = Math.min(w - 24, 132)
          const tx = x + (w - toteW) / 2
          const bodyTop = yy + 34
          const bodyH = h - 34
          // handles
          pdf.setDrawColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
          pdf.setLineWidth(2)
          pdf.line(tx + 22, bodyTop, tx + 34, yy + 6)
          pdf.line(tx + 34, yy + 6, tx + toteW - 34, yy + 6)
          pdf.line(tx + toteW - 34, yy + 6, tx + toteW - 22, bodyTop)
          pdf.setLineWidth(0.2)
          // body
          pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
          pdf.setDrawColor(200, 200, 200)
          pdf.roundedRect(tx, bodyTop, toteW, bodyH, 3, 3, 'FD')
          tryLogo(tx + toteW / 2 - 18, bodyTop + 32, 36, fgRgb, {
            monochrome: true,
          })
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(10)
          pdf.setTextColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
          pdf.text(capText(wordmark, 18), tx + toteW / 2, bodyTop + 92, {
            align: 'center',
          })
        },
      },

      signage: {
        label: 'SIGNAGE',
        h: 190,
        draw: (x, yy, w, h) => {
          pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
          pdf.roundedRect(x, yy, w, h, 6, 6, 'F')
          tryLogo(x + w / 2 - 28, yy + 28, 56, fgRgb)
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(14)
          pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
          pdf.text(capText(wordmark, 18), x + w / 2, yy + 112, {
            align: 'center',
          })
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.text(capText(tag, 26), x + w / 2, yy + 132, { align: 'center' })
        },
      },
    }

    const mocks = chosenTouchpoints
      .map((key) => ({ key, ...TOUCHPOINT_MOCKS[key] }))
      .filter((m) => typeof m.draw === 'function')

    if (mocks.length) {
      newPage()
      pageHead(
        'Applications',
        touchpointsBlurb(pack?.brandSurfaces, pack?.detective?.deliverablesPicked)
      )

      const colGap = 16
      const halfW = (contentW - colGap) / 2

      for (let i = 0; i < mocks.length; i += 2) {
        const pair = mocks.slice(i, i + 2)
        const rowH = Math.max(...pair.map((m) => m.h))
        // Label sits above the box, so the row needs both.
        if (y + rowH + 26 > pageH - 70) {
          newPage()
          pageHead('Applications', 'Continued.')
        }
        const rowY = Math.round(y)
        pair.forEach((m, col) => {
          const x = Math.round(margin + col * (halfW + colGap))
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(8)
          pdf.setTextColor(100, 100, 100)
          pdf.text(m.label, x, rowY)
          m.draw(x, rowY + 10, Math.round(halfW), m.h)
        })
        y = rowY + rowH + 34
      }

      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(120, 120, 120)
      pdf.text(
        'Mocks are direction proofs only - not production die-lines. Build finals from roles + type scale.',
        margin,
        y
      )
    }

    // ═══════════════════════════════════════════════
    // 9. USAGE (if any)
    // ═══════════════════════════════════════════════
    if (doT || dontT) {
      newPage()
      pageHead('Usage', 'Ship rules - clear guardrails, room to make.')

      const colW = (contentW - 16) / 2
      const headH = 28
      const bodyPad = 14
      const lineH = 14
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      let doLines = doT ? pdf.splitTextToSize(pdfSafeText(doT), colW - 28) : []
      let dontLines = dontT
        ? pdf.splitTextToSize(pdfSafeText(dontT), colW - 28)
        : []

      /* The cards are sized from their own line count, so a long rule list
         grew the box straight off the bottom of the page and the rest of the
         text went with it. Draw as many lines as the page can hold, then carry
         the remainder onto a continuation spread — the two columns stay
         side by side so DO and DON'T are always read against each other. */
      let firstSpread = true
      while (firstSpread || doLines.length || dontLines.length) {
        const maxBody = Math.max(
          1,
          Math.floor((floorY() - y - headH - bodyPad * 2) / lineH)
        )
        const doChunk = doLines.slice(0, maxBody)
        const dontChunk = dontLines.slice(0, maxBody)
        doLines = doLines.slice(doChunk.length)
        dontLines = dontLines.slice(dontChunk.length)

        /* On the first spread both cards are drawn even if one side is empty —
           DO and DON'T are read as a pair, and a missing half would look like
           a rendering fault. On a continuation page the pair has already been
           established, so a column that has run out draws nothing rather than
           an empty tinted box with a heading and no content. */
        const showDo = firstSpread || doChunk.length > 0
        const showDont = firstSpread || dontChunk.length > 0

        // Size cards to the text — fixed 200pt boxes left a half-page of empty tint
        const bodyLines = Math.max(doChunk.length, dontChunk.length, 2)
        const boxH = headH + bodyPad + bodyLines * lineH + bodyPad

        // DO
        if (showDo) {
          pdf.setFillColor(236, 250, 246)
          pdf.roundedRect(margin, y, colW, boxH, 8, 8, 'F')
          pdf.setFillColor(15, 118, 110)
          pdf.roundedRect(margin, y, colW, headH, 8, 8, 'F')
          pdf.rect(margin, y + 14, colW, 14, 'F')
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(255, 255, 255)
          pdf.text('DO', margin + 16, y + 19)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(11)
          pdf.setTextColor(20, 18, 17)
          if (doChunk.length) {
            pdf.text(doChunk, margin + 14, y + headH + bodyPad + 2)
          }
        }

        // DON'T
        const dx = margin + colW + 16
        if (showDont) {
          pdf.setFillColor(254, 242, 242)
          pdf.roundedRect(dx, y, colW, boxH, 8, 8, 'F')
          pdf.setFillColor(185, 28, 28)
          pdf.roundedRect(dx, y, colW, headH, 8, 8, 'F')
          pdf.rect(dx, y + 14, colW, 14, 'F')
          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(11)
          pdf.setTextColor(255, 255, 255)
          pdf.text("DON'T", dx + 16, y + 19)
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(11)
          pdf.setTextColor(20, 18, 17)
          if (dontChunk.length) {
            pdf.text(dontChunk, dx + 14, y + headH + bodyPad + 2)
          }
        }

        y += boxH
        firstSpread = false
        if (doLines.length || dontLines.length) {
          newPage()
          pageHead('Usage', 'Continued.')
        }
      }
    }

    // ═══════════════════════════════════════════════
    // 10. HANDOFF (compact)
    // ═══════════════════════════════════════════════
    newPage()
    pageHead('Handoff', 'What to take into your design tool next.')

    pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
    pdf.roundedRect(margin, y, contentW, 120, 8, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(20, 18, 17)
    pdf.text('Kit contents', margin + 18, y + 28)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(50, 50, 50)
    /* Constraints the client named that the next person must honour.
       `technical` (file types) and `accessibilityNeeds` were both collected
       and never printed — so whoever opened this book had to guess, or ask
       the client again for something they had already answered. */
    /* Print and finish sit here rather than on the Color page because this is
       the page someone opens when they are about to produce something. CMYK
       is already printed per swatch; a Pantone match, a stock and a finish are
       the three things no algorithm can derive from a hex value, and without
       them a printer has to phone and ask. */
    const constraints = [
      ['File formats needed', pack?.technical],
      ['Accessibility', pack?.accessibilityNeeds],
      ['Pantone match', pack?.printPantone],
      ['Paper stock', pack?.printStock],
      ['Finish', pack?.printFinish],
    ].filter(([, v]) => String(v || '').trim())

    const kit = [
      'brand-book.pdf  ·  this visual system',
      'brand.md  ·  written leave-behind',
      'tokens.css / tokens.json  ·  implementation tokens',
      'logo  ·  if uploaded to the project',
    ]
    kit.forEach((line, i) => {
      pdf.text(pdfSafeText(line), margin + 18, y + 52 + i * 16)
    })
    y += 140

    constraints.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      const lines = pdf.splitTextToSize(pdfSafeText(String(value)), contentW)
      // Keep each constraint's label with at least its first line of answer.
      ensureRoomFor(13 + 15, 'Handoff')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
      pdf.text(pdfSafeText(label.toUpperCase()), margin, y)
      y += 13
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(40, 40, 40)
      writeFlowingLines(lines, 15, 'Handoff')
      y += 16
    })

    if (pack?.handoffNote?.trim()) {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      const noteLines = pdf.splitTextToSize(
        pdfSafeText(pack.handoffNote),
        contentW
      )
      ensureRoomFor(14 + 15, 'Handoff')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('NOTE', margin, y)
      y += 14
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(40, 40, 40)
      writeFlowingLines(noteLines, 15, 'Handoff')
    }

    // The full agreed-brief answers already have their own section (with
    // each answer's worked example) — a second, capped-at-8 echo here would
    // be exactly the kind of duplicate copy that drifts as the first one is
    // edited. A page pointer costs the reader nothing to skip.
    if (briefStartPage) {
      y += 40
      if (y > pageH - 60) {
        newPage()
      }
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(
        pdfSafeText(`Full agreed brief — page ${briefStartPage}`),
        margin,
        y
      )
    }

    footerAll()

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
      }
    }

    if (handlePromise) {
      const written = await writeToSaveHandle(handlePromise, blob)
      if (written.ok || written.cancelled) {
        return {
          ...written,
          method: 'file-picker',
          mode: 'vector',
          pages: pdf.getNumberOfPages(),
        }
      }
    }
    try {
      pdf.save(name)
      return {
        ok: true,
        method: 'jspdf-save',
        mode: 'vector',
        pages: pdf.getNumberOfPages(),
      }
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
