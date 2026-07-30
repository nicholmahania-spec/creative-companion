/**
 * Brand book page setup — the one place the three controls are declared.
 *
 * The UI renders its options from these lists and the PDF generator resolves
 * its geometry from the same ones, so a control can never offer a choice the
 * book doesn't honour. Restating either list somewhere else is the defect this
 * module exists to prevent.
 *
 * Named by outcome rather than by print-production term: the user answers a
 * question about their own situation ("is this going to a print shop?") rather
 * than recalling what a 0.125in bleed is. Every option here visibly changes the
 * page — a control whose effect you can't see is one you can't learn.
 *
 * Units are PostScript points (72 per inch), which is what jsPDF is given.
 */

/** 0.125in — the standard bleed allowance, in points. */
export const BLEED_PT = 9

export const BOOK_PAGE_SIZES = [
  { id: 'letter', label: 'Letter', w: 612, h: 792 },
  { id: 'a4', label: 'A4', w: 595.28, h: 841.89 },
]

/**
 * Three named stops rather than a number field. A numeric margin invites
 * tuning with no end state — the kind of open loop that eats an afternoon
 * instead of sending the book.
 *
 * `standard` is 48pt because that is what the book is designed at: the layout
 * specifies 64px of page padding at 96dpi, which is 48pt. It was 40pt while
 * the book was drawn to no particular spec, and leaving it there would have
 * meant the default export never matched its own design — every proportion on
 * the page measured against an edge 8pt closer than the one it was drawn for.
 * The other two stops move with it so all three stay visibly distinct.
 */
export const BOOK_EDGE_SPACE = [
  { id: 'roomy', label: 'Roomy', margin: 60 },
  { id: 'standard', label: 'Standard', margin: 48 },
  { id: 'tight', label: 'Tight', margin: 36 },
]

export const DEFAULT_BOOK_SETUP = {
  pageSize: 'letter',
  edgeSpace: 'standard',
  printShop: false,
}

const sizeFor = (id) =>
  BOOK_PAGE_SIZES.find((s) => s.id === id) || BOOK_PAGE_SIZES[0]

const edgeFor = (id) =>
  BOOK_EDGE_SPACE.find((e) => e.id === id) ||
  BOOK_EDGE_SPACE.find((e) => e.id === DEFAULT_BOOK_SETUP.edgeSpace)

/**
 * Turn a stored setup into the geometry the generator needs.
 *
 * With bleed the sheet grows by the allowance on all four sides, and content
 * keeps its full edge space measured from the *trim* line rather than from the
 * enlarged sheet — otherwise switching bleed on would quietly reflow the whole
 * book inward, which is not what the control claims to do.
 *
 * @param {{pageSize?: string, edgeSpace?: string, printShop?: boolean}} [setup]
 */
export function resolveBookSetup(setup = {}) {
  const size = sizeFor(setup.pageSize)
  const edge = edgeFor(setup.edgeSpace)
  const bleed = setup.printShop ? BLEED_PT : 0
  return {
    size,
    edge,
    bleed,
    cropMarks: bleed > 0,
    pageW: size.w + bleed * 2,
    pageH: size.h + bleed * 2,
    margin: edge.margin + bleed,
  }
}

/**
 * The setup as a sentence, for showing beside the download button.
 *
 * Visible state is not remembered state: these preferences are sticky across
 * projects, so months later the answer to "what will this produce?" has to be
 * readable on screen rather than recalled from a control's position.
 */
export function bookSetupSummary(setup = {}) {
  const { size, edge, cropMarks } = resolveBookSetup(setup)
  const parts = [size.label, `${edge.label.toLowerCase()} edges`]
  if (cropMarks) parts.push('bleed + crop marks')
  return parts.join(' · ')
}
