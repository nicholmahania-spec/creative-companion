/**
 * Loads a type pair's actual Google Fonts stylesheet into the document, so
 * the artboard preview shows the real face instead of naming a font nobody
 * ever fetched. Without this, `fontFamilyFromLabel()` produces a CSS
 * `font-family` string that always falls back to the UI font — Typography
 * was a label, not a rendered typeface.
 */

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
  document.head.appendChild(link)
}
