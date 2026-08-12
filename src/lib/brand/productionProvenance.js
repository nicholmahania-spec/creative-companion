/**
 * Who actually made the bytes.
 *
 * THE PROBLEM THIS EXISTS FOR
 *
 * Production used to be INFERRED: a packageAssets row counted as a produced
 * application if it carried the right deliverable, the right folder and the
 * right mime type. Every one of those three is something an UPLOAD can carry.
 * A designer who exports a card from Illustrator, drops it into Delivery and
 * answers the panel's "which item is this?" with Business cards ends up with a
 * row that satisfies all three — and Touchpoints then printed
 *
 *     "Application produced — real PDF in client package"
 *
 * about a file this app never made. The tray said "Real file" underneath it.
 * That is the app taking credit for the designer's own work and, worse,
 * reporting a production run that never happened. Attribution answers WHICH
 * BOUGHT ITEM a file is. It cannot answer WHERE THE FILE CAME FROM, and it was
 * being read as though it could.
 *
 * WHAT A STAMP IS AND IS NOT
 *
 * `producedBy` is written by exactly one kind of caller — an in-app produce
 * path, at the moment it hands over bytes it generated itself. Nothing else
 * writes it: not the upload picker, not the attribution dropdown, not mock
 * acceptance, not colour sampling. So its ABSENCE is meaningful, which is the
 * only reason its presence is worth anything.
 *
 * It is deliberately not a claim about quality, approval, or delivery. A
 * stamped row is a file this app made. Whether it belongs in the client's
 * folder is still Delivery's call, and an unstamped upload is still perfectly
 * good package material — this module does not hold anything back.
 *
 * NO BACK-FILL
 *
 * Rows written before this stamp existed do not get one. The app cannot tell,
 * after the fact, whether those bytes came from a produce run or a file
 * picker — that inability is the whole defect — and stamping them on a guess
 * would manufacture exactly the provenance this module was added to stop.
 * They stay real package material and stop reading as produced output; one
 * click on Produce re-establishes the truth honestly.
 */

/**
 * Every in-app produce path, by id.
 *
 * IDS ARE DATA. These are written into stored projects, so they are renamed
 * the way `colourPalette` is renamed: not at all. Labels are a UI concern.
 */
export const PRODUCERS = Object.freeze({
  businessCard: 'businessCardProduce',
  emailSignature: 'emailSignatureProduce',
})

/** Every id above, for validation. */
const PRODUCER_IDS = Object.freeze(Object.values(PRODUCERS))

/**
 * The fields a produce path adds to the packageAssets row it writes.
 *
 * `producedAt` tracks the RUN, not the filing. `addedAt` already records when
 * the row first appeared and is left alone on re-production, so a card
 * produced in March and re-produced in August would otherwise carry March as
 * its only date while holding August's bytes — a row quietly describing
 * output that is not the output it holds.
 *
 * @param {string} producerId one of PRODUCERS
 * @param {{ at?: string }} [opts]
 * @returns {{ producedBy: string, producedAt: string }}
 */
export function productionStamp(producerId, { at } = {}) {
  if (!PRODUCER_IDS.includes(producerId)) {
    throw new Error(`Unknown producer: ${producerId}`)
  }
  return {
    producedBy: producerId,
    producedAt: at || new Date().toISOString(),
  }
}

/**
 * Did this exact produce path write these bytes?
 *
 * @param {object|null|undefined} asset
 * @param {string} producerId
 * @returns {boolean}
 */
export function isProducedByApp(asset, producerId) {
  if (!asset || typeof asset !== 'object') return false
  if (!PRODUCER_IDS.includes(producerId)) return false
  return asset.producedBy === producerId
}

/**
 * Was this row written by ANY in-app produce path?
 *
 * Used where the question is "did the app make this file", independent of
 * which surface — the attribution control asks the designer which bought item
 * a file is, and a produced row already knows, so it must not be asked.
 *
 * @param {object|null|undefined} asset
 * @returns {boolean}
 */
export function isAppProduced(asset) {
  if (!asset || typeof asset !== 'object') return false
  return PRODUCER_IDS.includes(asset.producedBy)
}
