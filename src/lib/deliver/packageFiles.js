/**
 * The package's contents as data — every planned file paired with the text
 * (or base64 payload) that goes in it.
 *
 * Split from the zip writer for the reason markPackFiles already was: the
 * contents are a decision worth testing, and the zip is a browser detail that
 * cannot be. The plan decides WHAT ships and under what name; this decides
 * what is inside each one; downloadClientPackage only writes them.
 *
 * The brand book PDF is the one entry this cannot produce, because it needs
 * the PDF engine and a live document. It is returned with `pdf: true` and no
 * content, and the writer fills it in — so a caller that cannot build a PDF
 * still gets a complete, honest package with the book left out rather than a
 * zip containing a broken file.
 */

import {
  buildColorSystem,
  buildCssTokens,
  logoDontsList,
  logoDefaultsNote,
  roleReadability,
  DEFAULT_LOGO_CLEARSPACE,
  DEFAULT_LOGO_MIN_SIZE,
} from '../brandSystem'
import { packagePlan, packageReadme, fontInformation } from './packagePlan'
import { markSource } from './markSource'

const text = (v) => String(v ?? '').trim()

/** Base64 payload of a data URL, or null. */
function base64Of(url) {
  const m = String(url || '').match(/^data:[^;]+;base64,(.+)$/)
  return m ? m[1] : null
}

/** The logo usage sheet — the rules a mark needs to survive other people. */
export function logoUsageText(pack = {}) {
  const lines = [
    `${text(pack.projectName) || 'Brand'} — logo usage`,
    '',
    `Clearspace: ${text(pack.logoClearspace) || DEFAULT_LOGO_CLEARSPACE}`,
    `Minimum size: ${text(pack.logoMinSize) || DEFAULT_LOGO_MIN_SIZE}`,
    '',
    'Please do not:',
    ...logoDontsList(pack).map((d) => `  - ${d}`),
    '',
  ]
  /* Say which of these nobody chose. The brand book learned to do this; this
     sheet is a second client-facing copy of the same rules and was still
     presenting the built-in defaults in the designer's voice. */
  const defaultsNote = logoDefaultsNote(pack)
  if (defaultsNote) lines.push(defaultsNote, '')
  if (text(pack.logoWordmark)) {
    lines.splice(2, 0, `Wordmark: ${pack.logoWordmark}`, '')
  }
  return lines.join('\n')
}

/** Every colour with its job and its codes, for screen and for print. */
export function colourSpecText(pack = {}) {
  const sys = buildColorSystem(pack.palette, pack.colorRoles)
  const why = pack.colorRoleWhy || {}
  const lines = [`${text(pack.projectName) || 'Brand'} — colour`, '']
  for (const row of sys.roleRows) {
    lines.push(
      `${row.role.toUpperCase()} — ${row.job}`,
      `  HEX ${row.hex}`,
      `  ${row.rgb}`,
      `  ${row.cmyk}`
    )
    if (text(why[row.role])) lines.push(`  Why: ${why[row.role]}`)
    lines.push('')
  }
  if (sys.swatches.length) {
    lines.push('Full palette:')
    for (const s of sys.swatches) lines.push(`  ${s.hex} · ${s.rgb} · ${s.cmyk}`)
    /* A role can be assigned a colour that is in no palette slot, and then the
       two lists above silently disagree — four documented roles above a
       two-colour palette, with no way for the client to reconcile them. */
    const inPalette = new Set(sys.colors.map((h) => h.toLowerCase()))
    const strays = sys.roleRows.filter((r) => !inPalette.has(r.hex.toLowerCase()))
    if (strays.length) {
      lines.push(
        '',
        `Assigned to a job but not in the palette above: ${strays
          .map((r) => `${r.hex} (${r.label})`)
          .join(', ')}`
      )
    }
    lines.push('')
  }

  /* The pairings the brand actually uses, pass AND fail.
     This section used to list passing pairs only, under the heading "Text pairs
     that pass AA" — so a package went out documenting Text #737373 and
     Background #FFB8B8 as the two roles, listing one unrelated passing pair,
     and never saying that Text on Background is 2.89:1 and unreadable. Showing
     only the good news reads as a clearance. */
  const readability = roleReadability(pack.palette, pack.colorRoles)
  const failing = readability.filter((r) => !r.ok)
  if (readability.length) {
    lines.push('How the roles read against each other:')
    for (const r of readability) {
      lines.push(
        `  ${r.ok ? 'OK  ' : 'FAIL'} ${r.label} — ${r.fg} on ${r.bg} — ${r.ratio.toFixed(2)}:1 (needs ${r.need}:1)`
      )
    }
    if (failing.length) {
      lines.push(
        '',
        failing.length === 1
          ? 'One of these pairings is below the readable minimum. Ask your'
          : `${failing.length} of these pairings are below the readable minimum. Ask your`,
        'designer before using it for body text — it is a contrast problem, not',
        'a matter of taste.'
      )
    }
    lines.push('')
  }

  if (sys.passPairs.length) {
    lines.push('Palette pairs that pass AA for body text (4.5:1 or better):')
    for (const p of sys.passPairs) lines.push(`  ${p.fg} on ${p.bg} — ${p.label}`)
  } else {
    /* Said out loud rather than left as an empty heading: no passing pair is
       a real finding about the palette, not a gap in the export. */
    lines.push(
      'No pair in this palette reaches AA for body text — set text on white',
      'or near-black, and treat the brand colours as accents.'
    )
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * Fill every planned file with its contents.
 *
 * @param {object} pack
 * @param {{ assets?: Array<object>, includeBook?: boolean, briefMarkdown?: string }} [opts]
 * @returns {{
 *   plan: object,
 *   files: Array<{ path: string, content?: string, base64?: boolean, pdf?: boolean }>,
 *   missing: Array<{ path: string, reason: string }>,
 * }}
 */
export function packageFiles(pack = {}, opts = {}) {
  const { assets = [], briefMarkdown = '' } = opts
  const plan = packagePlan(pack, opts)
  const byId = new Map((assets || []).filter(Boolean).map((a) => [a.id, a]))
  const files = []
  const missing = []

  for (const folder of plan.folders) {
    for (const file of folder.files) {
      const path = `${folder.name}/${file.name}`
      switch (file.kind) {
        case 'book':
          files.push({ path, pdf: true })
          break
        case 'mark': {
          /* Same decision the plan made, not a second opinion about it — see
             markSource.js. Re-splitting the raw string here is how a mark the
             planner had already accepted could still fail to be written. */
          const mark = markSource(pack.logoImage)
          if (mark.state === 'ready') {
            files.push({ path, content: mark.base64, base64: true })
          } else {
            missing.push({
              path,
              reason: mark.reason || 'the mark is not a stored image',
            })
          }
          break
        }
        case 'asset': {
          const b64 = base64Of(byId.get(file.assetId)?.dataUrl)
          if (b64) files.push({ path, content: b64, base64: true })
          else
            missing.push({
              path,
              reason: 'this file lives outside the app — add it to the folder',
            })
          break
        }
        case 'logoUsage':
          files.push({ path, content: logoUsageText(pack) })
          break
        case 'colourSpec':
          files.push({ path, content: colourSpecText(pack) })
          break
        case 'tokensCss':
          files.push({ path, content: buildCssTokens(pack) })
          break
        case 'fontInfo':
          files.push({ path, content: fontInformation(pack).text })
          break
        case 'brief':
          if (text(briefMarkdown)) files.push({ path, content: briefMarkdown })
          else missing.push({ path, reason: 'the brief is empty' })
          break
        case 'readme':
          /* Filled after the loop, not here. The README is the one file that
             has to describe the others, and `missing` is not complete until
             every folder has been walked — generating it in place meant a
             package could omit the mark entirely while its own contents list
             said nothing about it. */
          files.push({ path, readme: true })
          break
        default:
          missing.push({ path, reason: 'nothing to put in it' })
      }
    }
  }

  const readme = files.find((f) => f.readme)
  if (readme) {
    readme.content = packageReadme(pack, plan, missing)
    delete readme.readme
  }

  return { plan, files, missing }
}
