import { canDistribute } from '../deliver/packagePlan'
import { packTouchpoints } from '../journey/touchpoints'

/**
 * The produced artwork a brand book is allowed to show, and what to say when
 * it cannot show it.
 *
 * WHY THIS EXISTS. The Applications section — "Brand in Use", the page a brand
 * designer's portfolio is built from — drew four coloured rectangles per page
 * containing the wordmark set as TEXT, and printed its own disclaimer
 * underneath: "Mocks are direction proofs only - not production die-lines."
 * The designer's real business card, made in Illustrator and already filed on
 * the project, was sitting three fields away in `packageAssets` and the book
 * never looked at it. The product was fabricating an artefact rather than
 * receiving one, on the single page where a designer's craft becomes visible
 * to their client.
 *
 * THE ASSET MODEL IS NOT NEW, AND THAT IS THE POINT. `packageAssets` already
 * holds produced work inline as a data URL, already carries usage rights, and
 * already travels inside the pack — so a book page needs a REFERENCE, not a
 * second copy and not a second store. The reference lives on the surface it
 * belongs to, in the record that already describes that surface:
 *
 *   touchpointApps[touchpointId] = { note, done, asset: { kind: 'produced', id } }
 *
 * `asset` is additive. Every project written before today has none, reads as
 * `none`, and prints exactly what it printed yesterday.
 *
 * THREE OUTCOMES, MODELLED ON `markSource`. A surface either has real work
 * behind it, has nothing chosen, or has something chosen that cannot be shown.
 * There is deliberately no fourth state that falls back to a drawing: a page
 * that quietly substitutes invented work under a heading the designer chose is
 * the defect this module exists to close, and it would be a worse defect for
 * being harder to notice.
 *
 * RIGHTS ARE THE PACKAGE PLANNER'S DECISION, IMPORTED. `canDistribute` is not
 * reimplemented here. Delivery already refuses to ship a file whose rights are
 * `designerOwned`, `thirdParty`, `doNotDistribute` or unset, and says so in the
 * client's README. A book that printed one of those would hand the client, in
 * the most finished-looking document of the project, exactly the file the
 * package deliberately withheld — and two copies of one rule are two rules that
 * will eventually disagree.
 */

/** What a surface's artwork can be. `held` always carries a reason. */
export const APP_ASSET_STATES = Object.freeze({
  /** Nothing chosen. The ordinary state, and not a problem. */
  none: 'none',
  /** Real bytes, cleared to ship. */
  ready: 'ready',
  /** Something was chosen and cannot be shown. `reason` says why. */
  held: 'held',
})

const HELD = (reason) => ({ state: APP_ASSET_STATES.held, dataUrl: '', name: '', reason })
const NONE = { state: APP_ASSET_STATES.none, dataUrl: '', name: '', reason: '' }

const clean = (v) => String(v ?? '').trim()

/** The reference on one surface, or null. Only `produced` is a book reference. */
function refOn(apps, touchpointId) {
  const ref = apps?.[touchpointId]?.asset
  if (!ref || ref.kind !== 'produced') return null
  const id = clean(ref.id)
  return id ? { kind: 'produced', id } : null
}

/**
 * Every produced-asset reference this book actually points at.
 *
 * Scoped to the surfaces the project HAS. A reference left behind on a surface
 * the brief no longer picks is not in the book, so it must not be frozen into a
 * Version or carried across the client boundary — the payload should describe
 * the book that exists, not the one that used to.
 *
 * @returns {Array<{touchpoint: string, id: string}>}
 */
export function appAssetRefs(pack) {
  const apps = pack?.touchpointApps || {}
  const out = []
  for (const t of packTouchpoints(pack)) {
    const ref = refOn(apps, t)
    if (ref) out.push({ touchpoint: t, id: ref.id })
  }
  return out
}

export function appAssetFor(pack, touchpointId) {
  const ref = refOn(pack?.touchpointApps, touchpointId)
  if (!ref) return NONE

  const shelf = Array.isArray(pack?.packageAssets) ? pack.packageAssets : []
  const hit = shelf.find((a) => a && a.id === ref.id) || null
  /* Named, not swapped. Substituting the nearest other asset would show a
     client work the designer did not put on that surface. */
  if (!hit) return HELD('the chosen artwork is no longer in the project')
  if (!canDistribute(hit)) return HELD('the chosen artwork is held back by its usage rights')

  const dataUrl = clean(hit.dataUrl)
  if (!dataUrl) return HELD('the chosen artwork has no file stored')

  return {
    state: APP_ASSET_STATES.ready,
    dataUrl,
    name: clean(hit.name),
    reason: '',
  }
}

/**
 * The produced artwork a Version must carry to stay reproducible.
 *
 * A frozen Version may not hold a reference into mutable live state — re-produce
 * an application tomorrow and yesterday's delivered book would quietly change.
 * So the bytes are COPIED at freeze, the same way `buildIdentitySnapshot`
 * already copies the mark's bytes into `payload.mark.image`.
 *
 * TWO FILTERS, BOTH LOAD-BEARING. Only assets the book REFERENCES are copied —
 * the shelf is the designer's whole working set and most of it is not in the
 * book. And only assets that PASS the rights gate are copied, so a withheld
 * file never enters the Version at all; refusing it later at render would mean
 * its bytes had already crossed to the client.
 *
 * @returns {Array<{id, name, dataUrl, rights}>}
 */
/**
 * Everything a Version needs to reprint its Applications pages by itself.
 *
 * Bytes AND placement. Without the placement a frozen book cannot know which
 * surfaces it had — its `detective` is empty by design — so it would print no
 * Applications pages at all and the artwork could never reach the client.
 *
 * Only assets the book actually references are copied, and each is re-checked
 * against `canDistribute` here rather than trusted from the caller: a
 * rights-held file must never enter the Version, because refusing it later at
 * render would mean its bytes had already crossed.
 */
export function frozenAppsFrom(pack) {
  const shelf = Array.isArray(pack?.packageAssets) ? pack.packageAssets : []
  const touchpoints = packTouchpoints(pack)
  const apps = {}
  const assets = []
  const seen = new Set()
  for (const { touchpoint, id } of appAssetRefs(pack)) {
    const hit = shelf.find((a) => a && a.id === id)
    if (!hit || !canDistribute(hit) || !clean(hit.dataUrl)) continue
    apps[touchpoint] = { asset: { kind: 'produced', id: hit.id } }
    if (seen.has(id)) continue
    seen.add(id)
    assets.push({ id: hit.id, name: clean(hit.name), dataUrl: clean(hit.dataUrl), rights: hit.rights })
  }
  return JSON.parse(JSON.stringify({ touchpoints, apps, assets }))
}

/** The bytes half of {@link frozenAppsFrom}. */
export function frozenAppAssetsFrom(pack) {
  return frozenAppsFrom(pack).assets
}
