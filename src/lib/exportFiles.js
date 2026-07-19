/**
 * Real file export / download helpers for Creative Companion.
 * All downloads use Blob + object URL with DOM append (Safari-safe).
 */

/** Safe filename from a project title */
export function slugifyFilename(name, fallback = 'creative-companion') {
  const s = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return s || fallback
}

/**
 * Trigger a browser download of a Blob or string.
 * @returns {{ ok: boolean, error?: string }}
 */
export function downloadBlob(blob, filename) {
  try {
    if (!blob) return { ok: false, error: 'Nothing to download' }
    const name = String(filename || 'download').replace(/[/\\?%*:|"<>]/g, '-')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    // Revoke after the click has been processed
    window.setTimeout(() => {
      try {
        document.body.removeChild(a)
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(url)
    }, 1500)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Download failed' }
  }
}

export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  return downloadBlob(blob, filename)
}

export function downloadJson(data, filename) {
  const text = JSON.stringify(data, null, 2)
  return downloadText(text, filename, 'application/json;charset=utf-8')
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Snapshot of brand/work for exports (from app state pieces).
 */
export function buildBrandPackSnapshot({
  project,
  tasks = [],
  moodItems = [],
  palette = [],
} = {}) {
  const p = project || {}
  const openTasks = (tasks || []).filter((t) => !t.completed)
  const doneTasks = (tasks || []).filter((t) => t.completed)
  const pins = (moodItems || []).slice(0, 12)
  const colors =
    Array.isArray(palette) && palette.length
      ? palette
      : p.palette?.length
        ? p.palette
        : ['#4F46E5', '#0D9488', '#1A1A1A', '#F4F1EA']

  return {
    exportedAt: new Date().toISOString(),
    app: 'Creative Companion',
    projectName: p.name || 'Untitled project',
    brief: p.brief || '',
    tagline: p.tagline || '',
    voice: p.voice || '',
    logoDirection: p.logoDirection || '',
    typeHeading: p.typeHeading || 'Plus Jakarta Sans Bold',
    typeBody: p.typeBody || 'Plus Jakarta Sans Regular',
    doUse: p.doUse || '',
    dontUse: p.dontUse || '',
    deadline: p.deadline || '',
    palette: colors,
    conceptPackage: p.conceptPackage || null,
    openTasks: openTasks.map((t) => ({
      id: t.id,
      title: t.title,
      energy: t.energy,
      dueDate: t.dueDate || '',
    })),
    doneCount: doneTasks.length,
    totalCount: (tasks || []).length,
    progressPercent:
      (tasks || []).length > 0
        ? Math.round((doneTasks.length / tasks.length) * 100)
        : 0,
    pins: pins.map((m) => ({
      id: m.id,
      type: m.type,
      note: m.note,
      visual: m.visual,
    })),
  }
}

/** Markdown brand direction pack */
export function brandPackToMarkdown(pack) {
  const lines = [
    `# ${pack.projectName}`,
    '',
    `> ${pack.tagline || 'Tagline TBD'}`,
    '',
    `_Exported ${new Date(pack.exportedAt).toLocaleString()} · Creative Companion_`,
    '',
    '## Positioning',
    '',
    pack.brief || '_No brief yet._',
    '',
  ]
  if (pack.voice) {
    lines.push('## Voice', '', pack.voice, '')
  }
  lines.push(
    '## Palette',
    '',
    ...(pack.palette || []).map((c) => `- \`${c}\``),
    '',
    '## Typography',
    '',
    `- **Heading:** ${pack.typeHeading}`,
    `- **Body:** ${pack.typeBody}`,
    ''
  )
  if (pack.logoDirection) {
    lines.push('## Logo direction', '', pack.logoDirection, '')
  }
  lines.push(
    '## Do',
    '',
    pack.doUse || '—',
    '',
    "## Don't",
    '',
    pack.dontUse || '—',
    '',
    '## Mood pins',
    ''
  )
  if (!pack.pins?.length) {
    lines.push('_No pins yet._', '')
  } else {
    pack.pins.forEach((pin, i) => {
      lines.push(`${i + 1}. **${pin.note || 'Pin'}** (${pin.type || 'ref'})`)
    })
    lines.push('')
  }
  lines.push('## Open work', '')
  if (!pack.openTasks?.length) {
    lines.push('- Desk clear', '')
  } else {
    pack.openTasks.forEach((t) => {
      lines.push(`- [ ] ${t.title}${t.dueDate ? ` _(due ${t.dueDate})_` : ''}`)
    })
    lines.push('')
  }
  lines.push(
    '---',
    '',
    `Progress: ${pack.doneCount}/${pack.totalCount} steps (${pack.progressPercent}%)`,
    ''
  )
  return lines.join('\n')
}

/** Standalone HTML brand pack (opens offline, print-friendly) */
export function brandPackToHtml(pack) {
  const pinsHtml = (pack.pins || [])
    .map((p) => {
      if (p.type === 'image' && p.visual) {
        const src = String(p.visual).replace(/'/g, '%27')
        return `<figure class="pin"><div class="swatch" style="background-image:url('${src}');background-size:cover;background-position:center"></div><figcaption>${esc(p.note)}</figcaption></figure>`
      }
      const bg = esc(p.visual || '#4F46E5')
      return `<figure class="pin"><div class="swatch" style="background:${bg}"></div><figcaption>${esc(p.note)}</figcaption></figure>`
    })
    .join('')

  const tasksHtml = (pack.openTasks || [])
    .map((t) => `<li>${esc(t.title)}</li>`)
    .join('')

  const cover = esc(pack.palette?.[0] || '#4F46E5')
  const paletteRow = (pack.palette || [])
    .map((c) => `<div class="sw" style="background:${esc(c)}" title="${esc(c)}"></div>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(pack.projectName)} — Brand direction</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    color: #0B1220;
    background: #EEF0F6;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .sheet {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1.25rem 3rem;
  }
  .card {
    background: #fff;
    border: 1px solid rgba(11,18,32,.08);
    border-radius: 18px;
    padding: 2rem 1.75rem 2.25rem;
    box-shadow: 0 12px 40px rgba(11,18,32,.08);
  }
  .cover {
    border-radius: 14px;
    padding: 2rem 1.75rem;
    margin: 0 0 1.75rem;
    color: #fff;
    background: ${cover};
  }
  .cover .label { font-size: .75rem; font-weight: 700; opacity: .85; margin: 0 0 .5rem; letter-spacing: .04em; text-transform: uppercase; }
  .cover h1 { font-size: clamp(1.75rem, 4vw, 2.25rem); font-weight: 800; letter-spacing: -.03em; margin: 0 0 .4rem; line-height: 1.15; }
  .cover .tag { font-size: 1.05rem; opacity: .92; margin: 0; font-weight: 600; }
  .kicker { font-size: .78rem; font-weight: 700; color: rgba(11,18,32,.5); margin: 1.35rem 0 .4rem; letter-spacing: .03em; text-transform: uppercase; }
  .brief { color: rgba(11,18,32,.72); margin: 0 0 .35rem; white-space: pre-wrap; }
  .palette { display: flex; height: 56px; border-radius: 10px; overflow: hidden; margin: .5rem 0; }
  .palette .sw { flex: 1; }
  .hex { font-size: .85rem; font-weight: 600; color: rgba(11,18,32,.55); font-variant-numeric: tabular-nums; }
  .type-h { font-size: 1.65rem; font-weight: 800; letter-spacing: -.03em; margin: .25rem 0 0; }
  .type-b { font-size: 1rem; color: rgba(11,18,32,.65); margin: .15rem 0 0; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1rem 0; }
  @media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
  .box { border: 1px solid rgba(11,18,32,.08); border-radius: 12px; padding: 1rem 1.05rem; background: #FAFBFE; }
  .box h3 { margin: 0 0 .4rem; font-size: .75rem; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; color: rgba(11,18,32,.48); }
  .box p { margin: 0; white-space: pre-wrap; font-size: .95rem; color: rgba(11,18,32,.78); }
  .pins { display: grid; grid-template-columns: repeat(3, 1fr); gap: .65rem; margin: .65rem 0 0; }
  @media (max-width: 560px) { .pins { grid-template-columns: 1fr 1fr; } }
  .pin { margin: 0; border: 1px solid rgba(11,18,32,.08); border-radius: 10px; overflow: hidden; background: #fff; }
  .pin .swatch { height: 88px; background: #EDE6FF; }
  .pin figcaption { padding: .45rem .55rem; font-size: .78rem; font-weight: 600; color: rgba(11,18,32,.7); }
  ul { margin: .4rem 0 0; padding-left: 1.15rem; color: rgba(11,18,32,.7); }
  .foot { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(11,18,32,.08); font-size: .75rem; color: rgba(11,18,32,.42); font-weight: 600; }
  .actions { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 1rem; }
  .actions button {
    font: inherit; font-size: .85rem; font-weight: 700;
    border-radius: 999px; border: 1px solid rgba(11,18,32,.12);
    background: #fff; padding: .5rem 1rem; cursor: pointer;
  }
  .actions button.primary { background: #4F46E5; color: #fff; border-color: #4F46E5; }
  @media print {
    body { background: #fff; }
    .sheet { padding: 0; max-width: none; }
    .card { box-shadow: none; border: none; border-radius: 0; padding: 0; }
    .actions { display: none !important; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="actions">
      <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
    </div>
    <div class="card">
      <div class="cover">
        <p class="label">Brand direction pack</p>
        <h1>${esc(pack.projectName)}</h1>
        <p class="tag">${esc(pack.tagline || 'Tagline TBD')}</p>
      </div>
      <div class="kicker">Positioning</div>
      <p class="brief">${esc(pack.brief || 'No brief captured yet.')}</p>
      ${
        pack.voice
          ? `<div class="kicker">Voice</div><p class="brief">${esc(pack.voice)}</p>`
          : ''
      }
      <div class="kicker">Palette</div>
      <div class="palette">${paletteRow}</div>
      <p class="hex">${(pack.palette || []).map((c) => esc(c)).join(' · ')}</p>
      <div class="kicker">Typography</div>
      <p class="type-h">${esc(pack.typeHeading)}</p>
      <p class="type-b">${esc(pack.typeBody)}</p>
      ${
        pack.logoDirection
          ? `<div class="kicker">Logo direction</div><p class="brief">${esc(pack.logoDirection)}</p>`
          : ''
      }
      <div class="grid2">
        <div class="box"><h3>Do</h3><p>${esc(pack.doUse || '—')}</p></div>
        <div class="box"><h3>Don't</h3><p>${esc(pack.dontUse || '—')}</p></div>
      </div>
      <div class="kicker">Mood direction</div>
      ${
        pinsHtml
          ? `<div class="pins">${pinsHtml}</div>`
          : `<p class="brief">No pins yet.</p>`
      }
      <div class="kicker">Open work</div>
      <ul>${tasksHtml || '<li>Desk clear</li>'}</ul>
      <p class="foot">Creative Companion · ${pack.progressPercent}% steps done · ${new Date(pack.exportedAt).toLocaleDateString()}</p>
    </div>
  </div>
</body>
</html>`
}

/** Download brand pack as HTML file */
export function downloadBrandPackHtml(pack) {
  const slug = slugifyFilename(pack.projectName, 'brand-pack')
  const html = brandPackToHtml(pack)
  return downloadText(html, `${slug}-brand-direction.html`, 'text/html;charset=utf-8')
}

/** Download brand pack as Markdown */
export function downloadBrandPackMarkdown(pack) {
  const slug = slugifyFilename(pack.projectName, 'brand-pack')
  const md = brandPackToMarkdown(pack)
  return downloadText(md, `${slug}-brand-direction.md`, 'text/markdown;charset=utf-8')
}

/** Download brand pack as JSON (portable) */
export function downloadBrandPackJson(pack) {
  const slug = slugifyFilename(pack.projectName, 'brand-pack')
  return downloadJson(pack, `${slug}-brand-pack.json`)
}

/**
 * One-click brand pack PDF (jsPDF). No print dialog required.
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function downloadBrandPackPdf(pack) {
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 48
    const maxW = pageW - margin * 2
    let y = margin

    const ensureSpace = (need = 24) => {
      if (y + need > pageH - margin) {
        doc.addPage()
        y = margin
      }
    }

    const writeWrapped = (text, { size = 11, style = 'normal', color = [11, 18, 32], gap = 6 } = {}) => {
      doc.setFont('helvetica', style)
      doc.setFontSize(size)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(String(text || ''), maxW)
      const lineH = size * 1.35
      ensureSpace(lines.length * lineH + gap)
      doc.text(lines, margin, y)
      y += lines.length * lineH + gap
    }

    // Cover band
    const coverHex = String(pack.palette?.[0] || '#4F46E5')
    const coverRgb = hexToRgb(coverHex) || [79, 70, 229]
    doc.setFillColor(...coverRgb)
    doc.rect(0, 0, pageW, 120, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('BRAND DIRECTION PACK', margin, 36)
    doc.setFontSize(22)
    const titleLines = doc.splitTextToSize(pack.projectName || 'Untitled project', maxW)
    doc.text(titleLines, margin, 62)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(String(pack.tagline || 'Tagline TBD').slice(0, 120), margin, 90)
    y = 140

    writeWrapped('Positioning', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    writeWrapped(pack.brief || 'No brief captured yet.', { size: 11, gap: 12 })

    if (pack.voice) {
      writeWrapped('Voice', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
      writeWrapped(pack.voice, { size: 11, gap: 12 })
    }

    writeWrapped('Palette', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    const colors = pack.palette || []
    if (colors.length) {
      ensureSpace(36)
      const sw = Math.min(48, maxW / colors.length - 4)
      colors.forEach((hex, i) => {
        const rgb = hexToRgb(hex) || [200, 200, 200]
        doc.setFillColor(...rgb)
        doc.roundedRect(margin + i * (sw + 6), y, sw, 28, 3, 3, 'F')
      })
      y += 36
      writeWrapped(colors.join('  ·  '), { size: 10, color: [80, 90, 110], gap: 12 })
    } else {
      writeWrapped('No palette yet.', { size: 11, gap: 12 })
    }

    writeWrapped('Typography', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    writeWrapped(`Heading: ${pack.typeHeading || '—'}`, { size: 12, style: 'bold', gap: 2 })
    writeWrapped(`Body: ${pack.typeBody || '—'}`, { size: 11, gap: 12 })

    if (pack.logoDirection) {
      writeWrapped('Logo direction', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
      writeWrapped(pack.logoDirection, { size: 11, gap: 12 })
    }

    writeWrapped('Do', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    writeWrapped(pack.doUse || '—', { size: 11, gap: 10 })
    writeWrapped("Don't", { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    writeWrapped(pack.dontUse || '—', { size: 11, gap: 12 })

    writeWrapped('Mood pins', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    if (!pack.pins?.length) {
      writeWrapped('No pins yet.', { size: 11, gap: 12 })
    } else {
      pack.pins.slice(0, 12).forEach((pin, i) => {
        writeWrapped(
          `${i + 1}. ${pin.note || 'Pin'} (${pin.type || 'ref'})`,
          { size: 10, gap: 3 }
        )
      })
      y += 8
    }

    writeWrapped('Open work', { size: 9, style: 'bold', color: [100, 110, 130], gap: 4 })
    if (!pack.openTasks?.length) {
      writeWrapped('Desk clear', { size: 11, gap: 12 })
    } else {
      pack.openTasks.slice(0, 20).forEach((t) => {
        writeWrapped(`• ${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ''}`, {
          size: 10,
          gap: 3,
        })
      })
      y += 8
    }

    ensureSpace(28)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 130, 145)
    doc.text(
      `Creative Companion · ${pack.progressPercent ?? 0}% steps done · ${new Date(
        pack.exportedAt || Date.now()
      ).toLocaleDateString()}`,
      margin,
      y
    )

    const slug = slugifyFilename(pack.projectName, 'brand-pack')
    const blob = doc.output('blob')
    return downloadBlob(blob, `${slug}-brand-direction.pdf`)
  } catch (e) {
    return { ok: false, error: e?.message || 'PDF export failed' }
  }
}

/** Parse #RGB / #RRGGBB to [r,g,b] */
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

/** Full workspace backup */
export function downloadWorkspaceBackup(workspace) {
  const day = new Date().toISOString().slice(0, 10)
  return downloadJson(
    {
      ...workspace,
      exportedAt: workspace?.exportedAt || new Date().toISOString(),
    },
    `creative-companion-backup-${day}.json`
  )
}

/**
 * Print only a DOM node (opens print dialog for PDF).
 * Temporarily clones styles via print CSS on body.
 */
export function printElementById(elementId) {
  const el = document.getElementById(elementId)
  if (!el) return { ok: false, error: 'Nothing to print' }
  try {
    document.body.classList.add('cc-printing-pack')
    const prevTitle = document.title
    const name =
      el.querySelector('.direction-title')?.textContent?.trim() ||
      'Brand direction'
    document.title = `${name} — Brand pack`
    window.print()
    document.title = prevTitle
    window.setTimeout(() => {
      document.body.classList.remove('cc-printing-pack')
    }, 500)
    return { ok: true }
  } catch (e) {
    document.body.classList.remove('cc-printing-pack')
    return { ok: false, error: e?.message || 'Print failed' }
  }
}
