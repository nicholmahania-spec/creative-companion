import { describe, expect, it } from 'vitest'
import { appAssetFor, appAssetRefs, frozenAppAssetsFrom, APP_ASSET_STATES } from './bookAssets'

/**
 * THE BOOK SHOWS THE WORK — OR SAYS WHY IT CANNOT.
 *
 * The Applications section used to draw four coloured rectangles containing
 * the wordmark as text, and print its own disclaimer underneath: "Mocks are
 * direction proofs only - not production die-lines." That is the product
 * fabricating an artefact the designer did not make, on the one page a brand
 * designer's portfolio is built from.
 *
 * The designer's real production artwork already exists — `packageAssets`
 * carries it inline as a data URL, with usage rights attached — and the book
 * simply never read it. This module is the read.
 *
 * THREE HONEST OUTCOMES, MODELLED ON `markSource`. A surface either has real
 * work behind it (`ready`), has nothing chosen (`none`), or has something
 * chosen that cannot be shown (`held`). There is deliberately no fourth state
 * that quietly substitutes a drawing, because that is the defect this closes.
 *
 * RIGHTS ARE NOT RE-DECIDED HERE. `canDistribute` is imported from the package
 * planner rather than reimplemented: if Delivery would refuse to ship a file,
 * the client's book must refuse to print it, and one rule cannot be enforced
 * by two copies that will eventually disagree.
 */

const PNG = 'data:image/png;base64,AAAA'
const PNG2 = 'data:image/png;base64,BBBB'

const asset = (over = {}) => ({
  id: 'pa_1',
  name: 'Business card',
  dataUrl: PNG,
  rights: 'clientOwned',
  ...over,
})

const PACK = (over = {}) => ({
  touchpoints: ['businessCard', 'signage'],
  touchpointApps: {
    businessCard: { note: 'logo at 12mm', asset: { kind: 'produced', id: 'pa_1' } },
  },
  packageAssets: [asset()],
  ...over,
})

describe('appAssetFor', () => {
  it('resolves a chosen produced asset to its real bytes', () => {
    const r = appAssetFor(PACK(), 'businessCard')
    expect(r.state).toBe(APP_ASSET_STATES.ready)
    expect(r.dataUrl).toBe(PNG)
    expect(r.name).toBe('Business card')
  })

  /* A surface nobody chose artwork for is not a failure. It is the ordinary
     state of most projects, and the page says so by showing nothing. */
  it('reports nothing chosen as `none`, not as a problem', () => {
    const r = appAssetFor(PACK(), 'signage')
    expect(r.state).toBe(APP_ASSET_STATES.none)
    expect(r.dataUrl).toBe('')
    expect(r.reason).toBe('')
  })

  /* THE ONE THAT MATTERS MOST. A reference whose asset has been deleted must
     not fall back to the old drawn mock — that would put invented work under a
     heading the designer chose. */
  it('reports a missing asset explicitly and substitutes nothing', () => {
    const r = appAssetFor(PACK({ packageAssets: [] }), 'businessCard')
    expect(r.state).toBe(APP_ASSET_STATES.held)
    expect(r.reason).toMatch(/no longer in the project/i)
    expect(r.dataUrl).toBe('')
  })

  it('never resolves to a different asset than the one referenced', () => {
    const r = appAssetFor(
      PACK({ packageAssets: [asset({ id: 'pa_OTHER', dataUrl: PNG2 })] }),
      'businessCard'
    )
    expect(r.state).toBe(APP_ASSET_STATES.held)
    expect(r.dataUrl).not.toBe(PNG2)
  })

  it('holds an asset with no bytes rather than printing an empty frame', () => {
    const r = appAssetFor(PACK({ packageAssets: [asset({ dataUrl: '' })] }), 'businessCard')
    expect(r.state).toBe(APP_ASSET_STATES.held)
    expect(r.reason).toMatch(/no file/i)
  })
})

describe('the rights gate is the package planner’s, not a second copy', () => {
  /* If Delivery would hold a file back, the client's book may not print it. */
  for (const rights of ['designerOwned', 'thirdParty', 'doNotDistribute']) {
    it(`holds a ${rights} asset back from the book`, () => {
      const r = appAssetFor(PACK({ packageAssets: [asset({ rights })] }), 'businessCard')
      expect(r.state).toBe(APP_ASSET_STATES.held)
      expect(r.reason).toMatch(/rights/i)
      expect(r.dataUrl, 'rights-held bytes reached the renderer').toBe('')
    })
  }

  it('holds an asset whose rights were never set', () => {
    const r = appAssetFor(PACK({ packageAssets: [asset({ rights: undefined })] }), 'businessCard')
    expect(r.state).toBe(APP_ASSET_STATES.held)
  })

  for (const rights of ['clientOwned', 'licensed']) {
    it(`ships a ${rights} asset`, () => {
      const r = appAssetFor(PACK({ packageAssets: [asset({ rights })] }), 'businessCard')
      expect(r.state).toBe(APP_ASSET_STATES.ready)
    })
  }
})

describe('appAssetRefs — what a book actually points at', () => {
  it('names only the surfaces that reference something', () => {
    expect(appAssetRefs(PACK())).toEqual([{ touchpoint: 'businessCard', id: 'pa_1' }])
  })

  it('is empty for a project that chose nothing', () => {
    expect(appAssetRefs(PACK({ touchpointApps: {} }))).toEqual([])
  })

  /* A reference on a surface the brief never picked is not in the book. */
  it('ignores a reference on a surface this project does not have', () => {
    const p = PACK({
      touchpoints: ['signage'],
      touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_1' } } },
    })
    expect(appAssetRefs(p)).toEqual([])
  })

  it('ignores a reference of an unknown kind', () => {
    const p = PACK({
      touchpointApps: { businessCard: { asset: { kind: 'evidence', id: 'pa_1' } } },
    })
    expect(appAssetRefs(p)).toEqual([])
  })
})

describe('frozenAppAssetsFrom — what a Version must carry', () => {
  it('copies the bytes of every referenced, shippable asset', () => {
    const frozen = frozenAppAssetsFrom(PACK())
    expect(frozen).toHaveLength(1)
    expect(frozen[0]).toEqual({
      id: 'pa_1',
      name: 'Business card',
      dataUrl: PNG,
      rights: 'clientOwned',
    })
  })

  /* THE RIGHTS GATE RUNS AT FREEZE, NOT ONLY AT RENDER. A held file must never
     enter the Version, because the Version is what crosses to the client. */
  it('never freezes bytes the package would refuse to ship', () => {
    const frozen = frozenAppAssetsFrom(PACK({ packageAssets: [asset({ rights: 'thirdParty' })] }))
    expect(frozen).toEqual([])
    expect(JSON.stringify(frozen)).not.toContain('AAAA')
  })

  /* ONLY WHAT IS REFERENCED. The list is the designer's whole working shelf;
     the book may carry the handful of files it actually shows and no more. */
  it('carries only referenced assets, never the whole shelf', () => {
    const p = PACK({
      packageAssets: [asset(), asset({ id: 'pa_2', name: 'Unused', dataUrl: PNG2 })],
    })
    const frozen = frozenAppAssetsFrom(p)
    expect(frozen.map((a) => a.id)).toEqual(['pa_1'])
    expect(JSON.stringify(frozen), 'an unreferenced asset crossed the boundary').not.toContain('BBBB')
  })

  it('is empty when nothing is referenced', () => {
    expect(frozenAppAssetsFrom(PACK({ touchpointApps: {} }))).toEqual([])
  })

  it('is a deep copy — a later edit to the live asset cannot reach it', () => {
    const p = PACK()
    const frozen = frozenAppAssetsFrom(p)
    p.packageAssets[0].dataUrl = PNG2
    p.packageAssets[0].name = 'Renamed'
    expect(frozen[0].dataUrl).toBe(PNG)
    expect(frozen[0].name).toBe('Business card')
  })
})

describe('a frozen pack reads its own assets, never the live shelf', () => {
  /* `packFromBookVersion` puts the frozen list on the pack under the same key
     the live pack uses, so one resolver serves both and the renderer cannot
     tell — or care — which it is holding. What it must never do is reach past
     an empty frozen list into live state. */
  it('resolves from the frozen list when that is all there is', () => {
    const frozenPack = {
      touchpoints: ['businessCard'],
      touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_1' } } },
      packageAssets: [{ id: 'pa_1', name: 'Business card', dataUrl: PNG, rights: 'clientOwned' }],
    }
    expect(appAssetFor(frozenPack, 'businessCard').dataUrl).toBe(PNG)
  })

  it('holds, rather than borrows, when the frozen list lost the asset', () => {
    const frozenPack = {
      touchpoints: ['businessCard'],
      touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_1' } } },
      packageAssets: [],
    }
    const r = appAssetFor(frozenPack, 'businessCard')
    expect(r.state).toBe(APP_ASSET_STATES.held)
  })
})
