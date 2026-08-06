/**
 * The Asset Library as the screen needs it: what to show, grouped, in order,
 * with each card's byte state already decided.
 *
 * Pure, and separate from the view for the reason `assetByteState` gives —
 * this is the judgement made dozens of times per render and the one most
 * likely to be wrong in a way nobody notices until a designer is offline in
 * front of a client. Testing it through a rendered grid would test React.
 *
 * WHAT IS AND IS NOT AVAILABLE OFFLINE, since this is the file that decides
 * it. Rows are local, so the shelf itself — names, categories, provenance,
 * version numbers, counts — is fully readable with no network and no account.
 * Only the BYTES are remote, and each card says honestly which of the four
 * states it is in. A local-only desk gets a real library that cannot yet hold
 * pixels, rather than a screen that says "sign in" and shows nothing.
 */

import {
  ASSET_CATEGORIES,
  categoryLabel,
  currentAssets,
  sourceAppLabel,
  versionNumber,
} from './assetLibrary.js'
import { assetByteState } from './assetBytes.js'

/**
 * One card.
 *
 * `versions` is the count, not a list: the history matters at the moment a
 * client argues about which version they approved, and not before. A number
 * is enough to say "there is history here" without spending a card on it.
 */
export function assetCard(assets, asset, { cachedKeys, loadingKeys, online } = {}) {
  const cached = !!cachedKeys?.has?.(asset.storage_path)
  const loading = !!loadingKeys?.has?.(asset.id)
  const bytes = assetByteState({
    storagePath: asset.storage_path || null,
    cached,
    loading,
    online: online !== false,
  })
  const versions = versionNumber(assets, asset.id)
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    categoryLabel: categoryLabel(asset.category),
    /* Provenance is shown because it changes what the colour check may claim.
       A push from Illustrator carries true fill values; a photographic mockup
       carries whatever the lighting did to them (see `carriesTrueColour`). */
    source: sourceAppLabel(asset.source_app),
    sourceApp: asset.source_app,
    storagePath: asset.storage_path || null,
    approved: !!asset.approved_at,
    versions,
    /* Only said when there IS history. "Version 1 of 1" on every card is
       noise that teaches the eye to skip the line that matters on the one
       card where it says 4. */
    versionLabel: versions > 1 ? `Version ${versions}` : null,
    bytes,
  }
}

/**
 * Group the current assets into the category order the vocabulary declares.
 *
 * Derived from `ASSET_CATEGORIES` rather than restated — the single-source
 * rule this codebase enforces in tests. Empty categories are dropped: a
 * library showing five headings with nothing under four of them reads as four
 * things you have failed to do, which is exactly the survey-of-gaps shape
 * DEVELOPMENT.md rules against.
 */
export function assetShelf(assets = [], opts = {}) {
  const live = currentAssets(assets).filter(Boolean)
  const cards = live.map((a) => assetCard(assets, a, opts))

  const groups = ASSET_CATEGORIES.map((cat) => ({
    id: cat.id,
    label: cat.label,
    cards: cards.filter((c) => c.category === cat.id),
  })).filter((g) => g.cards.length > 0)

  /* A card whose category is not in this build's vocabulary still has to
     appear. `normaliseIngest` deliberately accepts unknown slugs so a forward
     push is kept rather than dropped; silently hiding it here would undo that
     and lose the file in the one place the designer would look for it. */
  const known = new Set(ASSET_CATEGORIES.map((c) => c.id))
  const strays = cards.filter((c) => !known.has(c.category))
  if (strays.length) {
    const unfiled = groups.find((g) => g.id === 'other')
    if (unfiled) unfiled.cards.push(...strays)
    else groups.push({ id: 'other', label: categoryLabel('other'), cards: strays })
  }

  return { groups, total: cards.length }
}

/**
 * What the shelf says about itself when it is empty.
 *
 * Three different nothings, and they must not share a sentence. An empty
 * library on a desk with no account is a capability statement; an empty one
 * on a synced desk is an invitation; an empty CATEGORY is neither and should
 * simply not be drawn.
 */
export function shelfEmptyState({ total, cloud } = {}) {
  if (total > 0) return null
  if (!cloud) {
    return {
      kind: 'local',
      /* States what this desk does, not what the designer failed to set up.
         No "sign in to…" — cloudRequired.js records a cold-start tester being
         sent to hunt for a sign-in that does not exist on a local-only desk. */
      line: 'Finished files live here once this desk is set up to sync. Everything else about the brand works without it.',
    }
  }
  return {
    kind: 'empty',
    line: 'Finished work lands here — drop in a logo, a card, a mockup.',
  }
}
