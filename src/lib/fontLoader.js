/**
 * Loads a type pair's actual Google Fonts stylesheet into the document, so
 * the artboard preview shows the real face instead of naming a font nobody
 * ever fetched. Without this, `fontFamilyFromLabel()` produces a CSS
 * `font-family` string that always falls back to the UI font — Typography
 * was a label, not a rendered typeface.
 */

import { googleCssForLabels } from './fontCatalog'

const LINK_ID = 'type-pair-google-font'

/** Inject (or replace) the single active type-pair font stylesheet. */
export function loadTypePairFont(googleCss) {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(LINK_ID)
  if (!googleCss) {
    existing?.remove()
    return
  }
  if (existing) {
    if (existing.getAttribute('href') === googleCss) return
    existing.setAttribute('href', googleCss)
    return
  }
  const link = document.createElement('link')
  link.id = LINK_ID
  link.rel = 'stylesheet'
  link.href = googleCss
  /* A blocked or offline fonts request otherwise fails in total silence: the
     preview falls back to the UI font and looks like a chosen typeface that
     simply resembles the UI. Logged, not surfaced — the specimen still reads,
     and an alert about a webfont would be noise. */
  link.onerror = () => {
    console.debug('[fonts] could not load type-pair stylesheet:', googleCss)
  }
  document.head.appendChild(link)
}

const BRAND_LINK_ID = 'brand-family-fonts'

/**
 * Load whatever families a set of type labels names.
 *
 * `loadTypePairFont` above only understands the curated *pairs*, so a heading
 * and a body chosen independently — or any family outside that list — was
 * named on screen and never fetched, rendering in the UI fallback while
 * claiming to be something else. This takes the labels themselves and fetches
 * their families.
 *
 * Uses its own link id so the pair loader is untouched and the two can coexist.
 *
 * @param {string[]} labels e.g. ['Fraunces SemiBold', 'IBM Plex Mono Regular']
 */
export function loadBrandFamilies(labels) {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(BRAND_LINK_ID)
  const href = googleCssForLabels(labels)
  if (!href) {
    existing?.remove()
    return
  }
  if (existing) {
    if (existing.getAttribute('href') !== href) {
      existing.setAttribute('href', href)
    }
    return
  }
  const link = document.createElement('link')
  link.id = BRAND_LINK_ID
  link.rel = 'stylesheet'
  link.href = href
  // Same reasoning as above: log, don't surface. The specimen still reads.
  link.onerror = () => {
    console.debug('[fonts] could not load brand families:', href)
  }
  document.head.appendChild(link)
}
