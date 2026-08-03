/**
 * Real file export / download helpers for Creative Companion.
 * Multi-strategy downloads (File System Access + anchor + open-tab fallback).
 *
 * Important: async work (dynamic import, await) drops the browser user-gesture,
 * which can silently block a.download. Prefer captureSaveHandle() at click time
 * for PDF, and keep HTML/MD/JSON paths fully synchronous when possible.
 */

import { pinFaceCssText, pinVisualKind } from './moodPins'
import {
  resolvedGrid,
  resolvedPageBackgrounds,
  resolvedRunning,
  resolvedTypeColors,
  resolvedTypeScale,
} from './bookBuilder'
import { toISODate } from './dates'
import { mapPaletteRoles, normalizeHex, bestTextOn } from './color'
import {
  DETECTIVE_CHAPTERS,
  formatDetectiveAnswer,
  filledDetectiveChapters,
  progressItemInScope,
} from './brief/detectiveBrief'
import { OVERVIEW_FIELD_PREFIX } from './overviewOcr'
import {
  appendSystemMarkdown,
  buildColorSystem,
  buildCssTokens,
  buildJsonTokens,
  logoDontsList,
  decisionLineFromPack,
  DEFAULT_LOGO_CLEARSPACE,
  DEFAULT_LOGO_MIN_SIZE,
  TYPE_SCALE,
  ROLE_JOBS,
  colorSpec,
} from './brandSystem'

// Typographic scale and vertical rhythm system
const BASE_UNIT = 4  // 4px base unit for vertical rhythm
const SPACING = {
  xs: BASE_UNIT,      // 4px
  sm: BASE_UNIT * 2,  // 8px
  md: BASE_UNIT * 3,  // 12px
  lg: BASE_UNIT * 4,  // 16px
  xl: BASE_UNIT * 5,  // 20px
  '2xl': BASE_UNIT * 6, // 24px
  '3xl': BASE_UNIT * 7, // 28px
  '4xl': BASE_UNIT * 8  // 32px
}
const LINE_HEIGHT = {
  tight: 1.2,   // For headings
  normal: 1.5,  // For body text
  relaxed: 1.6  // For captions/notes
}

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
    const p = window.showSaveFilePicker({
      suggestedName: name,
      types: [{ description, accept: { [mime]: ext ? [ext] : ['.bin'] } }],
    })
    // Mark the promise as handled so an AbortError (user cancel) while the
    // caller does async pre-work doesn't fire an "unhandled rejection".
    // writeToSaveHandle still catches it with cancelled:true when it awaits.
    p.catch(() => {})
    return p
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

  const d = p.detective || {}
  return {
    /* The builder's page backgrounds, resolved to hex. Without this the whole
       page-background control was screen-only: the book on screen repainted
       and the delivered PDF did not, which is a control that looks like it
       styles the deliverable and does not. */
    bookPageBg: resolvedPageBackgrounds(p),
    /* The rest of the Builder, resolved the same way and for the same
       reason. Type size (as a ratio, so the book keeps its own hierarchy),
       type colour, grid guides and running elements all drew on screen and
       were dropped on export. */
    bookTypeScale: resolvedTypeScale(p),
    bookTypeColor: resolvedTypeColors(p),
    bookGrid: resolvedGrid(p),
    bookRunning: resolvedRunning(p),
    exportedAt: new Date().toISOString(),
    app: 'Creative Companion',
    projectName: p.name || 'Untitled project',
    brief: p.brief || '',
    tagline: p.tagline || '',
    voice: p.voice || '',
    logoDirection: p.logoDirection || '',
    logoWordmark: p.logoWordmark || '',
    logoClearspace: p.logoClearspace || '',
    designVersion: p.designVersion || 'v1',
    detective: p.detective || null,
    /* Client answers the brand book needs at the top level.
       brandBookPdf reads `pack.messagingPromise` / `pack.messagingProof`, but
       nothing ever put them there — so the Direction page fell through to
       `voice` for Promise AND Personality AND Voice, printing one sentence
       three times, with Proof as a bare "—". The questions now exist in the
       brief; this is the wire between them.

       `story`, `usp`, `toneOfVoice` and `technical` were asked and then never
       printed anywhere at all. */
    /* The designer's own positioning line. Before this the book printed the
       auto-composed brief instead — "Client: X Goal: Y Story: Z Words: …" run
       together with no punctuation — under a heading promising a positioning
       statement. That summary is a working artefact, not a sentence anyone
       wrote to be read. */
    positioning: p.positioning || '',
    story: d.story || '',
    usp: d.usp || '',
    toneOfVoice: d.toneOfVoice || '',
    technical: d.technical || '',
    accessibilityNeeds: d.accessibilityNeeds || '',
    brandSurfaces: Array.isArray(d.brandSurfaces) ? d.brandSurfaces : [],
    feedbackNotes: p.feedbackNotes || '',
    /* Scope travels with the pack because it is what the work was measured
       against. `scopeOutOf` in particular is the half of a scope that gets
       argued about, and it belongs in the record rather than in someone's
       memory of a kickoff call. */
    scopeRevisionsIncluded: Number(p.scopeRevisionsIncluded) || 0,
    scopeApprover: p.scopeApprover || '',
    scopeOutOf: p.scopeOutOf || '',
    revisionRounds: Array.isArray(p.revisionRounds) ? p.revisionRounds : [],
    feedbackLog: Array.isArray(p.feedbackLog) ? p.feedbackLog : [],
    handoffNote: p.handoffNote || '',
    learnings: p.learnings || '',
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
    /* The pairing rationale. Reaches the book's type page; omitted there when
       blank. Empty string not a default face name — this is free text. */
    typeWhy: p.typeWhy || '',
    doUse: p.doUse || '',
    dontUse: p.dontUse || '',
    deadline: p.deadline || '',
    palette: colors,
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
    orgEmail: p.orgEmail || '',
    orgWebsite: p.orgWebsite || '',
    orgPhone: p.orgPhone || '',
    contacts: Array.isArray(p.contacts) ? p.contacts : [],
    logoMinSize: p.logoMinSize || '',
    logoDonts: p.logoDonts || '',
    /* Falls back to the client's own answer. `project.messagingPromise` is
       read in three places (BrandArtboard, brandSystem, the brand book) and
       written in none — so Promise fell through to `voice` and Proof printed
       "\u2014". The brief now asks both; a designer-side value still wins if one
       ever exists. */
    messagingPromise: p.messagingPromise || d.messagingPromise || '',
    messagingProof: p.messagingProof || d.messagingProof || '',
    messagingPersonality: p.messagingPersonality || '',
    /* StoryBrand's plan and single CTA — client-answered only; there is no
       designer-side field for these, unlike Promise and Proof. */
    messagingPlan: d.messagingPlan || '',
    messagingCta: d.messagingCta || '',
    /* Writing guidelines. The `||` fallbacks are load-bearing, not cosmetic:
       persist `migrate` only re-merges defaults for workspaces saved before
       v5, so a project already at v5 has no `writingCase` key at all and
       would print no writing rule despite one being the default. */
    writingCase: p.writingCase || 'sentence',
    writingCaps: p.writingCaps || 'sparing',
    writingNotes: p.writingNotes || '',
    printPantone: p.printPantone || '',
    printStock: p.printStock || '',
    printFinish: p.printFinish || '',
    imageryStyle: p.imageryStyle || '',
    imageryDo: p.imageryDo || '',
    imageryDont: p.imageryDont || '',
    decisionLog: Array.isArray(p.decisionLog) ? p.decisionLog : [],
    discoveryAnswers: p.discoveryAnswers || {},
  }
}

/**
 * Thin-pack readiness for Pack page.
 * Each check can deep-link: view + optional Design accordion section.
 */
export function packReadiness(pack) {
  const hasName = !!(pack?.projectName && pack.projectName !== 'Untitled project')
  const hasTagline = !!(pack?.tagline && String(pack.tagline).trim())
  const hasBrief = !!(pack?.brief && String(pack.brief).trim())
  const det = pack?.detective || {}
  const hasDetective =
    !!(det.goal && String(det.goal).trim()) ||
    !!(det.audience && String(det.audience).trim())
  const hasPalette = (pack?.palette || []).length >= 2
  const hasPins = (pack?.pins || []).length > 0
  const hasVoice = !!(pack?.voice && String(pack.voice).trim())
  const hasHandoff = !!(pack?.handoffNote && String(pack.handoffNote).trim())
  const hasLearnings = !!(pack?.learnings && String(pack.learnings).trim())
  const checks = [
    {
      id: 'detective',
      label: 'Goal / who it is for',
      ok: hasDetective || hasBrief,
      view: 'project',
      section: null,
    },
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
      label: '★ Starred pictures',
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
      ok: hasBrief || hasDetective,
      view: 'project',
      section: null,
    },
    {
      id: 'handoff',
      label: 'Note for the client',
      ok: hasHandoff,
      view: 'finish',
      section: null,
    },
    {
      id: 'learnings',
      label: 'Learnings note',
      ok: hasLearnings,
      view: 'finish',
      section: null,
    },
  ]
  /* Only require what the brief picked. tagline/palette/voice are book fields
     a logo-only client did not buy, so a done logo job must not read as
     "Ready · 4/8". progressItemInScope reads the same deliverablesPicked the
     brand-progress chip uses, so the two counters can never disagree about
     scope. Everything not scopeable (goal, pins, positioning, handoff,
     learnings) always counts. */
  const picked = det.deliverablesPicked
  const scopedChecks = checks.filter((c) => progressItemInScope(c.id, picked))
  const okCount = scopedChecks.filter((c) => c.ok).length
  const gaps = scopedChecks.filter((c) => !c.ok)
  // Thin if core brand pieces missing (not handoff/learnings — those are ship polish)
  const coreOk = scopedChecks
    .filter((c) => !['handoff', 'learnings'].includes(c.id))
    .filter((c) => c.ok).length
  const thin = coreOk < 3
  /* "Done" ignores handoff/learnings for the same reason coreOk does — they
     are ship polish, not requirements, and a job is shippable without a
     personal learnings note. Blocking "ready to ship" on an optional note
     would nag a finished job, which is the whole thing this scoping removes. */
  const coreChecks = scopedChecks.filter(
    (c) => !['handoff', 'learnings'].includes(c.id)
  )
  const allDone =
    coreChecks.length > 0 && coreChecks.every((c) => c.ok)
  return { checks: scopedChecks, okCount, thin, hasName, coreOk, gaps, allDone }
}

/** Markdown brand direction pack */
export function brandPackToMarkdown(pack) {
  const lines = [
    `# ${pack.projectName}`,
    '',
    // No tagline yet means no tagline line — never a placeholder. This is a
    // document the client reads, and invented copy reads as a real answer.
    ...(pack.tagline?.trim() ? [`> ${pack.tagline.trim()}`, ''] : []),
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
  {
    const chapters = filledDetectiveChapters(pack.detective || {})
    if (chapters.length) {
      lines.push('## Agreed brief', '')
      chapters.forEach((ch) => {
        lines.push(`### ${ch.num} · ${ch.title}`, '')
        ch.rows.forEach((row) => {
          lines.push(`- **${row.label}:** ${row.answer}`)
        })
        lines.push('')
      })
    }
  }
  if (pack.handoffNote) {
    lines.push('## Handoff note', '', pack.handoffNote, '')
  }
  if (pack.learnings) {
    lines.push('## What I learned', '', pack.learnings, '')
  }
  if (pack.feedbackNotes) {
    lines.push('## Review notes', '', pack.feedbackNotes, '')
  }
  /* What was agreed, next to what was done about it. A revision count means
     nothing on its own — it is only a claim when it sits beside the rounds
     that were actually run. */
  if (pack.scopeApprover || pack.scopeOutOf || pack.scopeRevisionsIncluded) {
    lines.push('## Scope', '')
    if (pack.scopeRevisionsIncluded)
      lines.push(`- **Revision rounds included:** ${pack.scopeRevisionsIncluded}`)
    if ((pack.revisionRounds || []).length) {
      const done = pack.revisionRounds.filter((r) => r?.closedAt).length
      lines.push(`- **Rounds run:** ${done}`)
    }
    if (pack.scopeApprover) lines.push(`- **Signed off by:** ${pack.scopeApprover}`)
    if (pack.scopeOutOf) lines.push(`- **Not included:** ${pack.scopeOutOf}`)
    lines.push('')
  }
  if ((pack.feedbackLog || []).length) {
    lines.push('## Feedback log', '')
    for (const f of pack.feedbackLog) {
      const who = f.reviewer ? `**${f.reviewer}** — ` : ''
      const what = f.decision ? ` → ${f.decision}` : ''
      lines.push(`- ${who}${f.issue}${what} _(${f.status})_`)
    }
    lines.push('')
  }
  if (pack.logoWordmark || pack.logoDirection || pack.logoClearspace || pack.logoImage) {
    lines.push('## Logo lockups', '')
    if (pack.logoWordmark) lines.push(`- **Wordmark:** ${pack.logoWordmark}`)
    if (pack.logoDirection) lines.push(`- **Direction:** ${pack.logoDirection}`)
    if (pack.logoClearspace)
      lines.push(`- **Clearspace:** ${pack.logoClearspace}`)
    if (pack.logoMinSize) lines.push(`- **Min size:** ${pack.logoMinSize}`)
    if (pack.logoImage) lines.push(`- **Mark image:** included in kit`)
    lines.push('')
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
  // Full system appendix: roles, codes, AA pairs, type scale, logo don'ts, imagery
  const withSystem = appendSystemMarkdown(lines, pack)
  withSystem.push(
    '---',
    '',
    `Version: ${pack.designVersion || 'v1'} · Progress: ${pack.doneCount}/${pack.totalCount} steps (${pack.progressPercent}%)`,
    ''
  )
  return withSystem.join('\n')
}

/**
 * Compact client-handoff brief for clipboard (Slack / email).
 * Shorter than full brandPackToMarkdown.
 */
export function packBriefMarkdown(pack = {}) {
  const name = pack.projectName || 'Untitled project'
  const tag = pack.tagline && String(pack.tagline).trim()
  const lines = [
    `# ${name}`,
    '',
    // Omit rather than invent — see brandPackToMarkdown.
    ...(tag ? [`**${tag}**`, ''] : []),
  ]
  if (pack.brief?.trim()) {
    lines.push(String(pack.brief).trim(), '')
  }
  if (pack.voice?.trim()) {
    lines.push(`_Voice:_ ${String(pack.voice).trim()}`, '')
  }
  if ((pack.palette || []).length) {
    lines.push(`**Palette:** ${(pack.palette || []).join(' · ')}`, '')
    ;(pack.palette || []).forEach((hex) => {
      const spec = colorSpec(hex)
      if (spec) lines.push(`- ${spec.hex} — ${spec.rgb} — ${spec.cmyk}`)
    })
    lines.push('')
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
  .sheet { max-width: 560px; margin: 0 auto; padding: 1.75rem 1.25rem 2.75rem; }
  .direction-sheet {
    background: #fff;
    border: 1px solid rgba(11,18,32,.08);
    border-radius: 18px;
    padding: 2rem 1.6rem;
  }
  .export-identity-cover {
    border-radius: 12px;
    padding: 1.5rem 1.25rem 1.35rem;
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
    margin: 1.25rem 0 0.6rem;
  }
  .export-identity-cover .kicker { color: inherit; opacity: 0.85; margin-top: 0; }
  .direction-title {
    font-size: clamp(1.5rem, 3vw, 1.9rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    margin: 0.2rem 0 0.7rem;
    line-height: 1.15;
    color: inherit;
  }
  .direction-brief {
    color: rgba(11,18,32,.65);
    line-height: 1.6;
    margin: 0 0 0.6rem;
    font-size: 0.95rem;
    white-space: pre-wrap;
  }
  .export-identity-cover .direction-brief { color: inherit; opacity: 0.92; }
  .direction-palette {
    display: flex;
    height: 52px;
    border-radius: 12px;
    overflow: hidden;
    margin: 0.75rem 0 0.5rem;
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
    margin: 0.75rem 0 0.35rem;
  }
  @media (max-width: 520px) { .export-do-dont { grid-template-columns: 1fr; } }
  .direction-pins {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.55rem;
    margin-top: 0.75rem;
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
    margin: 0.6rem 0 0;
    padding-left: 1.1rem;
    color: rgba(11,18,32,.65);
    font-size: 0.9rem;
    line-height: 1.45;
  }
  .direction-foot {
    margin-top: 1.75rem;
    padding-top: 1rem;
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
        ${pack.tagline?.trim() ? `<p class="direction-brief">${esc(pack.tagline.trim())}</p>` : ''}
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

/**
 * Client brand kit zip: PDF + MD + tokens + logo (if any).
 * Builds PDF first (async), then zips with JSZip.
 * @returns {Promise<{ ok: boolean, error?: string, cancelled?: boolean, method?: string }>}
 */
export async function downloadBrandKitZip(
  pack,
  handlePromise = null,
  options = {}
) {
  try {
    const JSZip = (await import('jszip')).default
    const slug = slugifyFilename(pack?.projectName, 'brand-kit')
    const zipName = `${slug}-brand-kit.zip`
    const zip = new JSZip()
    const folder = zip.folder(slug) || zip

    // Markdown + tokens (sync)
    folder.file('brand.md', brandPackToMarkdown(pack))
    folder.file('tokens.css', buildCssTokens(pack))
    folder.file(
      'tokens.json',
      JSON.stringify(buildJsonTokens(pack), null, 2)
    )
    folder.file(
      'pack.json',
      JSON.stringify(
        {
          ...pack,
          // strip huge pin binaries from pack.json if many data URLs
          pins: (pack.pins || []).map((p) => ({
            id: p.id,
            note: p.note,
            type: p.type,
            packHero: p.packHero,
            // keep small non-data visuals only
            visual:
              String(p.visual || '').startsWith('data:') &&
              String(p.visual).length > 8000
                ? '[embedded in brand-book.pdf / mood pins]'
                : p.visual,
          })),
        },
        null,
        2
      )
    )

    // Logo as separate file when data URL
    if (
      pack?.logoImage &&
      String(pack.logoImage).startsWith('data:image')
    ) {
      try {
        const m = String(pack.logoImage).match(
          /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
        )
        if (m) {
          const ext =
            m[1].includes('png')
              ? 'png'
              : m[1].includes('jpeg') || m[1].includes('jpg')
                ? 'jpg'
                : m[1].includes('webp')
                  ? 'webp'
                  : m[1].includes('svg')
                    ? 'svg'
                    : 'png'
          folder.file(`logo.${ext}`, m[2], { base64: true })
        }
      } catch {
        /* skip logo file */
      }
    }

    // Vector brand book PDF into zip — same page setup as the standalone
    // download, or the two copies of "the brand book" would differ.
    const pdfResult = await downloadBrandPackVectorPdf(pack, null, {
      hideWatermark: !!options.hideWatermark,
      book: options.book,
      returnBlobOnly: true,
    })
    if (pdfResult?.blob) {
      folder.file('brand-book.pdf', pdfResult.blob)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    if (handlePromise) {
      const written = await writeToSaveHandle(handlePromise, zipBlob)
      if (written.ok || written.cancelled)
        return { ...written, method: 'file-picker' }
    }
    return downloadBlobReliable(zipBlob, zipName, null)
  } catch (e) {
    return { ok: false, error: e?.message || 'Zip export failed' }
  }
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
      ${p.tagline?.trim() ? `<p class="direction-brief" style="color:inherit;opacity:0.92">${esc(p.tagline.trim())}</p>` : ''}
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
  // Prefer Design artboard, then export modal artboard (BrandArtboard id)
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
  const day = toISODate()
  return downloadJson(
    {
      ...workspace,
      exportedAt: workspace?.exportedAt || new Date().toISOString(),
    },
    `creative-companion-backup-${day}.json`
  )
}

/**
 * jsPDF core fonts (Helvetica/Times/Courier) are WinAnsi — many Unicode
 * glyphs garble (e.g. ≥ → "e, ≈ → "H, ″ → missing). Normalize before draw.
 * Real typeface names still appear as *labels* in the book; embedded face
 * is always Helvetica so metrics stay predictable.
 */
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

/**
 * Multi-page vector brand book — application-first layout.
 * Implementation lives in brandBookPdf.js (Amplius-style system deck).
 */
export async function downloadBrandPackVectorPdf(pack, handlePromise = null, options = {}) {
  const mod = await import('./brandBookPdf.js')
  return mod.downloadBrandPackVectorPdf(pack, handlePromise, options)
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
    document.title = `${name} — Brand book`
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

/**
 * Print the current page's main content (opens print dialog for PDF).
 * Generic — works on whatever view is active, unlike printElementById
 * which targets the brand-pack artboard specifically.
 * @param {{ title?: string }} [options]
 */
export function printCurrentPage(options = {}) {
  const el = document.getElementById('main-content')
  if (!el) return { ok: false, error: 'Nothing to print' }
  try {
    document.body.classList.add('cc-printing-page')
    const prevTitle = document.title
    if (options.title) document.title = options.title
    window.print()
    document.title = prevTitle
    window.setTimeout(() => {
      document.body.classList.remove('cc-printing-page')
    }, 500)
    return { ok: true }
  } catch (e) {
    document.body.classList.remove('cc-printing-page')
    return { ok: false, error: e?.message || 'Print failed' }
  }
}

/**
 * Form-specific PDF generation utilities
 * Extends the existing PDF generation capabilities for forms
 */

/**
 * Generate PDF markup for a form (reused for both vector and raster PDFs)
 * @param {object} formData - The form data to display
 * @param {object} schema - The form schema (for labels and structure)
 * @returns {string} HTML markup for the form
 */
export async function downloadProjectOverviewPdf(project, options = {}) {
  try {
    if (!jsPdfModulePromise) {
      jsPdfModulePromise = import('jspdf').catch((err) => {
        jsPdfModulePromise = null
        throw err
      })
    }
    const jsPdfMod = await jsPdfModulePromise
    const { jsPDF } = jsPdfMod
    const blank = !!options.blank
    const margin = 48
    const pageW = 612
    const pageH = 792
    const contentW = pageW - margin * 2
    const bottom = pageH - margin - 22
    // Blank (fillable) must not compress: jsPDF's /AcroForm as a compressed
    // stream breaks pdf-lib re-import ("Expected PDFDict, got PDFRawStream").
    const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: !blank })

    const clientName =
      options.clientName ||
      project?.detective?.clientName ||
      project?.name ||
      ''
    const day = new Date().toLocaleDateString()
    let y = margin
    let pageIndex = 1
    /** Active chapter when a field spills to a new page (blank form). */
    let openChapter = null

    // Footers drawn once at the end so page numbers are final (no double-ink).
    const newPage = () => {
      pdf.addPage()
      pageIndex += 1
      y = margin
    }

    const ensureSpace = (need) => {
      if (y + need <= bottom) return false
      newPage()
      return true
    }

    const drawChapterHeader = (chapter, { continued = false } = {}) => {
      ensureSpace(36)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(100, 100, 100)
      const label = continued
        ? `${chapter.num} · ${chapter.title.toUpperCase()} (continued)`
        : `${chapter.num} · ${chapter.title.toUpperCase()}`
      pdf.text(pdfSafeText(label), margin, y)
      y += 8
      pdf.setDrawColor(200, 200, 200)
      pdf.setLineWidth(0.6)
      pdf.line(margin, y, pageW - margin, y)
      y += 14
    }

    // ── Header ──────────────────────────────────────────────
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(22)
    pdf.setTextColor(20, 18, 17)
    pdf.text('Project overview', margin, y + 18)
    y += 32
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(110, 110, 110)
    pdf.text(
      pdfSafeText(
        blank
          ? `${clientName || 'Client'} · fill in and return`
          : `${clientName || 'Untitled project'} · ${day}`
      ),
      margin,
      y
    )
    y += 10
    pdf.setDrawColor(220, 220, 220)
    pdf.setLineWidth(0.5)
    pdf.line(margin, y, pageW - margin, y)
    y += 20

    if (blank) {
      // Full questionnaire — handwriting / on-screen fill
      DETECTIVE_CHAPTERS.forEach((chapter) => {
        openChapter = chapter
        drawChapterHeader(chapter)

        chapter.fields.forEach((f) => {
          const lines = f.area ? 3 : 1
          const blockH = 12 + lines * 15 + 10
          const broke = ensureSpace(blockH)
          if (broke && openChapter) {
            drawChapterHeader(openChapter, { continued: true })
          }

          pdf.setFont('helvetica', 'bold')
          pdf.setFontSize(9.5)
          pdf.setTextColor(30, 28, 27)
          pdf.text(pdfSafeText(f.label), margin, y)
          y += 12

          const boxTop = y - 9
          const boxH = lines * 15

          const { AcroFormTextField } = jsPdfMod
          if (AcroFormTextField) {
            const field = new AcroFormTextField()
            field.fieldName = `${OVERVIEW_FIELD_PREFIX}${f.id}`
            field.Rect = [margin, boxTop, contentW, boxH]
            field.multiline = !!f.area
            field.fontSize = 10
            pdf.addField(field)
          }

          for (let i = 0; i < lines; i += 1) {
            pdf.setDrawColor(200, 200, 200)
            pdf.setLineWidth(0.5)
            pdf.line(margin, y, pageW - margin, y)
            y += 15
          }
          y += 8
        })
        y += 6
      })
      openChapter = null
    } else {
      // Filled handoff — only answered fields (same idea as brand-book brief)
      const chapters = filledDetectiveChapters(project?.detective || {})
      if (!chapters.length) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(11)
        pdf.setTextColor(120, 120, 120)
        const note = pdfSafeText(
          'No brief answers yet. Fill out Define (Project overview) or send the blank form for the client to complete.'
        )
        const noteLines = pdf.splitTextToSize(note, contentW)
        pdf.text(noteLines, margin, y)
      } else {
        chapters.forEach((ch) => {
          drawChapterHeader({ num: ch.num, title: ch.title })
          ch.rows.forEach((row) => {
            const answerLines = pdf.splitTextToSize(
              pdfSafeText(row.answer),
              contentW
            )
            const blockH = 12 + answerLines.length * 13 + 10
            const broke = ensureSpace(blockH)
            if (broke) {
              drawChapterHeader(
                { num: ch.num, title: ch.title },
                { continued: true }
              )
            }

            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(9)
            pdf.setTextColor(100, 100, 100)
            pdf.text(pdfSafeText(row.label), margin, y)
            y += 12

            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(11)
            pdf.setTextColor(30, 28, 27)
            pdf.text(answerLines, margin, y)
            y += answerLines.length * 13 + 10
          })
          y += 6
        })
      }
    }

    // Footers need final page count — rewrite all pages
    const total = pdf.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i)
      pageIndex = i
      // Clear any partial footer from mid-flow newPage by redrawing
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(
        pdfSafeText('Creative Companion · Project overview'),
        margin,
        pageH - 24
      )
      pdf.text(`${i} / ${total}`, pageW - margin, pageH - 24, {
        align: 'right',
      })
    }

    const slug = slugifyFilename(clientName || project?.name, 'project-overview')
    const name = blank ? `${slug}-overview-blank.pdf` : `${slug}-overview.pdf`

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
        pages: pdf.getNumberOfPages(),
        mode: blank ? 'blank' : 'filled',
      }
    }

    try {
      pdf.save(name)
      return {
        ok: true,
        method: 'jspdf-save',
        pages: pdf.getNumberOfPages(),
        mode: blank ? 'blank' : 'filled',
      }
    } catch {
      // fall through
    }

    const viaAnchor = downloadBlob(blob, name)
    if (viaAnchor.ok) {
      return {
        ...viaAnchor,
        method: viaAnchor.method || 'anchor',
        pages: pdf.getNumberOfPages(),
        mode: blank ? 'blank' : 'filled',
      }
    }
    return { ok: false, error: 'Browser blocked the download' }
  } catch (e) {
    return {
      ok: false,
      error: e?.message || 'Project overview PDF generation failed',
    }
  }
}

/**
 * The contents of a logo-only handoff, as plain data — no browser, no canvas,
 * so it is fully testable and ships only what genuinely exists.
 *
 * A logo-only client needs the mark and a note, not a book about a brand that
 * does not exist. This returns the real uploaded mark (exactly as its data URL
 * holds it, same extraction the brand kit already uses) plus a README that is
 * honest about what is and is not in the pack — including, when the source is
 * raster, that it is raster and not vector, so the recipient is not told they
 * have something they do not.
 *
 * Deliberately does NOT fabricate mono/reverse files. Those exist on screen as
 * real CSS previews, but writing them as separate deliverables would need
 * canvas rendering this can't test or verify — and a pack of files the app
 * can't honestly produce is the exact thing the build rule forbids. Naming
 * them as "usually also supplied" in the README is honest; shipping fakes is
 * not.
 *
 * @param {object} pack  a brand pack snapshot
 * @returns {{ files: Array<{name:string, content:string, base64:boolean}>, hasMark: boolean }}
 */
export function markPackFiles(pack = {}) {
  const files = []
  const name = pack.projectName || 'Logo'
  let hasMark = false
  let markLine = 'No mark has been uploaded yet — add one on the Identity page.'

  const src = String(pack.logoImage || '')
  const m = src.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (m) {
    const mime = m[1]
    const ext = mime.includes('png')
      ? 'png'
      : mime.includes('jpeg') || mime.includes('jpg')
        ? 'jpg'
        : mime.includes('svg')
          ? 'svg'
          : mime.includes('webp')
            ? 'webp'
            : 'png'
    files.push({ name: `logo.${ext}`, content: m[2], base64: true })
    hasMark = true
    const isVector = ext === 'svg'
    markLine = isVector
      ? 'logo.svg — vector, scales to any size.'
      : `logo.${ext} — raster (not vector). Fine for screen and known print sizes; ask for a redraw if you need it at billboard scale.`
  }

  const readme = [
    `${name} — logo files`,
    '',
    'In this pack:',
    `- ${markLine}`,
    '',
    'A full logo handoff usually also includes a one-colour version and a',
    'reverse (light-on-dark) version. Those are shown as previews in the app;',
    'ask if you need them supplied as separate files.',
  ].join('\n')

  files.push({ name: 'README.txt', content: readme, base64: false })
  return { files, hasMark }
}

/**
 * Download the logo-only handoff: the real mark plus an honest README, zipped.
 *
 * The thin browser layer over markPackFiles() — that function decides the
 * contents (pure, tested); this one only zips and saves them, the same JSZip +
 * downloadBlobReliable path the brand kit uses. No canvas, nothing fabricated.
 *
 * @param {object} pack
 * @param {Promise|null} handlePromise  a pre-captured File System Access handle
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function downloadMarkPack(pack, handlePromise = null) {
  try {
    const { files, hasMark } = markPackFiles(pack)
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const slug = slugifyFilename(pack.projectName, 'logo')
    const folder = zip.folder(slug) || zip
    for (const f of files) {
      folder.file(f.name, f.content, f.base64 ? { base64: true } : undefined)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const zipName = `${slug}-logo-files.zip`
    if (handlePromise) {
      const written = await writeToSaveHandle(handlePromise, blob)
      if (written.ok || written.cancelled) {
        return { ...written, method: 'file-picker', hasMark }
      }
    }
    const r = await downloadBlobReliable(blob, zipName, null)
    return { ...r, hasMark }
  } catch (e) {
    return { ok: false, error: e?.message || 'Logo pack export failed' }
  }
}
