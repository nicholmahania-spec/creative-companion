/**
 * Highlight-to-explain glossary — plain-language rewrites for design/brand
 * jargon that shows up across the app's own copy and exports.
 *
 * Deliberately a fixed, curated list rather than a live/LLM lookup: an
 * unmatched selection does nothing at all (no popover, no "no explanation
 * available" message) so the feature can never read as a failure — it's
 * either a small win or invisible, never a dead end.
 */
const GLOSSARY = {
  'wordmark': 'A logo made only of the brand name, styled as text — no separate icon or symbol.',
  'lockup': 'The fixed arrangement of a logo mark and wordmark together, kept consistent everywhere it appears.',
  'clearspace': 'The empty margin that must stay open around a logo so nothing crowds it.',
  'kerning': 'The spacing adjusted between two specific letters so text looks evenly balanced.',
  'tracking': 'The spacing added evenly across a whole word or line of letters.',
  'leading': 'The vertical space between lines of text (named after the strips of lead once used to space metal type).',
  'typography': 'The look and arrangement of text — which fonts, sizes, and spacing are used.',
  'wordmark lockup': 'The fixed arrangement of a logo mark and wordmark together.',
  'palette': 'The set of colors chosen to represent a brand consistently.',
  'swatch': 'A small sample block showing one color from the palette.',
  'color roles': 'Which palette color is used for what job — e.g. one for backgrounds, one for accents.',
  'cmyk': 'The four ink colors (cyan, magenta, yellow, black) used for print — different from the RGB colors used on screens.',
  'rgb': 'The red/green/blue color values used to display color on screens.',
  'hex': 'A six-character code (like #1C1917) that represents one exact color.',
  'pantone': 'A standardized color-matching system so a color prints the same way everywhere.',
  'bleed': 'Extra artwork printed slightly past the edge of a page so trimming doesn’t leave a white sliver.',
  'moodboard': 'A collection of reference images and colors used to define a visual direction before designing.',
  'mockup': 'A realistic preview showing how a design would look in real use (like on a business card or website).',
  'brief': 'A short written summary of the project’s goal, audience, and requirements.',
  'deliverable': 'A finished file or asset that gets handed to the client.',
  'stationery': 'The set of everyday branded documents — letterhead, business cards, envelopes, email signatures.',
  'letterhead': 'Branded paper template used for official documents and letters.',
  'sans-serif': 'A font style without small decorative strokes at the ends of letters — plainer, more modern-looking.',
  'serif': 'A font style with small decorative strokes at the ends of letters — often looks more traditional.',
  'favicon': 'The tiny icon shown in a browser tab for a website.',
  'gradient': 'A smooth blend from one color into another.',
  'accent color': 'A secondary color used sparingly to draw attention (buttons, highlights).',
  'brand voice': 'The consistent tone and personality used in how a brand writes and speaks.',
  'tagline': 'A short, memorable phrase that sums up a brand.',
  'asset audit': 'A review of existing brand files to tag what’s still usable, outdated, or missing.',
  'raster': 'An image made of a fixed grid of pixels — loses quality when scaled up (e.g. JPG, PNG).',
  'vector': 'An image made of math-defined shapes — can scale to any size with no quality loss (e.g. SVG, PDF logos).',
}

/**
 * Looks up a plain-language explanation for a highlighted term.
 * Only matches known terms (case-insensitive, trimmed) — everything else
 * returns null so an unmatched selection is silently ignored.
 * @param {string} text
 * @returns {string|null}
 */
export function lookupGlossaryTerm(text) {
  const key = String(text || '').trim().toLowerCase()
  if (!key || key.length > 40) return null
  return GLOSSARY[key] || null
}
