/**
 * The CLIENT's typefaces, embedded into the brand book so the page can show
 * their real letterforms.
 *
 * THE ASSUMPTION THIS REPLACES
 *
 * The Typography page used to set every specimen in the book's own Archivo and
 * Lora, on the stated reasoning that "the book cannot embed a typeface it was
 * never given". It was never given a font FILE. It was given a NAME, and a
 * name is not nothing: `fontCatalog.js` is a closed registry of twenty
 * families, every one of them published under the SIL Open Font License in
 * google/fonts, and `scripts/build-brand-fonts.mjs` turns each of those into
 * an embeddable subset at build time. So for a face the registry knows, the
 * book HAS been given the typeface — through its name — and can print the
 * client's own alphabet rather than a description of it.
 *
 * WHAT STAYS TRUE
 *
 * `typeHeading` and `typeBody` are free-text fields. A designer can type
 * "Gotham Bold", and for that face the original reasoning holds completely:
 * there is no file, there may be no licence to embed one, and drawing sixty
 * glyphs of Archivo under the word "Gotham" would be a lie in the one document
 * that has to be trusted about type. So this module's job is not to render a
 * specimen — it is to decide, strictly, whether a specimen can be rendered
 * HONESTLY, and to hand back a plain-language reason when it cannot so the
 * page can say so instead of quietly substituting.
 *
 * Every path out of `resolveBrandFace` is either an exact family-and-weight
 * match or a refusal. There is no nearest-match, no clamping, and no default
 * weight for a suffix we do not hold — because each of those is a way to put
 * the wrong letterforms under the right name, which is the single failure this
 * whole mechanism exists to prevent.
 *
 * LICENSING
 *
 * Embedding a subset in a PDF is not redistributing a font file. The OFL
 * grants "embed" outright and its FAQ answers this exact case (Q1.12: "Yes,
 * either in full or a subset"; Q1.13: embedding does not change the document's
 * licence). The refusal in `src/lib/deliver/packagePlan.js` — no font files in
 * the client package — is a different act and stands untouched: nothing here
 * is ever written to the handoff. See `brandFonts.LICENSE.txt`.
 */

import { familyByName, WEIGHT_LABELS } from './fontCatalog'

/**
 * The weights a label can name and the build can produce.
 *
 * Derived from `WEIGHT_LABELS` rather than written out, because those are the
 * four the Builder's selects emit — so they are exactly the four a label can
 * ask for. `scripts/build-brand-fonts.mjs` derives the same list from the same
 * place, which is why the build and the runtime cannot disagree about which
 * weights exist.
 */
export const EMBEDDABLE_WEIGHTS = Object.freeze(
  Object.keys(WEIGHT_LABELS)
    .map(Number)
    .sort((a, b) => a - b)
)

/** 'semibold' -> 600, for every suffix we can actually honour. */
const SUFFIX_TO_WEIGHT = new Map(
  Object.entries(WEIGHT_LABELS).map(([w, label]) => [label.toLowerCase(), Number(w)])
)

/** Weight names a font can carry that this pipeline does not build. */
const UNBUILT_SUFFIXES = new Set([
  'thin',
  'extralight',
  'ultralight',
  'light',
  'extrabold',
  'ultrabold',
  'black',
  'heavy',
  'italic',
  'oblique',
])

/**
 * Split a label into an exact family and an exact weight, or refuse.
 *
 * Deliberately stricter than `parseLabel` in the catalog, which falls back to
 * 400 for any suffix it does not recognise. That fallback is right for a CSS
 * `font-family` string — the browser picks something close and the designer
 * sees it. It is wrong here: it turns "Fraunces Black" into Fraunces Regular,
 * and would print Regular letterforms on a page headed "Fraunces Black".
 */
function splitLabel(label) {
  const raw = String(label ?? '').trim().replace(/\s+/g, ' ')
  if (!raw) return { ok: false, reason: 'no typeface named' }
  const parts = raw.split(' ')
  if (parts.length > 1) {
    const suffix = parts[parts.length - 1].toLowerCase()
    const weight = SUFFIX_TO_WEIGHT.get(suffix)
    if (weight) return { ok: true, family: parts.slice(0, -1).join(' '), weight }
    if (UNBUILT_SUFFIXES.has(suffix)) {
      return { ok: false, reason: `no specimen is built for the ${parts[parts.length - 1]} weight` }
    }
  }
  /* No weight named at all. Regular is the only reading of a bare family name
     that cannot be wrong about a weight nobody asked for. */
  return { ok: true, family: raw, weight: 400 }
}

/** A jsPDF family name that cannot collide with the book's own six faces. */
const pdfFamilyFor = (id, weight) => `Brand${String(id).replace(/[^a-z0-9]/gi, '')}${weight}`

/**
 * Can the book show this label's real letterforms, and if not, why not?
 *
 * Pure and synchronous — it reads a static manifest and never loads font data,
 * so a page can ask before paying for the import. That order matters: deciding
 * after the download would mean the failure path is a promise already broken.
 *
 * @param {string} label e.g. 'Fraunces SemiBold'
 * @param {object} [weightsByFamily] injectable manifest, for tests
 * @returns {{ok: true, id, familyName, weight, weightLabel, pdfFamily, label}
 *          |{ok: false, reason: string, familyName: string}}
 */
export function resolveBrandFace(label, weightsByFamily) {
  const manifest = weightsByFamily || WEIGHTS
  const split = splitLabel(label)
  const named = String(label ?? '').trim()
  if (!split.ok) return { ok: false, reason: split.reason, familyName: named }

  const entry = familyByName(split.family)
  if (!entry) {
    return {
      ok: false,
      familyName: named,
      reason: 'this typeface is not one the book can carry a licence to embed',
    }
  }
  const held = manifest[entry.id]
  if (!held) {
    /* Two very different situations, and giving them one message was itself a
       small version of the lie this module exists to stop. A populated
       manifest that omits a family means there is genuinely no file for it —
       today that is only System UI, whatever the reader's OS supplies. An
       EMPTY manifest means the generated data is not in this build at all, and
       saying "Plus Jakarta Sans is a system font" would be simply false. */
    const anyHeld = Object.keys(manifest).length > 0
    return {
      ok: false,
      familyName: entry.name,
      reason: anyHeld
        ? `${entry.name} is a system font, not a file this book can carry`
        : 'this build of the book carries no typeface specimens',
    }
  }
  if (!held.includes(split.weight)) {
    return {
      ok: false,
      familyName: entry.name,
      reason: `${entry.name} is not published at ${WEIGHT_LABELS[split.weight] || split.weight}`,
    }
  }
  return {
    ok: true,
    id: entry.id,
    familyName: entry.name,
    weight: split.weight,
    weightLabel: WEIGHT_LABELS[split.weight],
    pdfFamily: pdfFamilyFor(entry.id, split.weight),
    label: named,
  }
}

/* The generated manifest, read once. Missing data is not an error: the whole
   directory is generated, and a checkout without it must still export a book —
   every face simply resolves to "not available" and the page says so. */
let WEIGHTS = {}
let LOADERS = {}
let manifestLoaded = false

async function loadManifest() {
  if (manifestLoaded) return
  manifestLoaded = true
  try {
    const mod = await import('./brandFontData/index.js')
    WEIGHTS = mod.BRAND_FONT_WEIGHTS || {}
    LOADERS = mod.BRAND_FONT_LOADERS || {}
  } catch {
    WEIGHTS = {}
    LOADERS = {}
  }
}

/**
 * Embed a label's face in `pdf` and report what the page may claim.
 *
 * Registers each face at most once per document, so a book whose heading and
 * body are the same family and weight carries one copy rather than two.
 *
 * Never throws and never substitutes: every failure comes back as
 * `{ ok: false, reason }` for the page to print, because a book that refuses
 * to export over a font is worse than one that explains itself.
 *
 * @returns {Promise<ReturnType<typeof resolveBrandFace>>}
 */
export async function embedBrandFace(pdf, label) {
  await loadManifest()
  const face = resolveBrandFace(label, WEIGHTS)
  if (!face.ok) return face

  const registered = (pdf.__brandFaces ||= new Set())
  if (registered.has(face.pdfFamily)) return face
  try {
    const data = await LOADERS[face.id]()
    const b64 = data[`w${face.weight}`]
    if (!b64) {
      return {
        ok: false,
        familyName: face.familyName,
        reason: `${face.familyName} ${face.weightLabel} could not be loaded`,
      }
    }
    pdf.addFileToVFS(`${face.pdfFamily}.ttf`, b64)
    pdf.addFont(`${face.pdfFamily}.ttf`, face.pdfFamily, 'normal')
    registered.add(face.pdfFamily)
    return face
  } catch {
    return {
      ok: false,
      familyName: face.familyName,
      reason: `${face.familyName} ${face.weightLabel} could not be loaded`,
    }
  }
}

/**
 * The character set a specimen page shows, in reading order.
 *
 * Rows rather than one string because the page sets each on its own line, and
 * the split is a property of the alphabet rather than of the layout — the
 * uppercase/lowercase/numeral/punctuation grouping is what every published
 * type specimen uses and what a client scans for.
 *
 * Held to printable ASCII, which is exactly what the build subsets to. A row
 * here that the subset does not cover would print as a blank, so these two
 * facts must not drift: `characterSetRows()` is the reason the build's
 * FIRST_CP/LAST_CP are what they are.
 */
export function characterSetRows() {
  const range = (a, b) =>
    Array.from({ length: b - a + 1 }, (_, i) => String.fromCharCode(a + i)).join('')
  return [
    range(65, 90), // A-Z
    range(97, 122), // a-z
    range(48, 57), // 0-9
    '!?&@#$%*()[]{}/\\|+=<>',
    '.,;:\'"`~^_-',
  ]
}
