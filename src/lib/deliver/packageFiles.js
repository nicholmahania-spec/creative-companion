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
  DEFAULT_LOGO_CLEARSPACE,
  DEFAULT_LOGO_MIN_SIZE,
} from '../brandSystem'
import { packagePlan, packageReadme, fontInformation } from './packagePlan'

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
    lines.push('')
  }
  if (sys.passPairs.length) {
    lines.push('Text pairs that pass AA (4.5:1 or better):')
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
          const b64 = base64Of(pack.logoImage)
          if (b64) files.push({ path, content: b64, base64: true })
          else missing.push({ path, reason: 'the mark is not a stored image' })
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
          files.push({ path, content: packageReadme(pack, plan) })
          break
        default:
          missing.push({ path, reason: 'nothing to put in it' })
      }
    }
  }

  return { plan, files, missing }
}
