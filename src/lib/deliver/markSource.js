/**
 * One answer to "is there a mark, and can this writer put it in a file?"
 *
 * WHY THIS EXISTS
 *
 * A real client package shipped an `02_LOGO/` folder holding a usage sheet and
 * no logo, from a project that had the artwork. The brand book PDF inside the
 * same zip, built from the same pack in the same call, embedded the mark
 * correctly — its pixels decode byte-for-byte identical to the project's
 * artwork. So the mark was there; the packager could not see it.
 *
 * The cause was not one bug. Five surfaces each answered "does this project
 * have a mark?" with their own private regex, and they did not agree:
 *
 *   brandBookPdf        any renderable src — a data URL, an http(s) URL, a
 *                       blob: URL — rasterised through a canvas when needed
 *   packagePlan         `extFromBytes || extFromDataUrl`
 *   packageFiles        /^data:[^;]+;base64,(.+)$/
 *   brand-kit zip       startsWith('data:image') + its own regex
 *   markPackFiles       /^data:(image\/…);base64,(.+)$/
 *
 * The permissive one rendered the mark. The strict ones did not — and they
 * expressed the disagreement as SILENCE, or worse, as a confident statement
 * about the designer: the README told the client "there is no stored mark on
 * the project yet" and the package panel told the designer "No mark uploaded
 * yet — add it on Identity", while the mark sat on screen in the next tab.
 *
 * The store really does put non-data URLs in `project.logoImage`: after a
 * cloud push, `applyImageUrlReplacements` swaps the data URL for a Supabase
 * Storage URL so the synced row stays small (see store/useAppStore.js and
 * lib/cloudSync.js). That is deliberate and correct. What was not correct was
 * four file writers quietly treating "I don't recognise this string" as "the
 * designer never made one".
 *
 * So this is the single decision every writer now asks. It has three answers,
 * and the third is the one that was missing:
 *
 *   none     nothing is stored — saying so is honest
 *   ready    here are the bytes and the extension to write
 *   fetch    the artwork lives at a URL. The PLAN says so synchronously and
 *            the writer goes and gets it, the same shape the brand book
 *            already uses (`{ pdf: true }`, filled in by the writer). Panel
 *            and zip stay in agreement because both read this one decision.
 *   held     THERE IS ARTWORK AND THIS WRITER CANNOT USE IT — say that,
 *            name it, and never claim the project has no mark
 *
 * Pure and browser-free at import time, because packagePlan/packageFiles run
 * in the CLI through Vite with no DOM (`node bin/cc.mjs export …`).
 */

import { extFromBytes, extFromDataUrl } from './naming'

/**
 * Why a stored mark could not be written, said so it reads sensibly both to
 * the designer in the package panel and to the client in the README.
 */
/* Lower case and single-clause on purpose: every call site puts this after its
   own dash ("Not in the package — …", "Mark not written — …"), and a reason
   carrying its own dash reads as two sentences fighting. `markGapSentence`
   capitalises it for the places that need it standing alone. */
const HELD_REASON = {
  link: 'the app is holding a link to this artwork rather than the file itself',
  colour: 'the mark is recorded as a colour, not as artwork',
  unreadable: 'the stored artwork could not be read as an image file',
}

/**
 * What the package can do with `project.logoImage`.
 *
 * @param {unknown} raw  a project's stored mark
 * @returns {{ state: 'none'|'ready'|'fetch'|'held', ext: string, base64: string, reason: string, url?: string }}
 *   `ext`/`base64` are only meaningful when state is 'ready'. Writers must use
 *   the returned `base64` rather than re-splitting the raw string — that is
 *   what makes the surrounding whitespace case work end to end instead of
 *   being repaired in the planner and lost again in the writer.
 */
export function markSource(raw) {
  /* Trimmed deliberately. `rasterizeToPngDataUrl` trims before loading, so a
     data URL with a stray newline renders in the book and used to vanish from
     the package — the same disagreement in miniature. */
  const src = String(raw ?? '').trim()
  if (!src) return { state: 'none', ext: '', base64: '', reason: '' }

  const held = (kind) => ({
    state: 'held',
    ext: '',
    base64: '',
    reason: HELD_REASON[kind] || HELD_REASON.unreadable,
  })

  const m = src.match(/^data:[^,]*;base64,([\s\S]+)$/i)
  if (m) {
    /* Base64 may legally carry whitespace (a data URL that survived a round
       trip through a text field or a wrapped JSON blob). JSZip and atob both
       want it clean. */
    const base64 = m[1].replace(/\s+/g, '')
    const ext = base64 && (extFromBytes(src) || extFromDataUrl(src))
    if (ext) return { state: 'ready', ext, base64, reason: '' }
    return held('unreadable')
  }

  /* An http(s) mark is not a dead end — it is a download. Reporting it as
     held was honest but still lost the client their logo; the offload that
     put it there exists to keep the SYNCED row small, and re-inflating local
     storage to undo that would trade one cost for another. Fetching at export
     time costs nothing until someone exports.

     blob: and file: stay held. A blob URL dies with the page that made it and
     a file: URL is a path on someone else's disk — both would fail, and a
     fetch that always fails is worse than a sentence that explains. */
  if (/^https?:/i.test(src)) {
    return { state: 'fetch', ext: '', base64: '', reason: '', url: src }
  }
  if (/^(blob|file):/i.test(src)) return held('link')
  if (/^(#|rgb|hsl|linear-gradient|radial-gradient)/i.test(src)) return held('colour')
  return held('unreadable')
}

/** True when the project holds a mark at all, whatever form it is in. */
export function hasStoredMark(raw) {
  return markSource(raw).state !== 'none'
}

/** The held reason as a sentence, for the places that print it on its own. */
export function markGapSentence(reason) {
  const r = String(reason || '').trim()
  return r ? r[0].toUpperCase() + r.slice(1) : ''
}
