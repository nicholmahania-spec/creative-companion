/**
 * The brand book's typefaces, registered into a jsPDF document.
 *
 * Archivo carries every piece of structure — kickers, headings, the cover
 * display, the page numbers — and Lora carries every piece of prose. That
 * split is the book's whole typographic argument: one voice for the frame,
 * one voice for the words, and nothing in between to decide about.
 *
 * Six faces, each registered under its own family name rather than as weights
 * of two families. jsPDF resolves `setFont(family, style, weight)` through a
 * lookup table that silently falls back to the nearest registered face when a
 * weight is missing, so a typo in a weight number prints in the wrong face
 * with no error — exactly the kind of failure this repo keeps finding after
 * the fact. Distinct names make a wrong face a thrown error instead.
 *
 * The data is loaded through a dynamic import so the ~173 KB of base64 lands
 * in the PDF generator's own chunk. Nothing downloads it until someone builds
 * a book.
 */

/** Semantic faces. Use these, never a raw family string. */
export const FACE = {
  /** Kickers, footers, cover nav — Archivo Bold. */
  label: ['ArchivoBold', 'normal'],
  /** Page headings, lockups, application specimens — Archivo ExtraBold. */
  heading: ['ArchivoExtraBold', 'normal'],
  /** Cover and divider display, section numerals — Archivo Black. */
  display: ['ArchivoBlack', 'normal'],
  /** Body copy — Lora Regular. */
  body: ['LoraRegular', 'normal'],
  /** Emphasis inside body copy — Lora SemiBold. */
  bodyStrong: ['LoraSemiBold', 'normal'],
  /** Taglines and the "if we were a person" line — Lora Italic. */
  bodyItalic: ['LoraItalic', 'italic'],
}

const REGISTRY = [
  ['archivoBold', 'ArchivoBold', 'normal'],
  ['archivoExtraBold', 'ArchivoExtraBold', 'normal'],
  ['archivoBlack', 'ArchivoBlack', 'normal'],
  ['loraRegular', 'LoraRegular', 'normal'],
  ['loraSemiBold', 'LoraSemiBold', 'normal'],
  ['loraItalic', 'LoraItalic', 'italic'],
]

/**
 * Embed the six faces in `pdf`.
 *
 * Returns true when the book can be set in its own typography and false when
 * the font data could not be loaded — the caller keeps drawing either way,
 * falling back to Helvetica/Times. A brand book that refuses to export
 * because a chunk failed to fetch is worse than one that exports in the wrong
 * face and says so.
 */
export async function registerBookFonts(pdf) {
  let data
  try {
    data = await import('./bookFontData')
  } catch {
    return false
  }
  try {
    REGISTRY.forEach(([key, family, style]) => {
      const file = `${family}.ttf`
      pdf.addFileToVFS(file, data[key])
      pdf.addFont(file, family, style)
    })
    return true
  } catch {
    return false
  }
}

/**
 * The faces to use when embedding failed.
 *
 * Helvetica for structure and Times for prose keeps the sans/serif contrast
 * the layout is built on, so a fallback book still reads as designed rather
 * than as broken.
 */
export const FALLBACK_FACE = {
  label: ['helvetica', 'bold'],
  heading: ['helvetica', 'bold'],
  display: ['helvetica', 'bold'],
  body: ['times', 'normal'],
  bodyStrong: ['times', 'bold'],
  bodyItalic: ['times', 'italic'],
}
