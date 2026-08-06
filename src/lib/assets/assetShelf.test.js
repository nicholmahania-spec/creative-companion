import { describe, expect, it } from 'vitest'
import { assetShelf, shelfEmptyState } from './assetShelf.js'
import { ASSET_CATEGORIES } from './assetLibrary.js'
import { BYTE_STATES } from './assetBytes.js'

const asset = (over = {}) => ({
  id: 'a1',
  name: 'Primary mark',
  category: 'logo',
  source_app: 'upload',
  storage_path: 'own/proj/a1.svg',
  replaces_id: null,
  approved_at: null,
  ...over,
})

describe('the shelf groups what is current', () => {
  it('drops superseded versions and keeps the head', () => {
    const assets = [
      asset({ id: 'v1' }),
      asset({ id: 'v2', replaces_id: 'v1' }),
    ]
    const { groups, total } = assetShelf(assets)
    expect(total).toBe(1)
    expect(groups[0].cards[0].id).toBe('v2')
  })

  it('counts the history and only names it when there is some', () => {
    const one = assetShelf([asset({ id: 'v1' })]).groups[0].cards[0]
    expect(one.versions).toBe(1)
    /* "Version 1 of 1" on every card teaches the eye to skip the line that
       matters on the one card where it says 4. */
    expect(one.versionLabel).toBeNull()

    const three = assetShelf([
      asset({ id: 'v1' }),
      asset({ id: 'v2', replaces_id: 'v1' }),
      asset({ id: 'v3', replaces_id: 'v2' }),
    ]).groups[0].cards[0]
    expect(three.versions).toBe(3)
    expect(three.versionLabel).toBe('Version 3')
  })

  it('follows the declared category order and draws no empty headings', () => {
    const assets = [
      asset({ id: 'b', category: 'application' }),
      asset({ id: 'a', category: 'logo' }),
    ]
    const { groups } = assetShelf(assets)
    const order = ASSET_CATEGORIES.map((c) => c.id).filter((id) =>
      groups.some((g) => g.id === id)
    )
    expect(groups.map((g) => g.id)).toEqual(order)
    /* Five headings with nothing under four of them reads as four things you
       have failed to do. */
    expect(groups.every((g) => g.cards.length > 0)).toBe(true)
  })

  it('keeps an asset whose category this build has never heard of', () => {
    /* normaliseIngest accepts unknown slugs on purpose so a forward push is
       kept rather than dropped. Hiding it here would undo that and lose the
       file in the one place the designer would look. */
    const { groups, total } = assetShelf([asset({ id: 'x', category: 'packaging' })])
    expect(total).toBe(1)
    const unfiled = groups.find((g) => g.id === 'other')
    expect(unfiled.cards.map((c) => c.id)).toContain('x')
  })
})

describe('each card knows what it can show', () => {
  it('renders from cache regardless of network', () => {
    const cached = new Set(['own/proj/a1.svg'])
    const card = assetShelf([asset()], { cachedKeys: cached, online: false })
      .groups[0].cards[0]
    expect(card.bytes.state).toBe(BYTE_STATES.ready)
  })

  it('says the bytes are not here yet rather than that something failed', () => {
    const card = assetShelf([asset()], { online: true }).groups[0].cards[0]
    expect(card.bytes.state).toBe(BYTE_STATES.remote)
    expect(card.bytes.label).toBeTruthy()
    /* The whole point of the four states: "not downloaded here" must never
       read as "the upload failed". */
    expect(String(card.bytes.label).toLowerCase()).not.toContain('fail')
    expect(String(card.bytes.label).toLowerCase()).not.toContain('error')
  })

  it('distinguishes a row that never got a path from one merely not fetched', () => {
    const missing = assetShelf([asset({ storage_path: null })]).groups[0].cards[0]
    const remote = assetShelf([asset()]).groups[0].cards[0]
    expect(missing.bytes.state).toBe(BYTE_STATES.missing)
    expect(remote.bytes.state).toBe(BYTE_STATES.remote)
    expect(missing.bytes.label).not.toBe(remote.bytes.label)
  })

  it('carries provenance, because it changes what a colour check may claim', () => {
    const card = assetShelf([asset({ source_app: 'illustrator' })]).groups[0]
      .cards[0]
    expect(card.source).toBe('Illustrator')
    expect(card.sourceApp).toBe('illustrator')
  })
})

describe('the three different nothings', () => {
  it('tells a local-only desk what it does, never what it lacks', () => {
    const state = shelfEmptyState({ total: 0, cloud: false })
    expect(state.kind).toBe('local')
    /* cloudRequired.js records a cold-start tester sent hunting for a sign-in
       that does not exist on a desk built without cloud credentials. */
    expect(state.line.toLowerCase()).not.toContain('sign in')
    expect(state.line.toLowerCase()).not.toContain('log in')
  })

  it('invites rather than explains once the desk can hold files', () => {
    const state = shelfEmptyState({ total: 0, cloud: true })
    expect(state.kind).toBe('empty')
    expect(state.line).not.toBe(shelfEmptyState({ total: 0, cloud: false }).line)
  })

  it('says nothing at all when there is something to show', () => {
    expect(shelfEmptyState({ total: 3, cloud: true })).toBeNull()
    expect(shelfEmptyState({ total: 3, cloud: false })).toBeNull()
  })
})
