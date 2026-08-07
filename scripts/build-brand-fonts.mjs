#!/usr/bin/env node
/**
 * Regenerate `src/lib/book/brandFontData/` — the CLIENT's typefaces, so the
 * brand book can show their real letterforms instead of describing them.
 *
 * WHY THIS EXISTS
 *
 * The Typography page used to set every specimen in the book's own Archivo and
 * Lora and merely NAME the project's faces, on the reasoning that "the book
 * cannot embed a typeface it was never given". That reasoning was half right.
 * It was never given a font FILE — but it was given a name, and every name the
 * app can resolve comes from a closed registry (`fontCatalog.js`) of twenty
 * families that are all published under the SIL Open Font License in
 * google/fonts. A name that resolves to a known OFL family is not an unknown
 * typeface; it is a font this script can fetch at build time.
 *
 * So the book can show the client's actual alphabet. This is the half that was
 * missing: `scripts/build-book-fonts.mjs` already turns a font file into
 * embeddable base64 for the book's OWN faces. This is the same pipeline
 * pointed at the faces a PROJECT can choose.
 *
 * LICENSING — established, not assumed
 *
 * Every family in the registry lives under `ofl/` in google/fonts, i.e. SIL
 * Open Font License 1.1. The OFL grants permission to "use, study, copy,
 * merge, embed, modify, redistribute" and states that "the requirement for
 * fonts to remain under this license does not apply to any document created
 * using the Font Software". The OFL FAQ is explicit about this exact act:
 *
 *   Q1.12 — Can I embed the font in a document (like a PDF)?
 *           "Yes, either in full or a subset."
 *   Q1.13 — "Referencing or embedding an OFL font in any document does not
 *           change the license of the document itself."
 *
 * This is NOT the thing `src/lib/deliver/packagePlan.js` refuses to do. That
 * guardrail is about handing the client redistributable font FILES, which a
 * commercial licence almost never allows. It stands untouched and this script
 * does not weaken it: nothing here ever reaches the client package.
 *
 * WHAT IS EMBEDDED IS DELIBERATELY NOT A USABLE FONT
 *
 * Each face is instanced to one weight, subset to printable ASCII only, and
 * stripped of hinting, layout tables (GSUB/GPOS/GDEF), and glyph names. What
 * travels in the PDF renders 95 characters at one weight and nothing else — no
 * accents, no currency beyond `$`, no kerning, no ligatures, no italic. It
 * cannot substitute for the real font, which keeps this a specimen rather than
 * a delivery mechanism. Attribution rides along in the generated modules and
 * in `brandFonts.LICENSE.txt`, per OFL FAQ Q1.14.
 *
 * Checked in on purpose, for the same reason the book's own fonts are: the CLI
 * builds books with no network, and a deliverable that only renders correctly
 * when fonts.gstatic.com answers is a deliverable with a network dependency.
 *
 * Requires: python3 with `fonttools` (pip install fonttools) and network
 * access to raw.githubusercontent.com. Set PYTHON=/path/to/python to override
 * the interpreter (e.g. a virtualenv).
 *
 * Usage: node scripts/build-brand-fonts.mjs
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/* fontCatalog is imported rather than restated — it is the list of families
   the app can actually name, so it is the only correct definition of what
   needs building. It is also self-contained, which is what lets plain Node run
   this script while the app loads the same file through Vite. */
import { FONT_FAMILIES, WEIGHT_LABELS } from '../src/lib/book/fontCatalog.js'

/** The weights a label can name — the same four the Builder's selects emit. */
const EMBEDDABLE_WEIGHTS = Object.keys(WEIGHT_LABELS).map(Number).sort((a, b) => a - b)

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..')
const OUT_DIR = path.join(REPO, 'src/lib/book/brandFontData')
const GF = 'https://raw.githubusercontent.com/google/fonts/main'
const PYTHON = process.env.PYTHON || 'python3'

/* Printable ASCII. The character-set page shows A-Z, a-z, 0-9 and punctuation
   and nothing else, so anything past U+007E would be weight in every export
   that no page can ever reach. It is also what keeps the embedded face
   unusable as a font. */
const FIRST_CP = 0x20
const LAST_CP = 0x7e

/**
 * Where each registry family's source lives in google/fonts.
 *
 * Keys are `FONT_FAMILIES[].id`, checked against the registry below — a family
 * added to the catalog with no entry here fails this build rather than
 * silently shipping a book that quietly declines to show its specimen.
 *
 * `variable` is a single file with a wght axis; `static` names one file per
 * weight for the families that were never released variable.
 */
const SOURCES = {
  fraunces: { dir: 'ofl/fraunces', variable: 'Fraunces[SOFT,WONK,opsz,wght].ttf' },
  playfair: { dir: 'ofl/playfairdisplay', variable: 'PlayfairDisplay[wght].ttf' },
  'space-grotesk': { dir: 'ofl/spacegrotesk', variable: 'SpaceGrotesk[wght].ttf' },
  bricolage: { dir: 'ofl/bricolagegrotesque', variable: 'BricolageGrotesque[opsz,wdth,wght].ttf' },
  inter: { dir: 'ofl/inter', variable: 'Inter[opsz,wght].ttf' },
  'source-serif': { dir: 'ofl/sourceserif4', variable: 'SourceSerif4[opsz,wght].ttf' },
  archivo: { dir: 'ofl/archivo', variable: 'Archivo[wdth,wght].ttf' },
  oswald: { dir: 'ofl/oswald', variable: 'Oswald[wght].ttf' },
  newsreader: { dir: 'ofl/newsreader', variable: 'Newsreader[opsz,wght].ttf' },
  'eb-garamond': { dir: 'ofl/ebgaramond', variable: 'EBGaramond[wght].ttf' },
  syne: { dir: 'ofl/syne', variable: 'Syne[wght].ttf' },
  outfit: { dir: 'ofl/outfit', variable: 'Outfit[wght].ttf' },
  jakarta: { dir: 'ofl/plusjakartasans', variable: 'PlusJakartaSans[wght].ttf' },
  'libre-baskerville': { dir: 'ofl/librebaskerville', variable: 'LibreBaskerville[wght].ttf' },
  'source-sans': { dir: 'ofl/sourcesans3', variable: 'SourceSans3[wght].ttf' },
  'dm-sans': { dir: 'ofl/dmsans', variable: 'DMSans[opsz,wght].ttf' },
  'plex-mono': {
    dir: 'ofl/ibmplexmono',
    static: {
      400: 'IBMPlexMono-Regular.ttf',
      500: 'IBMPlexMono-Medium.ttf',
      600: 'IBMPlexMono-SemiBold.ttf',
      700: 'IBMPlexMono-Bold.ttf',
    },
  },
  'zilla-slab': {
    dir: 'ofl/zillaslab',
    static: {
      400: 'ZillaSlab-Regular.ttf',
      500: 'ZillaSlab-Medium.ttf',
      600: 'ZillaSlab-SemiBold.ttf',
      700: 'ZillaSlab-Bold.ttf',
    },
  },
  lato: {
    dir: 'ofl/lato',
    static: {
      400: 'Lato-Regular.ttf',
      500: 'Lato-Medium.ttf',
      600: 'Lato-SemiBold.ttf',
      700: 'Lato-Bold.ttf',
    },
  },
  /* Released as Regular only. Asking for a bold Instrument Serif would mean
     printing its Regular under the word "Bold", so the build simply produces
     one weight and `brandFonts.js` declines the rest by name. */
  'instrument-serif': { dir: 'ofl/instrumentserif', static: { 400: 'InstrumentSerif-Regular.ttf' } },
  /* Whatever the reader's OS supplies. There is no file to embed and no way to
     know what the client would see, so the book says so instead. */
  'system-ui': { notEmbeddable: 'a system font, not a file this book can carry' },
}

/* Guard the two directions of drift: a family in the catalog with no source
   here, and a source here for a family the catalog dropped. */
const catalogIds = FONT_FAMILIES.map((f) => f.id)
const missing = catalogIds.filter((id) => !SOURCES[id])
const orphaned = Object.keys(SOURCES).filter((id) => !catalogIds.includes(id))
if (missing.length || orphaned.length) {
  if (missing.length) console.error(`No font source for catalog families: ${missing.join(', ')}`)
  if (orphaned.length) console.error(`Font source for unknown families: ${orphaned.join(', ')}`)
  process.exit(1)
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-fonts-'))

/* Instancing needs EVERY axis pinned, not just wght: a partial instance keeps
   its fvar and renders at the default weight wherever it lands, which is the
   silent wrong-face failure this whole change exists to remove. Reading the
   axis defaults out of the file is what makes that automatic rather than a
   per-family table someone has to remember to update. Prints SKIP when the
   requested weight is outside the family's range, so the caller records the
   gap instead of clamping to a weight nobody asked for. */
const SUBSET_PY = path.join(work, 'subset_face.py')
fs.writeFileSync(
  SUBSET_PY,
  `import sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src, wght, out, first, last, specimen_name = sys.argv[1], float(sys.argv[2]), sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
f = TTFont(src)
if 'fvar' in f:
    axes = {a.axisTag: a for a in f['fvar'].axes}
    if 'wght' not in axes:
        if wght != 400:
            print('SKIP no wght axis'); sys.exit(0)
    else:
        ax = axes['wght']
        if wght < ax.minValue or wght > ax.maxValue:
            print('SKIP wght %g outside %g-%g' % (wght, ax.minValue, ax.maxValue)); sys.exit(0)
    loc = {t: (wght if t == 'wght' else a.defaultValue) for t, a in axes.items()}
    f = instancer.instantiateVariableFont(f, loc, inplace=True, updateFontNames=False)
opts = subset.Options()
opts.layout_features = []
opts.hinting = False
opts.desubroutinize = True
opts.drop_tables += ['GSUB', 'GPOS', 'GDEF', 'DSIG', 'MVAR', 'STAT', 'FFTM']
opts.notdef_outline = False
opts.name_IDs = ['*']
opts.name_legacy = False
opts.glyph_names = False
s = subset.Subsetter(options=opts)
s.populate(unicodes=list(range(first, last + 1)))
s.subset(f)

# Rename the primary font name, keep the authorship.
#
# Five of these families carry a Reserved Font Name (Plex, Source, Lato,
# Libre Baskerville, Playfair Display). SIL's guidance on subsetting is that a
# subset cannot preserve "Functional Equivalence" -- it fails the very first
# criterion, "supports the same full character inventory" -- and so counts as a
# Modified Version, which OFL clause 3 forbids from carrying the RFN.
#
# The OFL FAQ Q1.12 arguably makes this moot for the copy that lives inside the
# PDF ("the restrictions regarding font modification and redistribution do not
# apply" to embedding). But these subsets are also checked into a git repo and
# shipped in a JS bundle, and that copy is harder to argue. Renaming costs
# nothing -- the book prints the real family name as page text, and jsPDF
# addresses the face by its own identifier -- so the question is removed rather
# than argued.
#
# nameIDs 0, 7, 13 and 14 are deliberately left alone: copyright, trademark,
# licence and licence URL. OFL FAQ Q1.14 asks that an embedded face keep its
# authorship and licensing, so the real provenance still travels inside the
# file even though the family name no longer claims to BE the original.
name = f['name']
for nid in (1, 3, 4, 6, 16, 21):
    name.setName(specimen_name if nid != 6 else specimen_name.replace(' ', ''), nid, 3, 1, 0x409)
    name.removeNames(nid, 1, 0, 0)
name.setName('Regular', 2, 3, 1, 0x409)
name.removeNames(2, 1, 0, 0)

f.save(out)
print('OK')
`
)

/**
 * The renamed subset's own family name.
 *
 * Opaque on purpose. Any readable derivation would have to contain a word from
 * the original — "Plex Mono Subset" still carries the Reserved Font Name
 * "Plex" — so the name is a digest of the family id and weight instead:
 * unique per face, stable across rebuilds, and provably free of anyone's
 * reserved words. What it IS stays legible in the copyright string the subset
 * keeps, and in the family name the book prints beside the specimen.
 */
const specimenName = (id, weight) =>
  `CC Book Specimen ${createHash('sha256').update(`${id}:${weight}`).digest('hex').slice(0, 8)}`

async function download(url, dest) {
  if (fs.existsSync(dest)) return
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

const b64Lines = (b64) => {
  const lines = b64.match(/.{1,100}/g) || ['']
  return lines.map((l, i) => `  '${l}'${i === lines.length - 1 ? '' : ' +'}`).join('\n')
}

const built = {}
let total = 0

for (const family of FONT_FAMILIES) {
  const spec = SOURCES[family.id]
  if (spec.notEmbeddable) {
    console.log(`${family.name.padEnd(22)} — skipped (${spec.notEmbeddable})`)
    continue
  }
  /* The book prints "embedded under the SIL Open Font License 1.1" beside
     every specimen. google/fonts also carries `apache/` and `ufl/` families,
     and an Apache face embedded under an OFL notice would make that line
     false — in the one document that has to be trusted about type. */
  if (!spec.dir.startsWith('ofl/')) {
    throw new Error(
      `${family.name} is not under ofl/ — the book's licence line would be wrong for it`
    )
  }
  const chunks = []
  const weights = []
  for (const weight of EMBEDDABLE_WEIGHTS) {
    const file = spec.variable || spec.static[weight]
    if (!file) continue
    const src = path.join(work, `${family.id}-${spec.variable ? 'var' : weight}.ttf`)
    await download(`${GF}/${spec.dir}/${encodeURIComponent(file)}`, src)
    const out = path.join(work, `${family.id}-${weight}.ttf`)
    const result = execFileSync(
      PYTHON,
      [SUBSET_PY, src, String(weight), out, String(FIRST_CP), String(LAST_CP), specimenName(family.id, weight)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
    ).trim()
    if (result.startsWith('SKIP')) {
      console.log(`${family.name.padEnd(22)} ${weight}  skipped — ${result.slice(5)}`)
      continue
    }
    const b64 = fs.readFileSync(out).toString('base64')
    chunks.push(`/* ${family.name} ${weight} */\nexport const w${weight} =\n${b64Lines(b64)}\n`)
    weights.push(weight)
    total += b64.length
  }
  if (!weights.length) throw new Error(`No weights built for ${family.name}`)
  built[family.id] = weights
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(OUT_DIR, `${family.id}.js`),
    `/**\n * ${family.name} — printable-ASCII subsets, one per weight, base64 TrueType.\n *\n * Used under the SIL Open Font License 1.1; see brandFonts.LICENSE.txt.\n * Instanced, subset, and stripped of hinting and layout tables — these render\n * a specimen, they are not a usable copy of ${family.name}.\n *\n * Generated by scripts/build-brand-fonts.mjs; do not hand-edit.\n */\n\n${chunks.join('\n')}`
  )
  console.log(`${family.name.padEnd(22)} ${weights.join(', ')}`)
}

const entries = Object.entries(built)
fs.writeFileSync(
  path.join(OUT_DIR, 'index.js'),
  `/**
 * Which brand faces this build actually holds, and how to load one.
 *
 * WEIGHTS is deliberately separate from LOADERS: the book has to decide
 * whether it can honestly show a face BEFORE paying to import ~15 KB of
 * base64, and a promise it then fails to keep would put the wrong letterforms
 * on the page. One static object answers "do we have this?"; the loaders are
 * per-family dynamic imports so a book that sets two faces downloads two
 * faces, not twenty.
 *
 * Generated by scripts/build-brand-fonts.mjs; do not hand-edit.
 */

/** Family id -> the weights held, ascending. */
export const BRAND_FONT_WEIGHTS = Object.freeze({
${entries.map(([id, ws]) => `  ${JSON.stringify(id)}: Object.freeze([${ws.join(', ')}]),`).join('\n')}
})

/** Family id -> () => Promise<{ w400?, w500?, w600?, w700? }>. */
export const BRAND_FONT_LOADERS = Object.freeze({
${entries.map(([id]) => `  ${JSON.stringify(id)}: () => import('./${id}.js'),`).join('\n')}
})
`
)

fs.rmSync(work, { recursive: true, force: true })
console.log(
  `\nwrote ${entries.length} families to src/lib/book/brandFontData/ ` +
    `(${(total / 1024).toFixed(0)} KB base64 across ${entries.reduce((n, [, w]) => n + w.length, 0)} faces)`
)
