/**
 * The client package — what actually goes in the folder, and what does not.
 *
 * This plans a handoff as data: numbered folders, named files, and an
 * explicit list of everything held back with the reason. It is pure, so the
 * panel that shows the tree and the zip that writes it are reading one
 * decision rather than two.
 *
 * THREE THINGS IT WILL NOT DO
 *
 * 1. It does not fabricate files. Every entry is backed by something the
 *    project really holds — an uploaded mark, a written palette, a note. A
 *    mono and a reverse lockup are real on screen as CSS, and the app cannot
 *    honestly write them as files, so they are named in the README as
 *    normally-also-supplied rather than shipped as fakes. (Same rule
 *    markPackFiles already follows for the logo-only pack.)
 *
 * 2. It does not redistribute fonts. A commercial licence almost never
 *    permits handing the files to the client, and the platform silently
 *    zipping them would put the designer in breach on the designer's behalf.
 *    Typography ships as INFORMATION — family, weights, where to buy, what
 *    the licence says — and the files only when the designer has explicitly
 *    marked them as licensed for handover.
 *
 * 3. It does not ship anything whose rights say otherwise. Stock photography,
 *    a mockup template, a third-party illustration: each asset carries a
 *    rights value, and anything not clearly the client's to hold is excluded
 *    and SAID SO. Silence there is the failure — a designer who is not told
 *    what was held back cannot check whether it should have been.
 */

import { DELIVERABLE_OPTIONS } from '../brief/detectiveBrief'
import { SECTION_PAGES } from '../book/bookDocument'
import { assetFileName, extFromDataUrl, uniqueNames } from './naming'

/**
 * What the designer is allowed to hand over.
 *
 * `clientOwned` is the default for anything made for this job. Everything
 * else is a reason to stop and think, which is why the labels say what the
 * consequence is rather than just naming a category.
 */
export const USAGE_RIGHTS = [
  {
    id: 'clientOwned',
    label: 'Client owns it',
    ship: true,
    note: 'Made for this job — goes in the package',
  },
  {
    id: 'licensed',
    label: 'Licensed for handover',
    ship: true,
    note: 'Licence covers giving it to the client',
  },
  {
    id: 'designerOwned',
    label: 'Yours, not theirs',
    ship: false,
    note: 'Kept back — your own work, not part of this job',
  },
  {
    id: 'thirdParty',
    label: 'Third-party / stock',
    ship: false,
    note: 'Kept back — the licence is yours, not theirs',
  },
  {
    id: 'doNotDistribute',
    label: 'Do not distribute',
    ship: false,
    note: 'Kept back — marked do not distribute',
  },
]

const RIGHTS_BY_ID = Object.fromEntries(USAGE_RIGHTS.map((r) => [r.id, r]))

/** Unknown or missing rights read as the safe default: it is the client's. */
export function rightsFor(id) {
  return RIGHTS_BY_ID[id] || RIGHTS_BY_ID.clientOwned
}

export function canDistribute(asset = {}) {
  return rightsFor(asset.rights).ship
}

/**
 * The numbered folders, in the order a client reads them.
 * A folder with nothing in it is dropped rather than shipped empty.
 */
/* The brand areas are named ONCE, by the book's own section list, and the
   folders reuse those names — a package whose folders disagreed with the
   guide's chapters would send the client hunting between the two. Only the
   guide folder and the paperwork folder are the package's own, because the
   book has no section for itself or for the brief. */
const sectionName = (id) =>
  SECTION_PAGES.find((s) => s.id === id)?.short || id

export const PACKAGE_FOLDERS = [
  { id: 'guide', num: '01', name: 'Brand_Guide' },
  { id: 'logo', num: '02', name: sectionName('logo') },
  { id: 'colour', num: '03', name: sectionName('color') },
  { id: 'type', num: '04', name: sectionName('type') },
  { id: 'applications', num: '05', name: sectionName('apps') },
  { id: 'brief', num: '06', name: 'Project' },
]

export const folderName = (f) => `${f.num}_${String(f.name).toUpperCase()}`

const text = (v) => String(v ?? '').trim()

/**
 * Typography as information, not as font files.
 *
 * Returns the text of the font sheet plus whether any actual file is being
 * included — the two things the panel has to say out loud, because “fonts
 * included” and “fonts documented” are different promises and the client will
 * assume the first one.
 *
 * @param {object} pack
 * @returns {{ text: string, filesIncluded: boolean }}
 */
export function fontInformation(pack = {}) {
  const heading = text(pack.typeHeading) || '—'
  const body = text(pack.typeBody) || '—'
  const licence = text(pack.typeLicenceNote)
  const source = text(pack.typeSource)
  const filesIncluded = pack.fontFilesLicensed === true

  const lines = [
    `${text(pack.projectName) || 'Brand'} — typography`,
    '',
    `Heading face: ${heading}`,
    `Body face: ${body}`,
  ]
  if (text(pack.typeWhy)) lines.push('', `Why this pairing: ${pack.typeWhy}`)
  lines.push('', 'Where to get them:', source || '  (not recorded — ask your designer)')
  lines.push('', 'Licence:', licence || '  (not recorded — ask your designer)')
  lines.push(
    '',
    filesIncluded
      ? 'The font files in this folder are included under a licence that permits it.'
      : 'The font files are NOT included. Fonts are licensed to the person who bought them, so they are documented here rather than copied — buy or download them from the source above.'
  )
  return { text: lines.join('\n'), filesIncluded }
}

/**
 * Plan the package.
 *
 * @param {object} pack   a brand pack snapshot (buildBrandPackSnapshot shape)
 * @param {{ assets?: Array<object>, includeBook?: boolean }} [opts]
 *   assets — extra files with { id, name, dataUrl, group, item, variant, rights }
 * @returns {{
 *   brand: string,
 *   folders: Array<{ id, name, files: Array<{ name, kind, note }> }>,
 *   excluded: Array<{ name: string, reason: string }>,
 *   fileCount: number,
 * }}
 */
export function packagePlan(pack = {}, { assets = [], includeBook = true } = {}) {
  const brand = text(pack?.projectName) || 'Brand'
  const bucket = Object.fromEntries(PACKAGE_FOLDERS.map((f) => [f.id, []]))
  const excluded = []

  const add = (folder, file) => bucket[folder]?.push(file)

  // ── 01 Brand guide ────────────────────────────────────────────────────
  if (includeBook) {
    add('guide', {
      name: assetFileName({ brand, group: 'brand', item: 'guide', ext: 'pdf' }),
      kind: 'book',
      note: 'The brand book as a PDF',
    })
  }

  // ── 02 Logo ───────────────────────────────────────────────────────────
  const markExt = extFromDataUrl(pack?.logoImage)
  if (markExt) {
    add('logo', {
      name: assetFileName({
        brand,
        group: 'logo',
        item: 'primary',
        variant: markExt === 'svg' ? '' : 'FullColor',
        ext: markExt,
      }),
      kind: 'mark',
      note:
        markExt === 'svg'
          ? 'Vector — scales to any size'
          : 'Raster, not vector — fine for screen and known print sizes',
    })
  }
  add('logo', {
    name: assetFileName({ brand, group: 'logo', item: 'usage', ext: 'txt' }),
    kind: 'logoUsage',
    note: 'Clearspace, minimum size, what not to do',
  })

  // ── 03 Colour ─────────────────────────────────────────────────────────
  if ((pack?.palette || []).length) {
    add('colour', {
      name: assetFileName({ brand, group: 'colour', item: 'specifications', ext: 'txt' }),
      kind: 'colourSpec',
      note: 'HEX, RGB and CMYK for every colour, with its job',
    })
    add('colour', {
      name: assetFileName({ brand, group: 'colour', item: 'tokens', ext: 'css' }),
      kind: 'tokensCss',
      note: 'Custom properties for whoever builds the site',
    })
  }

  // ── 04 Typography ─────────────────────────────────────────────────────
  const fonts = fontInformation(pack)
  add('type', {
    name: assetFileName({ brand, group: 'typography', item: 'information', ext: 'txt' }),
    kind: 'fontInfo',
    note: fonts.filesIncluded
      ? 'Families, weights, licence — files included'
      : 'Families, weights, licence — files not redistributed',
  })

  // ── 05 Applications, and anything else uploaded ───────────────────────
  for (const a of assets || []) {
    if (!a) continue
    const rights = rightsFor(a.rights)
    const label = text(a.name) || 'asset'
    if (!rights.ship) {
      excluded.push({ name: label, reason: rights.note })
      continue
    }
    const ext = extFromDataUrl(a.dataUrl) || text(a.ext) || 'png'
    add(a.folder && bucket[a.folder] ? a.folder : 'applications', {
      name: assetFileName({
        brand,
        group: a.group || 'application',
        item: a.item || label,
        variant: a.variant || '',
        ext,
      }),
      kind: 'asset',
      note: rights.label,
      assetId: a.id,
    })
  }

  // ── 06 The project's own paperwork ────────────────────────────────────
  add('brief', {
    name: assetFileName({ brand, group: 'brief', item: 'agreed', ext: 'md' }),
    kind: 'brief',
    note: 'What was agreed, in the client’s own words',
  })
  add('brief', {
    name: 'README.txt',
    kind: 'readme',
    note: 'What is in this package, and what is not',
  })

  const folders = PACKAGE_FOLDERS.filter((f) => bucket[f.id].length).map((f) => {
    const files = bucket[f.id]
    const names = uniqueNames(files.map((x) => x.name))
    return {
      id: f.id,
      name: folderName(f),
      files: files.map((x, i) => ({ ...x, name: names[i] })),
    }
  })

  return {
    brand,
    folders,
    excluded,
    fileCount: folders.reduce((n, f) => n + f.files.length, 0),
  }
}

/**
 * The README that travels with the package.
 *
 * States what is here, what is deliberately not, and what was held back on
 * rights — the client should never have to guess which of the three a missing
 * thing is.
 */
export function packageReadme(pack = {}, plan = null) {
  const p = plan || packagePlan(pack)
  const lines = [
    `${p.brand} — brand package`,
    '',
    'Folders:',
    ...p.folders.map((f) => `  ${f.name}/  (${f.files.length} file${f.files.length === 1 ? '' : 's'})`),
    '',
    'Contents:',
  ]
  for (const f of p.folders) {
    lines.push(`  ${f.name}/`)
    for (const file of f.files) lines.push(`    ${file.name} — ${file.note}`)
  }
  const fonts = fontInformation(pack)
  if (!fonts.filesIncluded) {
    lines.push(
      '',
      'Fonts:',
      '  Font files are not included. Fonts are licensed to whoever bought them,',
      '  so the typography folder documents what to buy and where instead.'
    )
  }
  if (p.excluded.length) {
    lines.push('', 'Not included:')
    for (const x of p.excluded) lines.push(`  ${x.name} — ${x.reason}`)
  }
  lines.push(
    '',
    'A full logo handoff usually also includes a one-colour and a reverse',
    'version of the mark. Those are shown in the app as previews; ask your',
    'designer if you need them as separate files.',
    ''
  )
  return lines.join('\n')
}

/**
 * Did the client get what they bought?
 *
 * One row per deliverable the brief actually picked — no invented rows, and
 * no row for anything not bought. `ok` means the package carries something
 * that satisfies it; otherwise `missing` says what to do.
 *
 * @param {object} pack
 * @param {ReturnType<typeof packagePlan>} [planIn]
 * @returns {Array<{ id, label, ok, missing }>}
 */
export function deliverableChecklist(pack = {}, planIn = null) {
  const plan = planIn || packagePlan(pack)
  const kinds = new Set(plan.folders.flatMap((f) => f.files.map((x) => x.kind)))
  const picked = Array.isArray(pack?.detective?.deliverablesPicked)
    ? pack.detective.deliverablesPicked
    : []

  const SATISFIED = {
    logoPrimary: () => kinds.has('mark'),
    logoVariations: () => kinds.has('mark'),
    colourPalette: () => kinds.has('colourSpec'),
    typography: () => kinds.has('fontInfo'),
    guidelines: () => kinds.has('book'),
  }
  const MISSING = {
    logoPrimary: 'No mark uploaded yet — add it on Identity',
    logoVariations:
      'Only the primary mark is in the package — variations are supplied by hand',
    colourPalette: 'No palette set yet',
    typography: 'Typography not documented yet',
    guidelines: 'The brand book is not being included',
  }

  return picked
    .map((id) => {
      const option = DELIVERABLE_OPTIONS.find((o) => o.id === id)
      if (!option) return null
      const check = SATISFIED[id]
      /* A deliverable this app cannot produce (packaging, signage, a website)
         is the designer's own file to add, so it is listed as an item to
         attach rather than silently ticked or silently failed. */
      const ok = check
        ? check()
        : plan.folders.some((f) =>
            f.files.some((x) => x.kind === 'asset')
          )
      return {
        id,
        label: option.label,
        ok,
        missing: ok
          ? ''
          : MISSING[id] || `Attach the ${option.label.toLowerCase()} file`,
      }
    })
    .filter(Boolean)
}
