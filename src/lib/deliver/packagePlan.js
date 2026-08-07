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
import { assetFileName, extFromBytes, extFromDataUrl, uniqueNames } from './naming'
import { markSource, markGapSentence } from './markSource'
import { familyByName, parseLabel } from '../book/fontCatalog'

/** The extension a URL's own path suggests — a provisional name only, because
 *  the bytes decide once they arrive. */
function extFromUrlPath(url) {
  const m = String(url || '').split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i)
  return m ? m[1].toLowerCase() : ''
}

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

/* Not in USAGE_RIGHTS: it is not a choice the designer can make, it is the
   absence of one. Kept out of the list so it never appears in the dropdown. */
const RIGHTS_UNSET = {
  id: 'unset',
  label: 'Rights not set',
  ship: false,
  note: 'Rights were never set on this file — say whose it is and it ships',
}

/**
 * Unknown or missing rights hold the file BACK, and say so.
 *
 * This used to return `clientOwned` for anything unrecognised, with a comment
 * calling that "the safe default". It is the unsafe one in both directions at
 * once: `clientOwned` is `ship: true`, so the file went in the package, AND
 * its label — "Client owns it" — was printed next to the file in the client's
 * README. The app asserted ownership on the client's behalf about a file it
 * knew nothing about. Rule 3 in this module's header already forbids that;
 * this line was the exception that quietly disagreed with it.
 *
 * Files added through the panel are stamped `clientOwned` at the door
 * (`addPackageAsset`), so this path is not the ordinary one — it catches
 * assets that arrive by any other route, and it fails loud rather than open:
 * held back, named in the panel, named in the README.
 */
export function rightsFor(id) {
  return RIGHTS_BY_ID[id] || RIGHTS_UNSET
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

/* One spelling per package, taken from the same place the folder name is.
   A client received `03_COLOR/` containing `..._Colour_Specifications.txt`
   beside `..._Logo_Primary_FullColor.png` — three spellings of one word in a
   folder that is meant to read as a single considered object. The folder was
   single-sourced from SECTION_PAGES and the file names were hardcoded, so they
   drifted the moment either changed. */
const COLOUR_WORD = sectionName('color')

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
  /* The app already knows the answer to both of these for every face it can
     name. `fontCatalog` is a closed list and #159 established that every
     family in it is published under the SIL Open Font License in google/fonts
     — which is why the brand book can embed their letterforms at all.
     So printing "(not recorded — ask your designer)" sent a client away with a
     question the app could have answered, about a font that is free. The
     designer's own note still wins where they wrote one; this only fills a
     blank, and says it is the app speaking rather than them. */
  const catalogFace =
    familyByName(parseLabel(heading).family) ||
    familyByName(parseLabel(body).family)
  const known = catalogFace
    ? {
        source: `Google Fonts — https://fonts.google.com/?query=${encodeURIComponent(catalogFace.name)}`,
        licence: 'SIL Open Font License 1.1 — free to use, including commercially',
      }
    : null

  lines.push(
    '',
    'Where to get them:',
    source || (known ? `  ${known.source}` : '  (not recorded — ask your designer)')
  )
  lines.push(
    '',
    'Licence:',
    licence || (known ? `  ${known.licence}` : '  (not recorded — ask your designer)')
  )
  /* Names only what was actually filled. Saying "where this sheet says Google
     Fonts and the Open Font License" when the designer wrote their own source
     and only the licence was filled would credit the app for their words. */
  const filled = [!source && 'where to get them', !licence && 'the licence']
    .filter(Boolean)
    .join(' and ')
  if (known && filled) {
    lines.push(
      '',
      `The line for ${filled} is the app filling in what it knows about these`,
      'faces — not a note your designer wrote.'
    )
  }
  /* "from the source above" only when there IS a source above. With nothing
     recorded, the sheet read "(not recorded — ask your designer)" and then
     told the client to buy from it — a sentence pointing at its own blank. */
  lines.push(
    '',
    filesIncluded
      ? 'The font files in this folder are included under a licence that permits it.'
      : source || known
        ? 'The font files are NOT included. Fonts are licensed to the person who bought them, so they are documented here rather than copied — get them from the source above.'
        : 'The font files are NOT included. Fonts are licensed to the person who bought them, so they are documented here rather than copied. No source was recorded for these faces — ask your designer where to buy them.'
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
  /* Three outcomes, not two. "I cannot read this string" used to fall through
     the same branch as "there is no mark", so a project WITH artwork shipped a
     logo folder with no logo, and every report — this plan, the README, the
     panel, the export toast — described the package as complete. The mark was
     in the brand book PDF in the same zip. See markSource.js. */
  const mark = markSource(pack?.logoImage)
  if (mark.state === 'ready') {
    add('logo', {
      name: assetFileName({
        brand,
        group: 'logo',
        item: 'primary',
        variant: mark.ext === 'svg' ? '' : 'FullColor',
        ext: mark.ext,
      }),
      kind: 'mark',
      note:
        mark.ext === 'svg'
          ? 'Vector — scales to any size'
          : 'Raster, not vector — fine for screen and known print sizes',
    })
  } else if (mark.state === 'fetch') {
    /* A mark stored as a link is a file the package CAN carry — it just has to
       be collected. Reporting it as held back was honest and still lost the
       client their logo.
       Planned here, synchronously, so the panel and the zip keep reading ONE
       decision: the panel says it will be downloaded, the writer downloads it,
       and a fetch that fails is reported rather than quietly changing what
       shipped. Same shape as the brand book, which is planned as a file and
       filled in by the writer.
       The extension is provisional — the bytes decide when they arrive. */
    add('logo', {
      name: assetFileName({
        brand,
        group: 'logo',
        item: 'primary',
        variant: 'FullColor',
        ext: extFromUrlPath(pack?.logoImage) || 'png',
      }),
      kind: 'mark',
      note: 'Collected from your cloud storage when the package is built',
    })
  } else if (mark.state === 'held') {
    excluded.push({
      name: 'The logo artwork',
      reason: markGapSentence(mark.reason),
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
      name: assetFileName({ brand, group: COLOUR_WORD, item: 'specifications', ext: 'txt' }),
      kind: 'colourSpec',
      note: 'HEX, RGB and CMYK for every colour, with its job',
    })
    add('colour', {
      name: assetFileName({ brand, group: COLOUR_WORD, item: 'tokens', ext: 'css' }),
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
    /* Held back by the app rather than by the licence, but the client needs
       the same thing said either way: this exists and is not in the folder. */
    if (a.heldBack) {
      const mb = a.sizeBytes ? ` (${(a.sizeBytes / 1024 / 1024).toFixed(1)}MB)` : ''
      excluded.push({
        name: label,
        reason:
          a.heldBack === 'tooLarge'
            ? `Too large to store in the app${mb} — ask your designer for it directly`
            : 'Held back by the app',
      })
      continue
    }
    if (!rights.ship) {
      excluded.push({ name: label, reason: rights.note })
      continue
    }
    /* Bytes first, mime second, the caller's claim third — and `bin` rather
       than a guess when all three are silent. This used to end in `|| 'png'`,
       which is how a package shipped two files named `.png` whose first four
       bytes were `%PDF`: the mime was unrecognised, so the extension was
       asserted. A wrong extension is worse than an unfamiliar one, because the
       client's machine acts on it. */
    const ext =
      extFromBytes(a.dataUrl) || extFromDataUrl(a.dataUrl) || text(a.ext) || 'bin'
    /* A folder the app does not recognise is held back, not redirected. An
       unset folder still means Applications — that is the ordinary path for
       everything added through the panel — but a folder that was SET to
       something unknown is a disagreement between caller and plan, and
       quietly filing it under Applications resolves that disagreement by
       guessing. The client cannot tell a guess from a decision. */
    if (a.folder && !bucket[a.folder]) {
      excluded.push({
        name: label,
        reason: `Meant for a folder this package does not have (${a.folder}) — add it to the folder by hand`,
      })
      continue
    }
    add(a.folder || 'applications', {
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
      /* Which bought item this file IS. Carried into the plan so the
         checklist can be computed from the plan alone, the way every other
         reader of this module works. Empty means the designer has not said. */
      deliverable: text(a.deliverable),
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
export function packageReadme(pack = {}, plan = null, missing = []) {
  const p = plan || packagePlan(pack)
  const lines = [
    `${p.brand} — brand package`,
    '',
    'Folders:',
    ...p.folders.map((f) => `  ${f.name}/  (${f.files.length} file${f.files.length === 1 ? '' : 's'})`),
    '',
    'Contents:',
  ]
  /* Contents lists what was PLANNED, and not everything planned survives. A
     line naming a file that is not in the folder sends the client looking for
     it, so absence is marked where they read the name — not only in a list
     further down. */
  const gapByPath = new Map((missing || []).filter(Boolean).map((m) => [m.path, m.reason]))
  for (const f of p.folders) {
    lines.push(`  ${f.name}/`)
    for (const file of f.files) {
      const gap = gapByPath.get(`${f.name}/${file.name}`)
      lines.push(
        gap
          ? `    ${file.name} — NOT INCLUDED (${gap})`
          : `    ${file.name} — ${file.note}`
      )
    }
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
  /* Planned but not written. A package once shipped a logo folder holding
     nothing but a usage sheet, and the README's contents list said only what
     WAS there — so the absence of the mark itself was the one fact the
     document did not mention. A missing file the client is not told about is
     indistinguishable from one they lost. */
  const gaps = (missing || []).filter(Boolean)
  if (gaps.length) {
    lines.push('', 'Planned but not in this package:')
    for (const g of gaps) lines.push(`  ${g.path} — ${g.reason}`)
  }

  /* Only when a mark actually shipped. Offering the "usually also includes"
     footnote for a package with no logo at all implies a primary was
     supplied. */
  const hasMark = p.folders.some((f) => f.files.some((x) => x.kind === 'mark'))
  const markShipped =
    hasMark && !gaps.some((g) => /logo/i.test(g.path) && /mark/i.test(g.reason))
  if (markShipped) {
    lines.push(
      '',
      'A full logo handoff usually also includes a one-colour and a reverse',
      'version of the mark. Those are shown in the app as previews; ask your',
      'designer if you need them as separate files.'
    )
  } else if (markSource(pack?.logoImage).state === 'none') {
    lines.push(
      '',
      'No logo file is included in this package — there is no stored mark on',
      'the project yet. The usage sheet describes the rules; ask your designer',
      'for the artwork itself.'
    )
  } else {
    /* There IS a mark, and this package could not write it. The sentence above
       would tell the client the designer never made one — a confident claim,
       false, and about the wrong person. */
    lines.push(
      '',
      'No logo file is included in this package, but the mark does exist —',
      'the app could not write it into the folder from how it is stored.',
      'The usage sheet describes the rules; ask your designer for the',
      'artwork itself.'
    )
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * The bought items the app produces itself from project data. Everything else
 * the brief picked is the designer's own file to add and attribute.
 */
export const GENERATED_DELIVERABLES = [
  'logoPrimary',
  'logoVariations',
  'colourPalette',
  'typography',
  'guidelines',
]

/**
 * The bought items an uploaded file can be attributed to — what the panel
 * offers on each asset row.
 *
 * Only items the brief actually picked, minus the ones the app makes itself.
 * An empty result means every bought item is app-generated, and the row's
 * attribution control has nothing to ask about, so it is not shown.
 *
 * @param {object} pack
 * @returns {Array<{ id: string, label: string }>}
 */
export function attachableDeliverables(pack = {}) {
  const picked = Array.isArray(pack?.detective?.deliverablesPicked)
    ? pack.detective.deliverablesPicked
    : []
  return picked
    .filter((id) => !GENERATED_DELIVERABLES.includes(id))
    .map((id) => DELIVERABLE_OPTIONS.find((o) => o.id === id))
    .filter(Boolean)
    .map((o) => ({ id: o.id, label: o.label }))
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
  /* Which bought items the uploaded files have actually been ATTRIBUTED to.
     This used to be `plan.folders.some(f => f.files.some(x => x.kind ===
     'asset'))` — one shared boolean meaning "the package contains at least one
     file of any kind", reused as the answer for every deliverable the app
     cannot generate itself. So a single upload ticked business cards AND
     packaging AND shelf talkers AND the tote at once, and the panel printed
     "Everything the brief asked for is in here."

     It did exactly that on a real package whose only uploads were three files
     belonging to a different client entirely. The checklist was not merely
     failing to catch the error, it was affirmatively vouching for it, at the
     moment the designer was looking for a reason to stop checking. A checklist
     that can be wrong in the reassuring direction is worse than none.

     Attribution also does the catching for free: a file that belongs to no
     bought item has nothing to tick, so it cannot vouch for anything. */
  const attributed = new Set(
    plan.folders
      .flatMap((f) => f.files)
      .filter((x) => x.kind === 'asset' && x.deliverable)
      .map((x) => x.deliverable)
  )
  const picked = Array.isArray(pack?.detective?.deliverablesPicked)
    ? pack.detective.deliverablesPicked
    : []

  /* One entry per id in GENERATED_DELIVERABLES — that list is what
     `attachableDeliverables` subtracts, so the two cannot drift. */
  const SATISFIED = {
    logoPrimary: () => kinds.has('mark'),
    logoVariations: () => kinds.has('mark'),
    colourPalette: () => kinds.has('colourSpec'),
    typography: () => kinds.has('fontInfo'),
    guidelines: () => kinds.has('book'),
  }
  /* "No mark uploaded yet" sent a designer to the Identity page to look at the
     mark that was already there. When one is stored but unusable, say which
     problem it is. */
  const markState = markSource(pack?.logoImage)
  /* `fetch` is not a gap — the mark ships, it is just collected on the way.
     Only 'held' and 'none' belong in a MISSING line. */
  const noMarkLine =
    markState.state === 'held'
      ? `The mark is on the project but could not go in the package — ${markState.reason}`
      : 'No mark uploaded yet — add it on Identity'
  const MISSING = {
    logoPrimary: noMarkLine,
    /* "Only the primary mark is in the package" is true when a primary
       shipped. In the held case none did, and printing it directly under the
       line that says so read as the panel contradicting itself. */
    logoVariations:
      markState.state === 'held'
        ? noMarkLine
        : 'Only the primary mark is in the package — variations are supplied by hand',
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
         is the designer's own file to add, so it is ticked only by a file
         attributed to it — never by the presence of files in general. */
      const ok = check ? check() : attributed.has(id)
      return {
        id,
        label: option.label,
        ok,
        missing: ok
          ? ''
          : MISSING[id] || `Add the ${option.label.toLowerCase()} file, or mark which file it is`,
      }
    })
    .filter(Boolean)
}
