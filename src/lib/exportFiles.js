/**
 * Real file export / download helpers for Creative Companion.
 * Multi-strategy downloads (File System Access + anchor + open-tab fallback).
 *
 * Important: async work (dynamic import, await) drops the browser user-gesture,
 * which can silently block a.download. Prefer captureSaveHandle() at click time
 * for PDF, and keep HTML/MD/JSON paths fully synchronous when possible.
 */

import { pinFaceCssText, pinVisualKind } from './moodPins'
import { mapPaletteRoles, normalizeHex, bestTextOn } from './color'

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

function safeFilename(filename) {
  return String(filename || 'download').replace(/[/\\?%*:|"<>]/g, '-')
}

function mimeForName(name) {
  const n = String(name || '').toLowerCase()
  if (n.endsWith('.pdf')) return 'application/pdf'
  if (n.endsWith('.html') || n.endsWith('.htm')) return 'text/html'
  if (n.endsWith('.md') || n.endsWith('.markdown')) return 'text/markdown'
  if (n.endsWith('.json')) return 'application/json'
  if (n.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

/**
 * Call at the start of a click handler (sync) so the save picker keeps user activation
 * even if PDF generation is async afterward.
 * @returns {Promise<FileSystemFileHandle>|null}
 */
export function captureSaveHandle(filename, description = 'Download') {
  if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') {
    return null
  }
  const name = safeFilename(filename)
  const mime = mimeForName(name)
  const ext = name.includes('.') ? `.${name.split('.').pop()}` : ''
  try {
    return window.showSaveFilePicker({
      suggestedName: name,
      types: [
        {
          description,
          accept: { [mime]: ext ? [ext] : ['.bin'] },
        },
      ],
    })
  } catch {
    return null
  }
}

/**
 * Write a Blob to a File System Access handle promise (from captureSaveHandle).
 * @returns {Promise<{ ok: boolean, error?: string, cancelled?: boolean }>}
 */
export async function writeToSaveHandle(handlePromise, blob) {
  if (!handlePromise || !blob) return { ok: false, error: 'No save target' }
  try {
    const handle = await handlePromise
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return { ok: true }
  } catch (e) {
    if (e?.name === 'AbortError') {
      return { ok: false, cancelled: true, error: 'Save cancelled' }
    }
    return { ok: false, error: e?.message || 'Could not write file' }
  }
}

/**
 * Trigger a browser download of a Blob.
 * Strategies: IE msSave → anchor[download] → open blob tab (iOS / blocked download).
 * @returns {{ ok: boolean, error?: string, method?: string }}
 */
export function downloadBlob(blob, filename) {
  try {
    if (!blob) return { ok: false, error: 'Nothing to download' }
    if (typeof document === 'undefined') {
      return { ok: false, error: 'Downloads need a browser window' }
    }

    const name = safeFilename(filename)
    // Ensure correct MIME (some browsers ignore download without it)
    const typed =
      blob.type && blob.type !== ''
        ? blob
        : new Blob([blob], { type: mimeForName(name) })

    // Legacy Edge / IE
    if (typeof navigator !== 'undefined' && typeof navigator.msSaveOrOpenBlob === 'function') {
      navigator.msSaveOrOpenBlob(typed, name)
      return { ok: true, method: 'msSave' }
    }

    const url = URL.createObjectURL(typed)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    // display:none breaks download in some Safari builds — park off-screen instead
    a.setAttribute('download', name)
    a.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none'
    document.body.appendChild(a)

    let clicked = false
    try {
      a.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      )
      clicked = true
    } catch {
      /* fall through */
    }
    if (!clicked && typeof a.click === 'function') {
      a.click()
      clicked = true
    }

    // iOS / iPadOS often ignore the download attribute — open the blob so user can Share/Save
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1)

    if (isIOS) {
      const opened = window.open(url, '_blank')
      if (!opened) {
        // Popup blocked — navigate current tab as last resort
        window.location.assign(url)
      }
      // Keep URL alive longer on iOS
      window.setTimeout(() => {
        try {
          a.remove()
        } catch {
          /* ignore */
        }
        URL.revokeObjectURL(url)
      }, 120000)
      return { ok: true, method: 'ios-open' }
    }

    // If nothing visibly happened in restricted embeds, still try open as fallback after a beat
    // (only when not iOS — desktop should use anchor download)
    window.setTimeout(() => {
      try {
        a.remove()
      } catch {
        /* ignore */
      }
      // Revoke after browser has time to start the download (large HTML packs need longer)
      URL.revokeObjectURL(url)
    }, 60000)

    return { ok: true, method: clicked ? 'anchor' : 'anchor-fallback' }
  } catch (e) {
    return { ok: false, error: e?.message || 'Download failed' }
  }
}

/**
 * Download with optional File System Access handle (capture at click time).
 * @returns {Promise<{ ok: boolean, error?: string, cancelled?: boolean, method?: string }>}
 */
export async function downloadBlobReliable(blob, filename, handlePromise = null) {
  if (handlePromise) {
    const written = await writeToSaveHandle(handlePromise, blob)
    if (written.ok || written.cancelled) return { ...written, method: 'file-picker' }
    // fall through if picker failed for other reasons
  }
  return downloadBlob(blob, filename)
}

export function downloadText(text, filename, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([String(text ?? '')], { type: mime })
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
/**
 * Pins for the pack: starred (inPack) only — no silent fallback.
 * @returns {{ pins: object[], usedFallback: boolean, starredCount: number }}
 */
export function selectPackPins(moodItems = [], limit = 6) {
  const starred = (moodItems || [])
    .filter((m) => m.inPack)
    .sort((a, b) => {
      if (a.packHero && !b.packHero) return -1
      if (!a.packHero && b.packHero) return 1
      return (a.packOrder ?? 999) - (b.packOrder ?? 999)
    })
  return {
    pins: starred.slice(0, limit),
    usedFallback: false,
    starredCount: starred.length,
  }
}

export function buildBrandPackSnapshot({
  project,
  tasks = [],
  moodItems = [],
  palette = [],
} = {}) {
  const p = project || {}
  const openTasks = (tasks || []).filter((t) => !t.completed)
  const doneTasks = (tasks || []).filter((t) => t.completed)
  const { pins, usedFallback, starredCount } = selectPackPins(moodItems, 6)
  const colors =
    Array.isArray(palette) && palette.length
      ? palette
      : p.palette?.length
        ? p.palette
        : ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9']

  return {
    exportedAt: new Date().toISOString(),
    app: 'Creative Companion',
    projectName: p.name || 'Untitled project',
    brief: p.brief || '',
    tagline: p.tagline || '',
    voice: p.voice || '',
    logoDirection: p.logoDirection || '',
    logoWordmark: p.logoWordmark || '',
    logoClearspace: p.logoClearspace || '',
    directions: Array.isArray(p.directions)
      ? p.directions
          .filter((d) => String(d?.title || d?.note || '').trim())
          .map((d) => ({
            id: d.id,
            label: d.label || d.id,
            title: d.title || '',
            note: d.note || '',
            chosen: !!d.chosen,
          }))
      : [],
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
      inPack: !!m.inPack,
      packHero: !!m.packHero,
    })),
    pinsUsedFallback: usedFallback,
    pinsStarredCount: starredCount,
    colorRoles: p.colorRoles || null,
    logoImage: p.logoImage || '',
  }
}

/**
 * Thin-pack readiness for Pack page.
 * Each check can deep-link: view + optional System accordion section.
 */
export function packReadiness(pack) {
  const hasName = !!(pack?.projectName && pack.projectName !== 'Untitled project')
  const hasTagline = !!(pack?.tagline && String(pack.tagline).trim())
  const hasBrief = !!(pack?.brief && String(pack.brief).trim())
  const hasPalette = (pack?.palette || []).length >= 2
  const hasPins = (pack?.pins || []).length > 0
  const hasVoice = !!(pack?.voice && String(pack.voice).trim())
  const checks = [
    {
      id: 'tagline',
      label: 'Tagline',
      ok: hasTagline,
      view: 'brand',
      section: 'essentials',
    },
    {
      id: 'palette',
      label: 'Palette',
      ok: hasPalette,
      view: 'brand',
      section: 'colors',
    },
    {
      id: 'pins',
      label: '★ Leave-behind pins',
      ok: hasPins,
      view: 'studio',
      section: null,
    },
    {
      id: 'voice',
      label: 'Voice',
      ok: hasVoice,
      view: 'brand',
      section: 'voice',
    },
    {
      id: 'brief',
      label: 'Positioning',
      ok: hasBrief,
      view: 'brand',
      section: 'essentials',
    },
  ]
  const okCount = checks.filter((c) => c.ok).length
  const thin = okCount < 3
  return { checks, okCount, thin, hasName }
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
  if (pack.logoWordmark || pack.logoDirection || pack.logoClearspace) {
    lines.push('## Logo lockups', '')
    if (pack.logoWordmark) lines.push(`- **Wordmark:** ${pack.logoWordmark}`)
    if (pack.logoDirection) lines.push(`- **Direction:** ${pack.logoDirection}`)
    if (pack.logoClearspace)
      lines.push(`- **Clearspace:** ${pack.logoClearspace}`)
    lines.push('')
  } else if (pack.logoDirection) {
    lines.push('## Logo direction', '', pack.logoDirection, '')
  }
  if (pack.directions?.length) {
    lines.push('## Ideate directions', '')
    pack.directions.forEach((d) => {
      lines.push(
        `- **${d.label || d.id}${d.chosen ? ' ★' : ''}:** ${d.title || '—'}${
          d.note ? ` — ${d.note}` : ''
        }`
      )
    })
    lines.push('')
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

/**
 * Compact client-handoff brief for clipboard (Slack / email).
 * Shorter than full brandPackToMarkdown.
 */
export function packBriefMarkdown(pack = {}) {
  const name = pack.projectName || 'Untitled project'
  const tag = (pack.tagline && String(pack.tagline).trim()) || 'Tagline TBD'
  const lines = [
    `# ${name}`,
    '',
    `**${tag}**`,
    '',
  ]
  if (pack.brief?.trim()) {
    lines.push(String(pack.brief).trim(), '')
  }
  if (pack.voice?.trim()) {
    lines.push(`_Voice:_ ${String(pack.voice).trim()}`, '')
  }
  if ((pack.palette || []).length) {
    lines.push(`**Palette:** ${(pack.palette || []).join(' · ')}`, '')
  }
  if (pack.typeHeading || pack.typeBody) {
    lines.push(
      `**Type:** ${pack.typeHeading || '—'} / ${pack.typeBody || '—'}`,
      ''
    )
  }
  if (pack.doUse?.trim()) lines.push(`**Do:** ${pack.doUse.trim()}`, '')
  if (pack.dontUse?.trim()) lines.push(`**Don't:** ${pack.dontUse.trim()}`, '')
  const pins = pack.pins || []
  if (pins.length) {
    lines.push('**Refs:**')
    pins.slice(0, 6).forEach((p, i) => {
      lines.push(`${i + 1}. ${p.note || 'Pin'}`)
    })
    lines.push('')
  }
  lines.push('_Creative Companion · brand leave-behind_')
  return lines.join('\n')
}

/** Standalone HTML brand pack — styled to match the in-app Export pack preview. */
export function brandPackToHtml(pack) {
  const pinsHtml = (pack.pins || [])
    .slice(0, 8)
    .map((p) => {
      const css = pinFaceCssText(p).replace(/"/g, "'")
      return `<div class="direction-pin"><div class="direction-pin-visual" style="${css}"></div><div class="direction-pin-note">${esc(p.note || 'Pin')}</div></div>`
    })
    .join('')

  const tasksHtml = (pack.openTasks || [])
    .slice(0, 8)
    .map((t) => `<li>${esc(t.title)}</li>`)
    .join('')

  const coverBg = pack.palette?.[0] || '#1C1917'
  const coverFg = coverTextColor(coverBg)
  const cover = esc(coverBg)
  const paletteRow = (pack.palette || [])
    .map((c) => `<div style="background:${esc(c)}" title="${esc(c)}"></div>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(pack.projectName)} — Brand direction</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"/>
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
  .sheet { max-width: 560px; margin: 0 auto; padding: 1.5rem 1.25rem 2.5rem; }
  .direction-sheet {
    background: #fff;
    border: 1px solid rgba(11,18,32,.08);
    border-radius: 18px;
    padding: 1.75rem 1.6rem;
  }
  .export-identity-cover {
    border-radius: 12px;
    padding: 1.35rem 1.25rem 1.15rem;
    margin-bottom: 1.15rem;
    background: ${cover};
    color: ${coverFg};
  }
  .kicker {
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: rgba(11,18,32,.55);
    margin: 1.15rem 0 0.4rem;
  }
  .export-identity-cover .kicker { color: inherit; opacity: 0.85; margin-top: 0; }
  .direction-title {
    font-size: clamp(1.5rem, 3vw, 1.9rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    margin: 0.15rem 0 0.5rem;
    line-height: 1.15;
    color: inherit;
  }
  .direction-brief {
    color: rgba(11,18,32,.65);
    line-height: 1.55;
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    white-space: pre-wrap;
  }
  .export-identity-cover .direction-brief { color: inherit; opacity: 0.92; }
  .direction-palette {
    display: flex;
    height: 52px;
    border-radius: 12px;
    overflow: hidden;
    margin: 0.5rem 0 0.35rem;
  }
  .direction-palette > div { flex: 1; }
  .direction-hex {
    font-size: 0.75rem;
    color: rgba(11,18,32,.45);
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .direction-type { margin: 0.35rem 0 0; }
  .surface-meta { color: rgba(11,18,32,.5); font-size: 0.9rem; }
  .export-do-dont {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    margin: 0.5rem 0 0.25rem;
  }
  @media (max-width: 520px) { .export-do-dont { grid-template-columns: 1fr; } }
  .direction-pins {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.55rem;
    margin-top: 0.5rem;
  }
  .direction-pin {
    border: 1px solid rgba(11,18,32,.08);
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
  }
  .direction-pin-visual { height: 72px; background: #EDE6FF; }
  .direction-pin-note {
    padding: 0.4rem 0.5rem;
    font-size: 0.72rem;
    color: rgba(11,18,32,.65);
    line-height: 1.35;
  }
  .direction-tasks {
    margin: 0.4rem 0 0;
    padding-left: 1.1rem;
    color: rgba(11,18,32,.65);
    font-size: 0.9rem;
    line-height: 1.45;
  }
  .direction-foot {
    margin-top: 1.5rem;
    padding-top: 0.85rem;
    border-top: 1px solid rgba(11,18,32,.08);
    font-size: 0.72rem;
    color: rgba(11,18,32,.42);
    font-weight: 600;
  }
  .actions { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0 0 1rem; }
  .actions button {
    font: inherit; font-size: .85rem; font-weight: 700;
    border-radius: 999px; border: 1px solid rgba(11,18,32,.12);
    background: #fff; padding: .5rem 1rem; cursor: pointer;
  }
  .actions button.primary { background: #1C1917; color: #fff; border-color: #1C1917; }
  @media print {
    body { background: #fff; }
    .sheet { padding: 0; max-width: none; }
    .direction-sheet { box-shadow: none; border: none; border-radius: 0; padding: 0.5rem; }
    .actions { display: none !important; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="actions">
      <button type="button" class="primary" onclick="window.print()">Print / Save as PDF</button>
    </div>
    <article class="direction-sheet">
      <div class="export-identity-cover">
        <div class="kicker">Direction sheet</div>
        <h1 class="direction-title">${esc(pack.projectName)}</h1>
        <p class="direction-brief">${esc(pack.tagline || 'Tagline TBD')}</p>
      </div>
      <div class="kicker">Positioning</div>
      <p class="direction-brief">${esc(pack.brief || 'No brief yet.')}</p>
      ${
        pack.voice
          ? `<div class="kicker">Voice</div><p class="direction-brief">${esc(pack.voice)}</p>`
          : ''
      }
      <div class="kicker">Palette</div>
      <div class="direction-palette">${paletteRow}</div>
      <div class="direction-hex">${(pack.palette || []).map((c) => esc(c)).join(' · ')}</div>
      <div class="kicker">Typography</div>
      <p class="direction-type">
        <span style="font-size:1.5rem;font-weight:700">${esc(pack.typeHeading)}</span>
        <span class="surface-meta"> · ${esc(pack.typeBody)}</span>
      </p>
      ${
        pack.logoDirection
          ? `<div class="kicker">Logo direction</div><p class="direction-brief">${esc(pack.logoDirection)}</p>`
          : ''
      }
      <div class="export-do-dont">
        <div>
          <div class="kicker">Do</div>
          <p class="direction-brief">${esc(pack.doUse || '—')}</p>
        </div>
        <div>
          <div class="kicker">Don't</div>
          <p class="direction-brief">${esc(pack.dontUse || '—')}</p>
        </div>
      </div>
      <div class="kicker">Mood direction</div>
      ${
        pinsHtml
          ? `<div class="direction-pins">${pinsHtml}</div>`
          : `<p class="surface-meta">No pins in this project yet.</p>`
      }
      <div class="kicker">Open work</div>
      <ul class="direction-tasks">${tasksHtml || '<li>Desk clear for this project</li>'}</ul>
      <footer class="direction-foot">Creative Companion · Brand identity · ${new Date(pack.exportedAt).toLocaleDateString()}</footer>
    </article>
  </div>
</body>
</html>`
}

/** Download brand pack as HTML file */
export function downloadBrandPackHtml(pack, handlePromise = null) {
  const slug = slugifyFilename(pack.projectName, 'brand-pack')
  const name = `${slug}-brand-direction.html`
  const html = brandPackToHtml(pack)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  if (handlePromise) return downloadBlobReliable(blob, name, handlePromise)
  return downloadBlob(blob, name)
}

/** Download brand pack as Markdown */
export function downloadBrandPackMarkdown(pack, handlePromise = null) {
  const slug = slugifyFilename(pack.projectName, 'brand-pack')
  const name = `${slug}-brand-direction.md`
  const md = brandPackToMarkdown(pack)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  if (handlePromise) return downloadBlobReliable(blob, name, handlePromise)
  return downloadBlob(blob, name)
}

/** Download brand pack as JSON (portable) */
export function downloadBrandPackJson(pack, handlePromise = null) {
  const slug = slugifyFilename(pack.projectName, 'brand-pack')
  const name = `${slug}-brand-pack.json`
  const blob = new Blob([JSON.stringify(pack, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  if (handlePromise) return downloadBlobReliable(blob, name, handlePromise)
  return downloadBlob(blob, name)
}

/** Cached engines so Finish view can warm them */
let jsPdfModulePromise = null
let html2canvasPromise = null

/** Warm PDF capture stack (call when Finish view opens). */
export function preloadPdfEngine() {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise = import('jspdf').catch((err) => {
      jsPdfModulePromise = null
      throw err
    })
  }
  if (!html2canvasPromise) {
    html2canvasPromise = import('html2canvas').catch((err) => {
      html2canvasPromise = null
      throw err
    })
  }
  return Promise.all([jsPdfModulePromise, html2canvasPromise])
}

function waitFrames(n = 2) {
  return new Promise((resolve) => {
    const step = (left) => {
      if (left <= 0) resolve()
      else requestAnimationFrame(() => step(left - 1))
    }
    step(n)
  })
}

async function waitForImages(root, timeoutMs = 2500) {
  const imgs = [...(root?.querySelectorAll?.('img') || [])]
  if (!imgs.length) return
  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener('load', res, { once: true })
                img.addEventListener('error', res, { once: true })
              })
      )
    ),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ])
}

/** Simple contrast pick for cover text (matches color.bestTextOn). */
function coverTextColor(bgHex) {
  const rgb = hexToRgb(bgHex)
  if (!rgb) return '#FFFFFF'
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // white vs near-black on bg
  const contrast = (a, b) => {
    const lighter = Math.max(a, b)
    const darker = Math.min(a, b)
    return (lighter + 0.05) / (darker + 0.05)
  }
  const white = contrast(1, L)
  const black = contrast(L, 0.004)
  return white >= black ? '#FFFFFF' : '#0B1220'
}

/**
 * DOM markup matching the in-app Export pack preview (direction-sheet).
 * Uses the same class names so app CSS paints the clone identically.
 */
export function buildDirectionSheetMarkup(pack) {
  const p = pack || {}
  const palette = p.palette?.length ? p.palette : ['#1C1917', '#0F766E', '#A8A29E', '#FAFAF9']
  const cover = palette[0] || '#1C1917'
  const coverFg = coverTextColor(cover)
  const pins = (p.pins || []).slice(0, 8)
  const tasks = (p.openTasks || []).slice(0, 8)

  const paletteHtml = palette
    .map((c) => `<div style="background:${esc(c)}" title="${esc(c)}"></div>`)
    .join('')

  const pinsHtml = pins.length
    ? `<div class="direction-pins">${pins
        .map((pin) => {
          // Escape quotes in data URLs / CSS for style attribute
          const css = pinFaceCssText(pin).replace(/"/g, "'")
          return `<div class="direction-pin">
            <div class="direction-pin-visual" style="${css}"></div>
            <div class="direction-pin-note">${esc(pin.note || 'Pin')}</div>
          </div>`
        })
        .join('')}</div>`
    : `<p class="surface-meta">No pins yet — upload images on Research.</p>`

  const tasksHtml = tasks.length
    ? tasks.map((t) => `<li>${esc(t.title)}</li>`).join('')
    : `<li>Desk clear for this project</li>`

  const voiceBlock = p.voice
    ? `<div class="kicker">Voice</div><p class="direction-brief">${esc(p.voice)}</p>`
    : ''

  const logoBlock = p.logoDirection
    ? `<div class="kicker">Logo direction</div><p class="direction-brief">${esc(p.logoDirection)}</p>`
    : ''

  const date = new Date(p.exportedAt || Date.now()).toLocaleDateString()

  return `<article class="direction-sheet" id="direction-sheet-pdf-clone">
    <div class="export-identity-cover" style="background:${esc(cover)};color:${coverFg}">
      <div class="kicker" style="color:inherit;opacity:0.85">Direction sheet</div>
      <h1 class="direction-title" style="color:inherit">${esc(p.projectName || 'Untitled project')}</h1>
      <p class="direction-brief" style="color:inherit;opacity:0.92">${esc(p.tagline || 'Tagline TBD')}</p>
    </div>
    <div class="kicker">Positioning</div>
    <p class="direction-brief">${esc(p.brief || 'No brief yet.')}</p>
    ${voiceBlock}
    <div class="kicker">Palette</div>
    <div class="direction-palette">${paletteHtml}</div>
    <div class="direction-hex">${esc(palette.join(' · '))}</div>
    <div class="kicker">Typography</div>
    <p class="direction-type">
      <span style="font-size:1.5rem;font-weight:700">${esc(p.typeHeading || 'Plus Jakarta Sans Bold')}</span>
      <span class="surface-meta"> · ${esc(p.typeBody || 'Plus Jakarta Sans Regular')}</span>
    </p>
    ${logoBlock}
    <div class="export-do-dont">
      <div>
        <div class="kicker">Do</div>
        <p class="direction-brief">${esc(p.doUse || '—')}</p>
      </div>
      <div>
        <div class="kicker">Don't</div>
        <p class="direction-brief">${esc(p.dontUse || '—')}</p>
      </div>
    </div>
    <div class="kicker">Mood direction</div>
    ${pinsHtml}
    <div class="kicker">Open work</div>
    <ul class="direction-tasks">${tasksHtml}</ul>
    <footer class="direction-foot">Creative Companion · Brand identity · ${esc(date)}</footer>
  </article>`
}

/**
 * Mount a preview-identical sheet for capture. Prefers live #direction-sheet.
 * @returns {{ el: HTMLElement, cleanup: () => void }}
 */
export function resolveDirectionSheetForCapture(pack) {
  // Prefer System artboard, then export modal artboard (BrandArtboard id)
  for (const id of [
    'system-artboard',
    'direction-sheet',
    'pack-preview-artboard',
  ]) {
    const live = document.getElementById(id)
    if (live) {
      const rect = live.getBoundingClientRect()
      if (rect.width > 40 && rect.height > 40) {
        return { el: live, cleanup: () => {} }
      }
    }
  }

  // Remove any leftover host from a prior failed capture
  document.getElementById('cc-pdf-capture-host')?.remove()

  const host = document.createElement('div')
  host.id = 'cc-pdf-capture-host'
  host.setAttribute('aria-hidden', 'true')
  // Must participate in layout (html2canvas needs real dimensions). Park off-screen.
  host.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:520px',
    'max-width:96vw',
    'z-index:0',
    'opacity:1',
    'pointer-events:none',
    'overflow:visible',
  ].join(';')

  // Mirror export panel chrome so .direction-sheet inherits the same CSS context
  host.innerHTML = `<div class="export-panel portfolio-export" style="max-height:none;overflow:visible;box-shadow:none;border:none;padding:0;width:520px;background:transparent">${buildDirectionSheetMarkup(pack)}</div>`

  const app = document.querySelector('.app') || document.body
  app.appendChild(host)
  const el = host.querySelector('.direction-sheet')
  return {
    el,
    cleanup: () => {
      try {
        host.remove()
      } catch {
        /* ignore */
      }
    },
  }
}

/**
 * Rasterize a DOM node into a multi-page A4 PDF blob (preview-faithful).
 */
/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ fitSinglePage?: boolean | 'auto' }} [opts]
 *   - true: always scale to one page
 *   - false: multi-page when tall
 *   - 'auto' (default): single page unless shrink would go below ~58% (then multi-page)
 */
export async function canvasPagesToPdfBlob(canvas, opts = {}) {
  const fitMode = opts.fitSinglePage === undefined ? 'auto' : opts.fitSinglePage
  await preloadPdfEngine()
  const { jsPDF } = await jsPdfModulePromise
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 42
  const contentW = pageW - margin * 2
  const contentH = pageH - margin * 2

  let imgW = contentW
  let imgH = (canvas.height * imgW) / canvas.width
  const imgData = canvas.toDataURL('image/jpeg', 0.94)

  const scaleToFit = imgH > contentH ? contentH / imgH : 1
  // Very tall artboards: multi-page instead of unreadable shrink
  const useSingle =
    fitMode === true ||
    (fitMode === 'auto' && scaleToFit >= 0.58) ||
    (fitMode !== false && imgH <= contentH)

  if (useSingle) {
    if (imgH > contentH) {
      imgW *= scaleToFit
      imgH *= scaleToFit
    }
    const x = margin + (contentW - imgW) / 2
    pdf.addImage(imgData, 'JPEG', x, margin, imgW, imgH, undefined, 'FAST')
  } else {
    let heightLeft = imgH
    let y = margin
    pdf.addImage(imgData, 'JPEG', margin, y, imgW, imgH, undefined, 'FAST')
    heightLeft -= contentH
    while (heightLeft > 0) {
      y = margin - (imgH - heightLeft)
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', margin, y, imgW, imgH, undefined, 'FAST')
      heightLeft -= contentH
    }
  }

  let blob
  try {
    const ab = pdf.output('arraybuffer')
    blob = new Blob([ab], { type: 'application/pdf' })
  } catch {
    blob = pdf.output('blob')
    if (!blob.type) blob = new Blob([blob], { type: 'application/pdf' })
  }
  return { blob, pdf }
}

/**
 * Default Download PDF = vector direction pack.
 * Pass options.mode = 'preview' for html2canvas raster match.
 */
export async function downloadBrandPackPdf(
  pack,
  handlePromise = null,
  options = {}
) {
  if (options.mode === 'preview' || options.mode === 'raster') {
    return downloadBrandPackPdfRaster(pack, handlePromise, options)
  }
  return downloadBrandPackVectorPdf(pack, handlePromise, options)
}

/**
 * Raster PDF that matches on-screen preview (html2canvas → JPEG).
 * Prefer vector download for client handoff.
 *
 * @param {object} pack - brand pack snapshot
 * @param {Promise|null} handlePromise - from captureSaveHandle() on click
 * @param {{ element?: HTMLElement|null }} [options]
 * @returns {Promise<{ ok: boolean, error?: string, cancelled?: boolean, method?: string }>}
 */
export async function downloadBrandPackPdfRaster(pack, handlePromise = null, options = {}) {
  let cleanup = () => {}
  try {
    await preloadPdfEngine()
    const html2canvasMod = await html2canvasPromise
    const html2canvas = html2canvasMod.default || html2canvasMod

    let el = options.element || null
    if (!el) {
      const resolved = resolveDirectionSheetForCapture(pack)
      el = resolved.el
      cleanup = resolved.cleanup
    }
    if (!el) {
      return { ok: false, error: 'Could not build pack preview for PDF' }
    }

    // Match preview card width; expand scroll parents so the full sheet paints
    const panel = el.closest('.portfolio-export')
    const overlay = el.closest('.export-overlay')
    const prev = {
      width: el.style.width,
      maxWidth: el.style.maxWidth,
      boxShadow: el.style.boxShadow,
      maxHeight: el.style.maxHeight,
      overflow: el.style.overflow,
      panelMax: panel?.style.maxHeight,
      panelOverflow: panel?.style.overflow,
      overlayOverflow: overlay?.style.overflow,
    }
    el.style.width = '520px'
    el.style.maxWidth = '520px'
    el.style.boxShadow = 'none'
    el.style.maxHeight = 'none'
    el.style.overflow = 'visible'
    if (panel) {
      panel.style.maxHeight = 'none'
      panel.style.overflow = 'visible'
    }
    if (overlay) overlay.style.overflow = 'visible'

    await waitFrames(2)
    await waitForImages(el)

    const bg =
      getComputedStyle(el).backgroundColor ||
      getComputedStyle(document.documentElement).getPropertyValue('--bg-elevated') ||
      '#ffffff'

    const canvas = await html2canvas(el, {
      scale: Math.min(2.5, (window.devicePixelRatio || 1) * 2),
      useCORS: true,
      allowTaint: true,
      backgroundColor: bg === 'rgba(0, 0, 0, 0)' ? '#ffffff' : bg,
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: Math.max(el.scrollWidth, 520),
      windowHeight: el.scrollHeight,
      onclone: (_doc, clone) => {
        // Ensure full height is painted (no scroll clip)
        clone.style.maxHeight = 'none'
        clone.style.overflow = 'visible'
        clone.style.height = 'auto'
        clone.style.width = '520px'
        const parentPanel = clone.closest('.portfolio-export')
        if (parentPanel) {
          parentPanel.style.maxHeight = 'none'
          parentPanel.style.overflow = 'visible'
        }
        const pins = clone.querySelectorAll('.direction-pin-visual')
        pins.forEach((node) => {
          node.style.backgroundSize = 'cover'
          node.style.backgroundPosition = 'center'
        })
      },
    })

    el.style.width = prev.width
    el.style.maxWidth = prev.maxWidth
    el.style.boxShadow = prev.boxShadow
    el.style.maxHeight = prev.maxHeight
    el.style.overflow = prev.overflow
    if (panel) {
      panel.style.maxHeight = prev.panelMax || ''
      panel.style.overflow = prev.panelOverflow || ''
    }
    if (overlay) overlay.style.overflow = prev.overlayOverflow || ''

    const slug = slugifyFilename(pack.projectName, 'brand-pack')
    const name = `${slug}-brand-direction.pdf`
    const { blob, pdf } = await canvasPagesToPdfBlob(canvas)

    if (handlePromise) {
      const written = await writeToSaveHandle(handlePromise, blob)
      if (written.ok || written.cancelled) return { ...written, method: 'file-picker' }
    }

    try {
      pdf.save(name)
      return { ok: true, method: 'jspdf-save' }
    } catch {
      /* fall through */
    }

    const viaAnchor = downloadBlob(blob, name)
    if (viaAnchor.ok) return { ...viaAnchor, method: viaAnchor.method || 'anchor' }

    const url = URL.createObjectURL(blob)
    const opened = window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 120000)
    if (opened) return { ok: true, method: 'tab' }
    return {
      ok: false,
      error: 'Browser blocked the download — allow downloads for this site',
    }
  } catch (e) {
    return { ok: false, error: e?.message || 'PDF export failed' }
  } finally {
    cleanup()
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
 * Map type face labels to jsPDF built-in fonts (vector text).
 * Real family names still print as labels so the pack remains honest.
 */
function pdfFontForLabel(label, role = 'body') {
  const s = String(label || '').toLowerCase()
  if (
    s.includes('baskerville') ||
    s.includes('playfair') ||
    s.includes('fraunces') ||
    s.includes('georgia') ||
    s.includes('serif')
  ) {
    return { family: 'times', style: role === 'heading' ? 'bold' : 'normal' }
  }
  return { family: 'helvetica', style: role === 'heading' ? 'bold' : 'normal' }
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

/**
 * Multi-page vector brand book PDF — cover, positioning, color, type,
 * logo lockups, usage, mood. Text + fills as PDF primitives (selectable type).
 *
 * @param {object} pack
 * @param {Promise|null} handlePromise
 * @param {{ hideWatermark?: boolean }} [options]
 */
export async function downloadBrandPackVectorPdf(
  pack,
  handlePromise = null,
  options = {}
) {
  try {
    if (!jsPdfModulePromise) {
      jsPdfModulePromise = import('jspdf').catch((err) => {
        jsPdfModulePromise = null
        throw err
      })
    }
    const jsPdfMod = await jsPdfModulePromise
    const { jsPDF } = jsPdfMod
    const hideWatermark = !!options.hideWatermark
    const margin = 48
    const pageW = 612
    const pageH = 792
    const contentW = pageW - margin * 2
    const bottom = pageH - margin - 18
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'letter',
      compress: true,
    })

    const colors = (pack?.palette || [])
      .map((c) => normalizeHex(c) || c)
      .filter(Boolean)
    const roles = {
      ...mapPaletteRoles(colors),
      ...(pack?.colorRoles || {}),
    }
    const cover = packCoverHex(pack)
    const coverRgb = hexToRgb(cover) || [28, 25, 23]
    const fg = bestTextOn(cover)
    const fgRgb = hexToRgb(fg) || [250, 250, 249]
    const accentHex =
      normalizeHex(roles.accent) || colors[1] || colors[0] || '#0F766E'
    const accentRgb = hexToRgb(accentHex) || [15, 118, 110]
    const quietHex =
      normalizeHex(roles.quiet) || colors[colors.length - 1] || '#FAFAF9'
    const quietRgb = hexToRgb(quietHex) || [250, 250, 249]
    const textHex = normalizeHex(roles.text) || colors[0] || '#1C1917'
    const textRgb = hexToRgb(textHex) || [28, 25, 23]
    const wordmark =
      String(pack?.logoWordmark || '').trim() ||
      pack?.projectName ||
      'Brand'
    const day = new Date().toLocaleDateString()
    let pageIndex = 0

    let y = margin
    const newPage = () => {
      pdf.addPage()
      pageIndex += 1
      y = margin
    }

    const ensureSpace = (need) => {
      if (y + need <= bottom) return
      newPage()
    }

    const setFont = (label, role = 'body', size = 11) => {
      const f = pdfFontForLabel(label, role)
      pdf.setFont(f.family, f.style)
      pdf.setFontSize(size)
    }

    const writeWrapped = (
      text,
      { size = 11, role = 'body', color = [12, 10, 9], label, maxW = contentW } = {}
    ) => {
      const str = String(text || '').trim()
      if (!str) return
      setFont(label || pack?.typeBody, role, size)
      pdf.setTextColor(color[0], color[1], color[2])
      const lines = pdf.splitTextToSize(str, maxW)
      const lineH = size * 1.35
      ensureSpace(lines.length * lineH + 4)
      pdf.text(lines, margin, y)
      y += lines.length * lineH + 6
    }

    const kicker = (label) => {
      ensureSpace(22)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100)
      pdf.text(String(label).toUpperCase(), margin, y)
      y += 14
    }

    const pageTitle = (title, sub) => {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      pdf.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2])
      pdf.text('BRAND BOOK', margin, y)
      y += 16
      setFont(pack?.typeHeading, 'heading', 20)
      pdf.setTextColor(12, 10, 9)
      pdf.text(title, margin, y)
      y += 22
      if (sub) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(90, 90, 90)
        const lines = pdf.splitTextToSize(sub, contentW)
        pdf.text(lines, margin, y)
        y += lines.length * 13 + 12
      } else {
        y += 6
      }
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.5)
      pdf.line(margin, y, margin + contentW, y)
      y += 16
    }

    const drawFooters = () => {
      const total = pdf.getNumberOfPages()
      const project = String(pack?.projectName || 'Brand').slice(0, 40)
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        const left = hideWatermark
          ? project
          : `Creative Companion · ${project}`
        const right = `${i} / ${total}`
        pdf.text(left, margin, pageH - 24)
        pdf.text(right, pageW - margin, pageH - 24, { align: 'right' })
        if (!hideWatermark && i === total) {
          pdf.text(`Vector brand book · ${day}`, margin, pageH - 12)
        }
      }
    }

    const tryLogo = (x, yy, size, bgRgb) => {
      if (pack?.logoImage && String(pack.logoImage).startsWith('data:image')) {
        try {
          if (bgRgb) {
            pdf.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2])
            pdf.roundedRect(x - 8, yy - 8, size + 16, size + 16, 4, 4, 'F')
          }
          pdf.addImage(pack.logoImage, 'PNG', x, yy, size, size)
          return true
        } catch {
          return false
        }
      }
      return false
    }

    // ═══════════════ PAGE 1 — Cover ═══════════════
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.rect(0, 0, pageW, pageH, 'F')
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text('BRAND BOOK · DIRECTION PACK', margin, margin + 12)
    y = margin + 80
    if (tryLogo(margin, y, 64)) y += 84
    setFont(pack?.typeHeading, 'heading', 28)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const titleLines = pdf.splitTextToSize(
      pack?.projectName || 'Untitled project',
      contentW
    )
    pdf.text(titleLines, margin, y)
    y += titleLines.length * 32 + 12
    const tag = String(pack?.tagline || '').trim() || 'Tagline TBD'
    setFont(pack?.typeBody, 'body', 14)
    const tagLines = pdf.splitTextToSize(tag, contentW)
    pdf.text(tagLines, margin, y)
    y += tagLines.length * 18 + 28
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    const toc = [
      '01  Cover',
      '02  Positioning & voice',
      '03  Color system',
      '04  Typography',
      '05  Logo lockups',
      '06  Usage · do / don’t',
      '07  Mood & directions',
    ]
    toc.forEach((line) => {
      pdf.text(line, margin, y)
      y += 16
    })
    pdf.setFontSize(9)
    pdf.text(day, margin, pageH - margin)

    // ═══════════════ PAGE 2 — Positioning ═══════════════
    newPage()
    pageTitle('Positioning & voice', 'Who it is for · what they should feel · how we sound.')
    kicker('Positioning')
    writeWrapped(pack?.brief || 'No brief yet — add on Define.', {
      size: 12,
      label: pack?.typeBody,
    })
    kicker('Tagline')
    writeWrapped(tag, { size: 14, role: 'heading', label: pack?.typeHeading })
    kicker('Voice')
    writeWrapped(pack?.voice || 'Voice TBD — set on Design.', {
      size: 12,
      label: pack?.typeBody,
    })
    if (pack?.deadline) {
      kicker('Constraint / deadline')
      writeWrapped(String(pack.deadline), { size: 11 })
    }

    // ═══════════════ PAGE 3 — Color ═══════════════
    newPage()
    pageTitle('Color system', 'Roles first. Hex second. Stay consistent.')
    if (colors.length) {
      const swH = 72
      const swW = contentW / Math.min(colors.length, 6)
      const show = colors.slice(0, 6)
      ensureSpace(swH + 48)
      show.forEach((hex, i) => {
        const rgb = hexToRgb(hex) || [136, 136, 136]
        const x = margin + i * swW
        pdf.setFillColor(rgb[0], rgb[1], rgb[2])
        pdf.rect(x, y, swW - 4, swH, 'F')
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(70, 70, 70)
        pdf.text(String(hex).toUpperCase(), x, y + swH + 12)
      })
      y += swH + 28
    } else {
      writeWrapped('No palette yet — add colors on Design.', { size: 11 })
    }
    kicker('Roles')
    const roleKeys = [
      ['cover', 'Cover'],
      ['text', 'Text'],
      ['accent', 'Accent'],
      ['quiet', 'Quiet'],
    ]
    const roleCardW = (contentW - 18) / 2
    const roleCardH = 52
    roleKeys.forEach(([key, label], i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      if (col === 0) ensureSpace(roleCardH + 12)
      const x = margin + col * (roleCardW + 18)
      const yy = y + row * (roleCardH + 12)
      const hex = normalizeHex(roles[key]) || roles[key] || '#888888'
      const rgb = hexToRgb(hex) || [136, 136, 136]
      pdf.setFillColor(rgb[0], rgb[1], rgb[2])
      pdf.roundedRect(x, yy, roleCardW, roleCardH, 4, 4, 'F')
      const tOn = bestTextOn(hex)
      const tRgb = hexToRgb(tOn) || [255, 255, 255]
      pdf.setTextColor(tRgb[0], tRgb[1], tRgb[2])
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      pdf.text(label, x + 12, yy + 22)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(String(hex).toUpperCase(), x + 12, yy + 38)
    })
    y += 2 * (roleCardH + 12) + 8

    // ═══════════════ PAGE 4 — Typography ═══════════════
    newPage()
    pageTitle(
      'Typography',
      'Production face names below. PDF uses Helvetica/Times for portability.'
    )
    kicker('Heading')
    writeWrapped(pack?.typeHeading || 'Heading face', {
      size: 22,
      role: 'heading',
      label: pack?.typeHeading,
    })
    writeWrapped('The quick brown fox jumps over the lazy dog.', {
      size: 16,
      role: 'heading',
      label: pack?.typeHeading,
    })
    kicker('Body')
    writeWrapped(pack?.typeBody || 'Body face', {
      size: 14,
      label: pack?.typeBody,
    })
    writeWrapped(
      'Body copy should stay calm and readable. Hierarchy beats decoration. Keep line length comfortable and reserve accent color for actions.',
      { size: 11, label: pack?.typeBody }
    )
    kicker('Pairing')
    writeWrapped(
      `${pack?.typeHeading || 'Heading'}  ·  ${pack?.typeBody || 'Body'}`,
      { size: 12, role: 'heading', label: pack?.typeHeading }
    )

    // ═══════════════ PAGE 5 — Logo lockups ═══════════════
    newPage()
    pageTitle(
      'Logo lockups',
      'Primary, reverse, mono · clearspace · direction notes.'
    )
    const lockW = (contentW - 16) / 2
    const lockH = 110
    // Primary
    ensureSpace(lockH + 30)
    pdf.setFillColor(quietRgb[0], quietRgb[1], quietRgb[2])
    pdf.roundedRect(margin, y, lockW, lockH, 4, 4, 'F')
    pdf.setDrawColor(220, 220, 220)
    pdf.roundedRect(margin, y, lockW, lockH, 4, 4, 'S')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(100, 100, 100)
    pdf.text('PRIMARY', margin + 10, y + 14)
    if (!tryLogo(margin + 14, y + 28, 40)) {
      pdf.setFillColor(textRgb[0], textRgb[1], textRgb[2])
      pdf.circle(margin + 34, y + 48, 16, 'F')
    }
    setFont(pack?.typeHeading, 'heading', 12)
    pdf.setTextColor(textRgb[0], textRgb[1], textRgb[2])
    const wm1 = pdf.splitTextToSize(wordmark, lockW - 28)
    pdf.text(wm1.slice(0, 2), margin + 14, y + 88)

    // Reverse
    pdf.setFillColor(coverRgb[0], coverRgb[1], coverRgb[2])
    pdf.roundedRect(margin + lockW + 16, y, lockW, lockH, 4, 4, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    pdf.text('REVERSE', margin + lockW + 26, y + 14)
    if (!tryLogo(margin + lockW + 30, y + 28, 40)) {
      pdf.setFillColor(fgRgb[0], fgRgb[1], fgRgb[2])
      pdf.circle(margin + lockW + 50, y + 48, 16, 'F')
    }
    setFont(pack?.typeHeading, 'heading', 12)
    pdf.setTextColor(fgRgb[0], fgRgb[1], fgRgb[2])
    pdf.text(wm1.slice(0, 2), margin + lockW + 30, y + 88)
    y += lockH + 16

    // Mono + accent field
    ensureSpace(lockH + 20)
    pdf.setFillColor(250, 250, 249)
    pdf.setDrawColor(200, 200, 200)
    pdf.roundedRect(margin, y, lockW, lockH, 4, 4, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(100, 100, 100)
    pdf.text('MONO / ONE-COLOR', margin + 10, y + 14)
    if (!tryLogo(margin + 14, y + 28, 40)) {
      pdf.setFillColor(28, 25, 23)
      pdf.circle(margin + 34, y + 48, 16, 'F')
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(28, 25, 23)
    pdf.text(wm1.slice(0, 2), margin + 14, y + 88)

    pdf.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2])
    pdf.roundedRect(margin + lockW + 16, y, lockW, lockH, 4, 4, 'F')
    const aFg = bestTextOn(accentHex)
    const aFgRgb = hexToRgb(aFg) || [255, 255, 255]
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(aFgRgb[0], aFgRgb[1], aFgRgb[2])
    pdf.text('ON ACCENT', margin + lockW + 26, y + 14)
    if (!tryLogo(margin + lockW + 30, y + 28, 40)) {
      pdf.setFillColor(aFgRgb[0], aFgRgb[1], aFgRgb[2])
      pdf.circle(margin + lockW + 50, y + 48, 16, 'F')
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.setTextColor(aFgRgb[0], aFgRgb[1], aFgRgb[2])
    pdf.text(wm1.slice(0, 2), margin + lockW + 30, y + 88)
    y += lockH + 20

    kicker('Direction')
    writeWrapped(
      pack?.logoDirection ||
        'Describe the mark: shape language, no shadows, single-color OK, etc.',
      { size: 11 }
    )
    kicker('Clearspace & size')
    writeWrapped(
      pack?.logoClearspace ||
        'Keep clearspace ≈ half the mark height on all sides. Do not set the mark smaller than ~24px digital / 0.5" print. Prefer full-color primary; reverse on dark covers; mono for one-ink jobs.',
      { size: 10, color: [60, 60, 60] }
    )

    // ═══════════════ PAGE 6 — Usage ═══════════════
    newPage()
    pageTitle('Usage', 'Do and don’t — ship rules, not vibes.')
    const doT = String(pack?.doUse || '').trim()
    const dontT = String(pack?.dontUse || '').trim()
    const colW = (contentW - 16) / 2
    ensureSpace(80)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(15, 118, 110)
    pdf.text('DO', margin, y)
    pdf.setTextColor(153, 27, 27)
    pdf.text("DON'T", margin + colW + 16, y)
    y += 14
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(12, 10, 9)
    const doLines = pdf.splitTextToSize(doT || '—', colW)
    const dontLines = pdf.splitTextToSize(dontT || '—', colW)
    pdf.text(doLines, margin, y)
    pdf.text(dontLines, margin + colW + 16, y)
    y += Math.max(doLines.length, dontLines.length) * 14 + 20

    const dirs = pack?.directions || []
    if (dirs.length) {
      kicker('Chosen ideate directions')
      dirs.forEach((d) => {
        const head = `${d.label || d.id}${d.chosen ? ' ★ chosen' : ''}: ${d.title || '—'}`
        writeWrapped(head, { size: 11, role: 'heading' })
        if (d.note) writeWrapped(d.note, { size: 10, color: [70, 70, 70] })
      })
    }

    // ═══════════════ PAGE 7 — Mood ═══════════════
    newPage()
    pageTitle('Mood & refs', 'Starred leave-behind pins only (max 6).')
    const pins = pack?.pins || []
    if (!pins.length) {
      writeWrapped(
        'No starred pins yet — open Research and star up to 6 for the leave-behind.',
        { size: 11 }
      )
    } else {
      const cols = 3
      const gap = 12
      const cellW = (contentW - gap * (cols - 1)) / cols
      const cellH = 96
      for (let i = 0; i < pins.length; i++) {
        if (i % cols === 0) ensureSpace(cellH + 32)
        const col = i % cols
        const x = margin + col * (cellW + gap)
        if (col === 0 && i > 0) y += cellH + 28
        const pin = pins[i]
        const kind = pinVisualKind(pin)
        pdf.setDrawColor(220, 220, 220)
        pdf.setFillColor(250, 250, 249)
        pdf.roundedRect(x, y, cellW, cellH, 3, 3, 'FD')
        if (kind === 'image' && String(pin.visual || '').startsWith('data:image')) {
          try {
            pdf.addImage(pin.visual, 'JPEG', x + 3, y + 3, cellW - 6, cellH - 6)
          } catch {
            /* skip */
          }
        } else if (kind === 'color' || kind === 'gradient') {
          const hex = normalizeHex(pin.visual) || '#D6D3D1'
          const rgb = hexToRgb(hex) || [214, 211, 209]
          pdf.setFillColor(rgb[0], rgb[1], rgb[2])
          pdf.rect(x + 3, y + 3, cellW - 6, cellH - 6, 'F')
        }
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(8)
        pdf.setTextColor(60, 60, 60)
        const note = String(pin.note || 'Pin').slice(0, 100)
        const noteLines = pdf.splitTextToSize(
          (pin.packHero ? '★ ' : '') + note,
          cellW
        )
        pdf.text(noteLines.slice(0, 2), x, y + cellH + 12)
        if (i === pins.length - 1) y += cellH + 28
      }
    }

    drawFooters()

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

/**
 * Raster preview-match PDF (html2canvas). Prefer vector for clients.
 * @deprecated for client handoff — use downloadBrandPackVectorPdf
 */
export async function downloadBrandPackPreviewPdf(
  pack,
  handlePromise = null,
  options = {}
) {
  return downloadBrandPackPdfRaster(pack, handlePromise, options)
}

/**
 * Print only a DOM node (opens print dialog for PDF).
 * Uses body.cc-printing-pack + print CSS for multi-page paper layout.
 * @param {string} elementId
 * @param {{ hideWatermark?: boolean }} [options]
 */
export function printElementById(elementId, options = {}) {
  const el = document.getElementById(elementId)
  if (!el) return { ok: false, error: 'Nothing to print' }
  try {
    document.body.classList.add('cc-printing-pack')
    if (options.hideWatermark) {
      document.body.classList.add('cc-print-no-watermark')
    }
    const prevTitle = document.title
    const name =
      el.querySelector('.direction-title')?.textContent?.trim() ||
      'Brand direction'
    document.title = `${name} — Brand pack`
    window.print()
    document.title = prevTitle
    window.setTimeout(() => {
      document.body.classList.remove('cc-printing-pack')
      document.body.classList.remove('cc-print-no-watermark')
    }, 500)
    return { ok: true }
  } catch (e) {
    document.body.classList.remove('cc-printing-pack')
    document.body.classList.remove('cc-print-no-watermark')
    return { ok: false, error: e?.message || 'Print failed' }
  }
}
