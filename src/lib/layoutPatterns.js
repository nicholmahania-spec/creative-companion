/**
 * Layout patterns — a reference, not a workflow step.
 *
 * From the layout-ideas and visual-hierarchy articles. Two things made this
 * worth keeping as data rather than absorbing as advice:
 *
 *  - The eight patterns are a **vocabulary**. "Split screen" or "Z-pattern" is
 *    a decision you can make in a second once you can name it, and a blank
 *    stare otherwise.
 *  - F and Z scanning explain *why* a pattern works, so the list is not just
 *    shapes to copy.
 *
 * Deliberately a lookup with no state, no progress and no prompting — the same
 * shape as the glossary. It is either useful when opened or invisible. A
 * reference that nags is a toll.
 */

/** How the eye moves before it reads anything. */
export const SCAN_PATTERNS = [
  {
    id: 'f',
    name: 'F-pattern',
    when: 'Text-heavy pages — articles, docs, long copy.',
    why: 'Eyes sweep the top line, drop, sweep shorter, then run down the left edge. Anything on the right of a lower line is rarely seen.',
    do: 'Front-load every heading. Put nothing you need read on the lower right.',
  },
  {
    id: 'z',
    name: 'Z-pattern',
    when: 'Sparse pages with one goal — landing pages, posters, ads.',
    why: 'With little to read, the eye crosses the top, cuts diagonally, then crosses the bottom.',
    do: 'Logo top-left, the ask top-right or bottom-right. The diagonal is where the image goes.',
  },
]

/**
 * The eight layouts. `structure` is deliberately plain enough to sketch from
 * without opening anything else.
 */
export const LAYOUT_PATTERNS = [
  {
    id: 'single-column',
    name: 'Single column',
    structure: 'One centred column, everything stacked.',
    when: 'Long reading, or anything that has to work on a phone first.',
    watch: 'Gets monotonous fast — vary the rhythm with image breaks.',
    scan: 'f',
  },
  {
    id: 'split-screen',
    name: 'Split screen',
    structure: 'Two equal halves, full height.',
    when: 'Two things of equal weight — two audiences, two products, image against copy.',
    watch: 'Equal halves say equal importance. If one matters more, this is the wrong pattern.',
    scan: 'z',
  },
  {
    id: 'asymmetric',
    name: 'Asymmetric split',
    structure: 'Roughly one third against two thirds.',
    when: 'One thing leads and one supports.',
    watch: 'The narrow side needs enough air or it reads as an accident.',
    scan: 'z',
  },
  {
    id: 'hero-stack',
    name: 'Hero and stack',
    structure: 'One full-width statement, then rows beneath it.',
    when: 'A single message has to land before anything else is read.',
    watch: 'If the hero says nothing specific, the whole page starts at nothing.',
    scan: 'z',
  },
  {
    id: 'grid',
    name: 'Modular grid',
    structure: 'Equal cells, consistent gutters.',
    when: 'Many items of the same kind — products, work, a gallery.',
    watch: 'Every cell equal means nothing is featured. Break one cell to feature.',
    scan: 'f',
  },
  {
    id: 'masonry',
    name: 'Masonry',
    structure: 'Fixed column widths, variable heights.',
    when: 'Images of mixed proportion that should not be cropped.',
    watch: 'Reading order goes vague — do not use it for anything sequential.',
    scan: 'f',
  },
  {
    id: 'magazine',
    name: 'Magazine',
    structure: 'Mixed column widths, deliberate white space, text wrapping images.',
    when: 'Editorial work where the layout itself carries tone.',
    watch: 'Needs a real grid underneath, or it just looks untidy.',
    scan: 'f',
  },
  {
    id: 'full-bleed',
    name: 'Full bleed',
    structure: 'One image edge to edge, type laid over it.',
    when: 'The image IS the message.',
    watch: 'Contrast — type over a photo fails at exactly the moment the photo changes.',
    scan: 'z',
  },
]

export function scanFor(id) {
  return SCAN_PATTERNS.find((s) => s.id === id) || null
}

/** Patterns that suit a given scan pattern. */
export function patternsForScan(scanId) {
  return LAYOUT_PATTERNS.filter((p) => p.scan === scanId)
}
