/**
 * Application-first brand book (vector PDF).
 * Designed like a leave-behind system deck: cover world → logo → color → type
 * → imagery → applications — not a form dump.
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
import { briefHighlightsForPack } from './detectiveBrief'
import { pinVisualKind } from './moodPins'
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

/**
 * Rasterize any drawable image to a jsPDF-safe JPEG data URL.
 * Re-encodes existing PNG/JPEG too — strips alpha and odd PNG encodings that
 * silently fail in addImage (blank imagery tiles).
 * @param {string} src
 * @param {{ max?: number, mime?: 'image/jpeg'|'image/png', quality?: number }} [opts]
 */
async function rasterizeForPdf(src, opts = {}) {
  const s = String(src || '').trim()
  if (!s) return ''
  if (
    /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) ||
    s.startsWith('linear-gradient') ||
    s.startsWith('rgb')
  ) {
    return ''
  }
  // Node / non-DOM: pass through only PNG/JPEG data URLs
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return imageFormatFromDataUrl(s) ? s : ''
  }
  const max = opts.max || 960
  const mime = opts.mime || 'image/jpeg'
  const quality = opts.quality ?? 0.88
  return new Promise((resolve) => {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const nw = Math.max(1, img.naturalWidth || 512)
          const nh = Math.max(1, img.naturalHeight || 512)
          const scale = Math.min(1, max / Math.max(nw, nh))
          const w = Math.max(1, Math.round(nw * scale))
          const h = Math.max(1, Math.round(nh * scale))
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          const ctx = c.getContext('2d')
          if (!ctx) {
            resolve('')
            return
          }
          // Opaque cream fill so transparent marks don't vanish on cream lockups
          if (mime === 'image/jpeg') {
            ctx.fillStyle = '#F7F3EC'
            ctx.fillRect(0, 0, w, h)
          }
          ctx.drawImage(img, 0, 0, w, h)
          resolve(
            mime === 'image/png'
              ? c.toDataURL('image/png')
              : c.toDataURL('image/jpeg', quality)
          )
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
  if (logoImage) {
    // Keep logo as PNG so soft transparency works on cover; re-encode for safety
    const r = await rasterizeForPdf(logoImage, {
      max: 512,
      mime: 'image/png',
    })
    if (r) logoImage = r
    else if (!imageFormatFromDataUrl(logoImage)) logoImage = ''
  }
  const pins = await Promise.all(
    (Array.isArray(pack.pins) ? pack.pins : []).map(async (p) => {
      const visual = String(p?.visual || '')
      const kind = pinVisualKind(p)
      if (kind !== 'image') return p
      // Always re-encode image pins to JPEG — reliable jsPDF embed
      const r = await rasterizeForPdf(visual, {
        max: 720,
        mime: 'image/jpeg',
        quality: 0.86,
      })
      // Node path: pass through valid PNG/JPEG data URLs unchanged
      if (r) return { ...p, visual: r }
      if (imageFormatFromDataUrl(visual)) return p
      return { ...p, visual: '' }
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
    const briefRows = briefHighlightsForPack(pack?.detective || {}, 6)

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
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        // 100/100/100 ≈ 5.9:1 on white (footer is client-facing meta)
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
      y += 18
    }

    const pageHead = (title, sub) => {
      y = margin
      pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
      pdf.rect(0, 0, pageW, 8, 'F')
      pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
      pdf.rect(0, 0, 8, pageH, 'F')
      y = margin + 8
      sectionLabel('Brand system')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(26)
      pdf.setTextColor(20, 18, 17)
      pdf.text(pdfSafeText(title), margin, y)
      y += 22
      if (sub) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(90, 90, 90)
        const lines = pdf.splitTextToSize(pdfSafeText(sub), contentW)
        pdf.text(lines, margin, y)
        y += lines.length * 14 + 12
      } else {
        y += 8
      }
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.6)
      pdf.line(margin, y, margin + contentW, y)
      y += 20
    }

    // ═══════════════════════════════════════════════
    // 1. COVER — full brand world
    // ═══════════════════════════════════════════════
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.rect(0, 0, pageW, pageH, 'F')
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.rect(0, 0, pageW, 10, 'F')
    // Quiet block bottom third for TOC feel without prose dump
    pdf.setFillColor(
      Math.min(255, coverRgb[0] + 12),
      Math.min(255, coverRgb[1] + 12),
      Math.min(255, coverRgb[2] + 12)
    )
    pdf.rect(0, pageH - 160, pageW, 160, 'F')

    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('VISUAL IDENTITY SYSTEM', margin + 8, margin + 36)

    tryLogo(margin + 8, margin + 70, 88, fgRgb)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(36)
    const titleLines = pdf.splitTextToSize(pdfSafeText(projectName), contentW - 16)
    pdf.text(titleLines, margin + 8, margin + 200)
    let cy = margin + 200 + titleLines.length * 40
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(16)
    const tagLines = pdf.splitTextToSize(pdfSafeText(tag), contentW - 16)
    pdf.text(tagLines, margin + 8, cy)
    cy += tagLines.length * 22 + 16
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.rect(margin + 8, cy, 56, 3, 'F')

    // Bottom strip labels
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const toc = [
      'Logo',
      'Color',
      'Type',
      pins.length ? 'Imagery' : null,
      'Applications',
      doT || dontT ? 'Usage' : null,
    ].filter(Boolean)
    toc.forEach((t, i) => {
      pdf.text(pdfSafeText(t), margin + 8 + i * 90, pageH - 100)
    })
    pdf.setFontSize(8)
    pdf.text(day, margin + 8, pageH - 40)
    pdf.text(
      pdfSafeText(hideWatermark ? projectName : 'Creative Companion'),
      pageW - margin,
      pageH - 40,
      { align: 'right' }
    )

    // ═══════════════════════════════════════════════
    // 2. STRATEGY STRIP — one page, designed tiles
    // ═══════════════════════════════════════════════
    newPage()
    pageHead(
      'Direction',
      'Who we are for, how we sound, and the promise we keep.'
    )

    // Tagline hero
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.roundedRect(margin, y, contentW, 88, 8, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.text('TAGLINE', margin + 20, y + 24)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(18)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const tBig = pdf.splitTextToSize(pdfSafeText(tag), contentW - 40)
    pdf.text(tBig.slice(0, 2), margin + 20, y + 50)
    y += 104

    // 2×2 personality / pillars
    const cellW = (contentW - 12) / 2
    const cellH = 78
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
      const yy = y + row * (cellH + 12)
      pdf.setFillColor(tile.bg[0], tile.bg[1], tile.bg[2])
      pdf.roundedRect(x, yy, cellW, cellH, 6, 6, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(tile.ink[0], tile.ink[1], tile.ink[2])
      pdf.text(tile.label.toUpperCase(), x + 14, yy + 20)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      const bl = pdf.splitTextToSize(pdfSafeText(tile.body), cellW - 28)
      pdf.text(bl.slice(0, 3), x + 14, yy + 38)
    })
    y += 2 * (cellH + 12) + 16

    // One-line decision if any
    if (decision) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('DIRECTION DECISION', margin, y)
      y += 14
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(30, 28, 27)
      const dl = pdf.splitTextToSize(pdfSafeText(decision), contentW)
      pdf.text(dl.slice(0, 3), margin, y)
    }

    // ═══════════════════════════════════════════════
    // 3. LOGO SYSTEM
    // ═══════════════════════════════════════════════
    newPage()
    pageHead('Logo system', 'Primary lockups, reverse, mono, and clearspace.')

    const lockW = (contentW - 14) / 2
    const lockH = 120
    const markSize = 48

    const lockup = (x, yy, w, h, label, bg, ink, border, { mono = true } = {}) => {
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
      // Primary shows the real mark when uploaded; reverse/mono stay ink-only
      tryLogo(x + 16, yy + 36, markSize, ink, { monochrome: mono })
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(13)
      const wm = pdf.splitTextToSize(pdfSafeText(wordmark), w - markSize - 44)
      pdf.text(wm.slice(0, 2), x + 16 + markSize + 12, yy + 36 + markSize / 2 + 4)
    }

    lockup(margin, y, lockW, lockH, 'Primary', quietRgb, inkOnQuiet, [220, 220, 220], {
      mono: false,
    })
    lockup(margin + lockW + 14, y, lockW, lockH, 'Reverse', coverRgb, fgRgb, null)
    y += lockH + 12
    lockup(margin, y, lockW, lockH, 'Mono', [255, 255, 255], [28, 25, 23], [200, 200, 200])
    lockup(margin + lockW + 14, y, lockW, lockH, 'On accent', accentRgb, inkOnAccent, null)
    y += lockH + 20

    // Clearspace + don'ts row
    const cs = 64
    pdf.setDrawColor(200, 200, 200)
    pdf.setLineDashPattern([2, 2], 0)
    pdf.rect(margin, y, 96, 96)
    pdf.setLineDashPattern([], 0)
    tryLogo(margin + 16, y + 16, cs, inkOnQuiet, { monochrome: true })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('CLEARSPACE', margin + 112, y + 16)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(50, 50, 50)
    pdf.text(
      pdf.splitTextToSize(
        pdfSafeText(pack?.logoClearspace || DEFAULT_LOGO_CLEARSPACE),
        contentW - 120
      ).slice(0, 3),
      margin + 112,
      y + 32
    )
    pdf.text(
      pdfSafeText(`Min: ${pack?.logoMinSize || DEFAULT_LOGO_MIN_SIZE}`),
      margin + 112,
      y + 78
    )
    y += 112

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
      pdf.roundedRect(x, y, avoidW, 36, 4, 4, 'FD')
      // strike visual
      pdf.setDrawColor(180, 80, 80)
      pdf.setLineWidth(1.2)
      pdf.line(x + 10, y + 18, x + avoidW - 10, y + 18)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(153, 27, 27)
      pdf.text(lab.toUpperCase(), x + 10, y + 16)
    })
    y += 48

    // ═══════════════════════════════════════════════
    // 4. COLOR SYSTEM — designed spread
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
      y += swH + 24
    }

    // Role rows as full-width bars
    colorSys.roleRows.forEach((row) => {
      const rgb = hexToRgb(row.hex) || [136, 136, 136]
      const ink = hexToRgb(bestTextOn(row.hex)) || [255, 255, 255]
      pdf.setFillColor(rgb[0], rgb[1], rgb[2])
      pdf.roundedRect(margin, y, contentW, 44, 4, 4, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(ink[0], ink[1], ink[2])
      pdf.text(row.role.toUpperCase(), margin + 14, y + 18)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.text(
        pdfSafeText(
          `${row.hex}  ·  ${row.rgb || ''}  ·  ${ROLE_JOBS[row.role] || row.job || ''}`
        ),
        margin + 14,
        y + 34
      )
      y += 52
    })

    // AA pairs compact
    if (colorSys.passPairs?.length) {
      y += 4
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('AA PASS PAIRS (BODY >= 4.5:1)', margin, y)
      y += 14
      colorSys.passPairs.slice(0, 6).forEach((p) => {
        const fg = hexToRgb(p.fg) || [0, 0, 0]
        const bg = hexToRgb(p.bg) || [255, 255, 255]
        pdf.setFillColor(bg[0], bg[1], bg[2])
        pdf.roundedRect(margin, y, 32, 16, 2, 2, 'F')
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
        y += 20
      })
    }

    // ═══════════════════════════════════════════════
    // 5. TYPE — specimen spread
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
    y += 28
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(32)
    pdf.setTextColor(20, 18, 17)
    pdf.text(pdfSafeText(pack?.typeHeading || 'Heading face'), margin, y)
    y += 28
    pdf.setFontSize(18)
    pdf.text('The quick brown fox jumps over the lazy dog.', margin, y)
    y += 36

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('BODY', margin, y)
    y += 18
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(14)
    pdf.setTextColor(40, 40, 40)
    pdf.text(pdfSafeText(pack?.typeBody || 'Body face'), margin, y)
    y += 20
    const bodySample = pdf.splitTextToSize(
      'Body copy should stay calm and readable. Hierarchy beats decoration. Keep line length comfortable and reserve accent color for actions.',
      contentW
    )
    pdf.setFontSize(11)
    pdf.text(bodySample, margin, y)
    y += bodySample.length * 15 + 24

    // Scale as designed rows
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('TYPE SCALE', margin, y)
    y += 16
    TYPE_SCALE.forEach((row) => {
      pdf.setFillColor(250, 250, 249)
      pdf.roundedRect(margin, y, contentW, 28, 3, 3, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(20, 18, 17)
      pdf.text(row.label, margin + 12, y + 18)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(80, 80, 80)
      pdf.text(
        pdfSafeText(`${row.size} · ${row.weight} — ${row.use}`),
        margin + 90,
        y + 18
      )
      y += 34
    })

    // ═══════════════════════════════════════════════
    // 6. IMAGERY (if any)
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
          pdf.text(lines, margin, y)
          y += lines.length * 13 + 6
        })
        y += 10
      }
      if (pins.length) {
        const cols = 3
        const gap = 10
        const cellW = (contentW - gap * (cols - 1)) / cols
        const cellH = 110
        pins.slice(0, 6).forEach((pin, i) => {
          const col = i % cols
          const row = Math.floor(i / cols)
          const x = margin + col * (cellW + gap)
          const yy = y + row * (cellH + 28)
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
      }
    }

    // ═══════════════════════════════════════════════
    // 7. APPLICATIONS — the heart of the book
    // ═══════════════════════════════════════════════
    newPage()
    pageHead(
      'Applications',
      'Proof of system — how the brand shows up in the world.'
    )

    // --- Business card ---
    const cardW = contentW * 0.55
    const cardH = 108
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('BUSINESS CARD', margin, y)
    y += 10
    pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
    pdf.setDrawColor(210, 210, 210)
    pdf.roundedRect(margin, y, cardW, cardH, 6, 6, 'FD')
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.rect(margin, y, 8, cardH, 'F')
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.rect(margin + cardW - 56, y, 56, cardH, 'F')
    tryLogo(margin + cardW - 44, y + 18, 32, fgRgb)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
    pdf.text(pdfSafeText(wordmark).slice(0, 26), margin + 20, y + 32)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(pdfSafeText(tag).slice(0, 40), margin + 20, y + 48)
    const contact = [
      String(pack?.orgEmail || '').trim(),
      String(pack?.orgWebsite || '').trim(),
    ]
      .filter(
        (v) =>
          v &&
          !/\.example\b|example\.com|brand\.example|you@example/i.test(v)
      )
      .join('  ·  ')
    if (contact) {
      pdf.setFontSize(7)
      pdf.text(pdfSafeText(contact).slice(0, 48), margin + 20, y + 90)
    }

    // --- Social tile (right of card) ---
    const socX = margin + cardW + 16
    const socW = contentW - cardW - 16
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('SOCIAL POST', socX, y - 10)
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.roundedRect(socX, y, socW, cardH, 6, 6, 'F')
    tryLogo(socX + 12, y + 14, 28, fgRgb, { monochrome: true })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const socLines = pdf.splitTextToSize(pdfSafeText(tag), socW - 24)
    pdf.text(socLines.slice(0, 2), socX + 12, y + 60)
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.roundedRect(socX + 12, y + cardH - 28, 52, 16, 3, 3, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(inkOnAccent[0], inkOnAccent[1], inkOnAccent[2])
    pdf.text('SHOP', socX + 26, y + cardH - 17)
    y += cardH + 28

    // --- Packaging / bag mock ---
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('PACKAGING', margin, y)
    y += 10
    const bagW = contentW * 0.42
    const bagH = 160
    // bag body
    pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
    pdf.setDrawColor(200, 200, 200)
    pdf.roundedRect(margin, y, bagW, bagH, 4, 4, 'FD')
    // top fold
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.rect(margin, y, bagW, 36, 'F')
    tryLogo(margin + bagW / 2 - 16, y + 6, 24, fgRgb, { monochrome: true })
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(inkOnQuiet[0], inkOnQuiet[1], inkOnQuiet[2])
    pdf.text(pdfSafeText(wordmark).slice(0, 22), margin + 14, y + 70)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.text(pdfSafeText(tag).slice(0, 32), margin + 14, y + 88)
    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.rect(margin + 14, y + bagH - 28, bagW - 28, 3, 'F')

    // --- Sign / storefront plaque ---
    const signX = margin + bagW + 20
    const signW = contentW - bagW - 20
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8)
    pdf.setTextColor(100, 100, 100)
    pdf.text('SIGNAGE', signX, y - 10)
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.roundedRect(signX, y, signW, bagH, 6, 6, 'F')
    tryLogo(signX + signW / 2 - 28, y + 28, 56, fgRgb)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    pdf.text(pdfSafeText(wordmark).slice(0, 20), signX + signW / 2, y + 110, {
      align: 'center',
    })
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(pdfSafeText(tag).slice(0, 28), signX + signW / 2, y + 130, {
      align: 'center',
    })
    y += bagH + 24

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(120, 120, 120)
    pdf.text(
      'Mocks are direction proofs only - not production die-lines. Build finals from roles + type scale.',
      margin,
      y
    )

    // ═══════════════════════════════════════════════
    // 8. USAGE (if any)
    // ═══════════════════════════════════════════════
    if (doT || dontT) {
      newPage()
      pageHead('Usage', 'Ship rules - clear guardrails, room to make.')

      const colW = (contentW - 16) / 2
      const boxH = 200
      // DO
      pdf.setFillColor(236, 250, 246)
      pdf.roundedRect(margin, y, colW, boxH, 8, 8, 'F')
      pdf.setFillColor(15, 118, 110)
      pdf.roundedRect(margin, y, colW, 28, 8, 8, 'F')
      pdf.rect(margin, y + 14, colW, 14, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(255, 255, 255)
      pdf.text('DO', margin + 16, y + 19)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(20, 18, 17)
      pdf.text(
        pdf.splitTextToSize(pdfSafeText(doT), colW - 28),
        margin + 14,
        y + 48
      )

      // DON'T
      pdf.setFillColor(254, 242, 242)
      pdf.roundedRect(margin + colW + 16, y, colW, boxH, 8, 8, 'F')
      pdf.setFillColor(185, 28, 28)
      pdf.roundedRect(margin + colW + 16, y, colW, 28, 8, 8, 'F')
      pdf.rect(margin + colW + 16, y + 14, colW, 14, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(255, 255, 255)
      pdf.text("DON'T", margin + colW + 32, y + 19)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(20, 18, 17)
      pdf.text(
        pdf.splitTextToSize(pdfSafeText(dontT), colW - 28),
        margin + colW + 30,
        y + 48
      )
    }

    // ═══════════════════════════════════════════════
    // 9. HANDOFF (compact)
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

    if (pack?.handoffNote?.trim()) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text('NOTE', margin, y)
      y += 14
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      pdf.setTextColor(40, 40, 40)
      pdf.text(
        pdf.splitTextToSize(pdfSafeText(pack.handoffNote), contentW),
        margin,
        y
      )
    }

    // Strategy highlights only — never the full questionnaire, never field tips
    if (briefRows.length) {
      y += 40
      if (y > pageH - 200) {
        newPage()
        pageHead('Brief highlights', 'Strategy answers that drove the system.')
      } else {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text('BRIEF HIGHLIGHTS', margin, y)
        y += 16
      }
      for (const row of briefRows) {
        if (y > pageH - 60) break
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(90, 90, 90)
        pdf.text(pdfSafeText(row.label), margin, y)
        y += 12
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(30, 28, 27)
        const ans = pdf.splitTextToSize(pdfSafeText(row.answer), contentW)
        pdf.text(ans.slice(0, 2), margin, y)
        y += ans.slice(0, 2).length * 13 + 10
      }
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
