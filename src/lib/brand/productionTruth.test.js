/**
 * The production-truth ladder, one rung at a time.
 *
 * A schematic specimen, an accepted mock, a colour sample, an uploaded file
 * and a produced file are five different things, and the app used to be able
 * to tell only some of them apart. These tests pin the distinctions that
 * matter, in the direction that matters: the app must never report MORE than
 * it can establish.
 *
 * Deliberately not a UI test. Every assertion here is about stored truth, so
 * it stays valid through any amount of presentation work.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import useAppStore, { blankWorkspaceState, pickPersisted } from '../../store/useAppStore'
import {
  PRODUCERS,
  productionStamp,
  isAppProduced,
  isProducedByApp,
} from './productionProvenance.js'
import {
  isBusinessCardPackageAsset,
  isProducedBusinessCardArtifact,
  findProducedBusinessCard,
  projectHasProducedBusinessCard,
} from './businessCardArtifact.js'
import {
  isProducedEmailSignatureArtifact,
  projectHasProducedEmailSignature,
} from './emailSignatureArtifact.js'
import {
  producedAssetsForSurface,
  primaryProducedAsset,
} from './applicationPackageAssets.js'
import { packagePlan, deliverableChecklist } from '../deliver/packagePlan.js'

const PDF = 'data:application/pdf;base64,JVBERi0xLjQK'
const PNG = 'data:image/png;base64,iVBORw0KGgo='

/** What an in-app produce run writes, minus the store's own bookkeeping. */
const producedCard = (over = {}) => ({
  id: 'produced-card',
  name: 'Harbor · business card',
  dataUrl: PDF,
  group: 'application',
  item: 'businessCard',
  deliverable: 'businessCard',
  rights: 'clientOwned',
  heldBack: '',
  ...productionStamp(PRODUCERS.businessCard, { at: '2026-08-12T09:00:00.000Z' }),
  ...over,
})

/** What the Delivery file picker writes, once the designer attributes it. */
const uploadedCard = (over = {}) => ({
  id: 'uploaded-card',
  name: 'Card final v3',
  dataUrl: PDF,
  group: 'application',
  item: 'Card final v3',
  deliverable: 'businessCard',
  rights: 'clientOwned',
  heldBack: '',
  producedBy: '',
  producedAt: '',
  ...over,
})

describe('1 · a schematic representation is not a produced file', () => {
  it('a mock on screen leaves no package row behind at all', () => {
    /* The specimen is drawn from Identity fields. There is nothing to assert
       about it except that it has no representation in package truth — which
       is exactly the claim. */
    const project = { touchpointApps: { businessCard: {} }, packageAssets: [] }
    expect(projectHasProducedBusinessCard(project)).toBe(false)
    expect(producedAssetsForSurface(project, 'businessCard')).toEqual([])
    expect(primaryProducedAsset(project, 'businessCard')).toBe(null)
  })
})

describe('2 · an accepted mock is not package material', () => {
  it('touchpointApps.done says nothing about files', () => {
    const project = {
      touchpointApps: { businessCard: { done: true, note: 'Looks right' } },
      packageAssets: [],
    }
    expect(projectHasProducedBusinessCard(project)).toBe(false)
    expect(packagePlan(project, { assets: [], includeBook: false }).folders
      .some((f) => f.id === 'applications')).toBe(false)
  })

  it('accepting a mock through the canonical writer touches no package state', () => {
    useAppStore.setState(blankWorkspaceState())
    const project = useAppStore.getState().createNewProject('Harbor', '')
    useAppStore.getState().updateBrandField('touchpointApps', {
      businessCard: { done: true },
    })
    const saved = useAppStore.getState().projects.find((p) => p.id === project.id)
    expect(saved.touchpointApps.businessCard.done).toBe(true)
    expect(saved.packageAssets).toEqual([])
  })
})

describe('3 · an external sample is not a produced file', () => {
  it('an upload attributed to the business card is package material, not output', () => {
    const row = uploadedCard()
    /* It IS the client's business card — the checklist must still tick. */
    expect(isBusinessCardPackageAsset(row)).toBe(true)
    /* It is NOT something this app made. */
    expect(isProducedBusinessCardArtifact(row)).toBe(false)
    expect(isAppProduced(row)).toBe(false)
    expect(findProducedBusinessCard([row])).toBe(null)
  })

  it('the same hole, closed for the email signature', () => {
    const row = {
      ...uploadedCard(),
      dataUrl: PNG,
      deliverable: 'emailSignature',
    }
    expect(isProducedEmailSignatureArtifact(row)).toBe(false)
    expect(projectHasProducedEmailSignature({ packageAssets: [row] })).toBe(false)
  })

  it('a forged or unknown producer id does not count as production', () => {
    expect(isProducedBusinessCardArtifact(producedCard({ producedBy: 'me' }))).toBe(false)
    expect(isAppProduced({ producedBy: 'me' })).toBe(false)
    expect(isProducedByApp(producedCard(), 'notAProducer')).toBe(false)
    expect(() => productionStamp('notAProducer')).toThrow()
  })

  it('a produced row cannot be borrowed by the other surface', () => {
    /* businessCard's stamp on a row filed as the email signature proves
       nothing about the signature. */
    const crossed = {
      ...producedCard(),
      dataUrl: PNG,
      deliverable: 'emailSignature',
    }
    expect(isProducedEmailSignatureArtifact(crossed)).toBe(false)
  })
})

describe('4 · a real production run creates the canonical produced record', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('addPackageAsset carries the stamp through, and only when given one', () => {
    useAppStore.getState().createNewProject('Harbor', '')
    const produced = useAppStore.getState().addPackageAsset({
      name: 'Harbor · business card',
      dataUrl: PDF,
      group: 'application',
      item: 'businessCard',
      deliverable: 'businessCard',
      rights: 'clientOwned',
      ...productionStamp(PRODUCERS.businessCard),
    })
    const upload = useAppStore.getState().addPackageAsset({
      name: 'Card final v3',
      dataUrl: PDF,
    })

    expect(produced.producedBy).toBe(PRODUCERS.businessCard)
    expect(produced.producedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(isProducedBusinessCardArtifact(produced)).toBe(true)

    /* The ordinary path is unstamped, and stays that way. */
    expect(upload.producedBy).toBe('')
    expect(upload.producedAt).toBe('')
    expect(isAppProduced(upload)).toBe(false)
  })
})

describe('5 · produced package material survives a reload', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('the stamp and the bytes both come back out of the persisted payload', () => {
    const project = useAppStore.getState().createNewProject('Harbor', '')
    useAppStore.getState().addPackageAsset({
      name: 'Harbor · business card',
      dataUrl: PDF,
      group: 'application',
      item: 'businessCard',
      deliverable: 'businessCard',
      rights: 'clientOwned',
      ...productionStamp(PRODUCERS.businessCard),
    })

    /* Round-trip through exactly what persistence keeps, then rehydrate. */
    const payload = JSON.parse(JSON.stringify(pickPersisted(useAppStore.getState())))
    useAppStore.setState({ ...blankWorkspaceState(), ...payload })

    const reloaded = useAppStore.getState().projects.find((p) => p.id === project.id)
    expect(projectHasProducedBusinessCard(reloaded)).toBe(true)
    expect(findProducedBusinessCard(reloaded.packageAssets).dataUrl).toBe(PDF)
  })
})

describe('6 · a produced asset keeps its project / surface / deliverable identity', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('the row stays inside its own project and resolves to its own surface', () => {
    const a = useAppStore.getState().createNewProject('Harbor', '')
    useAppStore.getState().addPackageAsset({
      name: 'Harbor · business card',
      dataUrl: PDF,
      group: 'application',
      item: 'businessCard',
      deliverable: 'businessCard',
      rights: 'clientOwned',
      ...productionStamp(PRODUCERS.businessCard),
    })
    const b = useAppStore.getState().createNewProject('Other client', '')

    const projects = useAppStore.getState().projects
    const harbor = projects.find((p) => p.id === a.id)
    const other = projects.find((p) => p.id === b.id)

    /* Project association is the row's containment, and it holds. */
    expect(harbor.packageAssets).toHaveLength(1)
    expect(other.packageAssets).toEqual([])
    expect(projectHasProducedBusinessCard(other)).toBe(false)

    /* Surface resolves from the deliverable it was produced for — and not
       from the surface next door. */
    expect(producedAssetsForSurface(harbor, 'businessCard')).toHaveLength(1)
    expect(producedAssetsForSurface(harbor, 'email')).toEqual([])
  })
})

describe('7 · re-production does not create ambiguous duplicate truth', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('the same row is rewritten, and the run date moves while the filing date does not', () => {
    const project = useAppStore.getState().createNewProject('Harbor', '')
    const rowsOf = () =>
      useAppStore.getState().projects.find((p) => p.id === project.id).packageAssets
    const first = useAppStore.getState().addPackageAsset({
      name: 'Harbor · business card',
      dataUrl: PDF,
      group: 'application',
      item: 'businessCard',
      deliverable: 'businessCard',
      rights: 'clientOwned',
      ...productionStamp(PRODUCERS.businessCard, { at: '2026-03-01T10:00:00.000Z' }),
    })

    /* Second run: the produce path finds its own row and patches it. */
    const found = findProducedBusinessCard(rowsOf())
    expect(found.id).toBe(first.id)
    useAppStore.getState().updatePackageAsset(found.id, {
      dataUrl: `${PDF}Mg==`,
      ...productionStamp(PRODUCERS.businessCard, { at: '2026-08-12T09:00:00.000Z' }),
    })

    const rows = rowsOf()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(first.id)
    /* The run behind the CURRENT bytes, not the first run ever. */
    expect(rows[0].producedAt).toBe('2026-08-12T09:00:00.000Z')
    /* Filing is a different fact and is left alone. */
    expect(rows[0].addedAt).toBe(first.addedAt)
  })

  it('production never overwrites a file the designer uploaded themselves', () => {
    /* The designer's own card is not ours to replace: it fails the find, so
       a produce run adds its own row rather than destroying their work. */
    const rows = [uploadedCard()]
    expect(findProducedBusinessCard(rows)).toBe(null)
  })
})

describe('8 · forensic checking does not mutate packageAssets', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('a stored colour sample leaves package truth untouched', () => {
    const project = useAppStore.getState().createNewProject('Harbor', '')
    useAppStore.getState().updateBrandField('touchpointApps', {
      businessCard: { check: { hexes: ['#1B4C7E'], at: '2026-08-12T09:00:00.000Z' } },
    })
    const saved = useAppStore.getState().projects.find((p) => p.id === project.id)
    expect(saved.touchpointApps.businessCard.check.hexes).toEqual(['#1B4C7E'])
    expect(saved.packageAssets).toEqual([])
    expect(projectHasProducedBusinessCard(saved)).toBe(false)
  })
})

describe('9 · Identity is unchanged by production', () => {
  beforeEach(() => useAppStore.setState(blankWorkspaceState()))

  it('producing a card writes no canonical Identity field', () => {
    const project = useAppStore.getState().createNewProject('Harbor', '')
    const before = useAppStore.getState().projects.find((p) => p.id === project.id)
    const identity = (p) => ({
      logoImage: p.logoImage,
      logoWordmark: p.logoWordmark,
      palette: p.palette,
      colorRoles: p.colorRoles,
      typeHeading: p.typeHeading,
      typeBody: p.typeBody,
    })
    const identityBefore = JSON.stringify(identity(before))

    useAppStore.getState().addPackageAsset({
      name: 'Harbor · business card',
      dataUrl: PDF,
      group: 'application',
      item: 'businessCard',
      deliverable: 'businessCard',
      rights: 'clientOwned',
      ...productionStamp(PRODUCERS.businessCard),
    })

    const after = useAppStore.getState().projects.find((p) => p.id === project.id)
    expect(JSON.stringify(identity(after))).toBe(identityBefore)
  })
})

describe('10 · Delivery still owns final package truth', () => {
  const pack = {
    name: 'Harbor',
    detective: { deliverablesPicked: ['businessCard'] },
  }

  it('production does not decide what ships — rights and the plan still do', () => {
    /* A produced file marked do-not-distribute is held back, stamp and all.
       Production makes material; it does not grant passage. */
    const held = producedCard({ rights: 'doNotDistribute' })
    const plan = packagePlan(pack, { assets: [held], includeBook: false })
    expect(plan.folders.some((f) => f.id === 'applications')).toBe(false)
    expect(plan.excluded.map((x) => x.name)).toContain(held.name)
    /* And the production engine still knows it produced it. */
    expect(isProducedBusinessCardArtifact(held)).toBe(true)
  })

  it('an unstamped upload still ticks the deliverable it was attributed to', () => {
    /* The stamp narrows what counts as OUTPUT. It must not narrow what
       counts as DELIVERY — that would quietly stop shipping the designer's
       own files, which is Delivery's call and not production's. */
    const plan = packagePlan(pack, { assets: [uploadedCard()], includeBook: false })
    const row = deliverableChecklist(pack, plan).find((r) => r.id === 'businessCard')
    expect(row.ok).toBe(true)
  })
})

describe('11 · packageAssets contain only real package material', () => {
  it('nothing but a file with bytes reads as a produced asset', () => {
    for (const bad of [
      producedCard({ dataUrl: '' }),
      producedCard({ dataUrl: 'https://cdn.test/card.pdf' }),
      producedCard({ heldBack: 'tooLarge', dataUrl: '' }),
      producedCard({ heldBack: 'tooLarge' }),
      producedCard({ group: 'logo' }),
      producedCard({ deliverable: '' }),
      producedCard({ dataUrl: PNG }),
    ]) {
      expect(isProducedBusinessCardArtifact(bad)).toBe(false)
    }
  })
})

describe('12 · missing production cannot be represented as verified production', () => {
  it('every state short of a real run reports not produced', () => {
    const cases = {
      'nothing at all': { packageAssets: [] },
      'mock accepted': { touchpointApps: { businessCard: { done: true } }, packageAssets: [] },
      'colour sampled': {
        touchpointApps: { businessCard: { check: { hexes: ['#1B4C7E'] } } },
        packageAssets: [],
      },
      'designer upload': { packageAssets: [uploadedCard()] },
      'held back': { packageAssets: [producedCard({ heldBack: 'tooLarge' })] },
      'row written before the stamp existed': {
        packageAssets: [producedCard({ producedBy: '', producedAt: '' })],
      },
    }
    for (const [label, project] of Object.entries(cases)) {
      expect(projectHasProducedBusinessCard(project), label).toBe(false)
      expect(producedAssetsForSurface(project, 'businessCard'), label).toEqual([])
    }
    /* And the one case that does: an actual run. */
    expect(projectHasProducedBusinessCard({ packageAssets: [producedCard()] })).toBe(true)
  })
})

describe('the stamp stays writable from one place only', () => {
  /* A source scan, in the spirit of the repo's other ratchets. The whole
     value of `producedBy` is that nothing except a produce path sets it — a
     single convenience write somewhere else (a template copy, a fixture, an
     import path "restoring" a project) would put the app straight back to
     claiming runs it never performed, and no behavioural test would catch it
     because the forged row would look exactly like a real one. */
  const SRC = fileURLToPath(new URL('../..', import.meta.url))

  /** Files allowed to name the field at all, and why. */
  const ALLOWED = new Set([
    /* Defines it. */
    'lib/brand/productionProvenance.js',
    /* Canonical writer — normalises whatever a caller passes. */
    'store/useAppStore.js',
    /* The two produce paths. */
    'features/brand/BusinessCardProduce.jsx',
    'features/brand/EmailSignatureProduce.jsx',
  ])

  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) return walk(full)
      return /\.(js|jsx)$/.test(entry) ? [full] : []
    })

  it('no module outside the produce paths writes producedBy', () => {
    /* Both spellings of the same act: setting the field directly, and
       spreading the helper that sets it. Checking only the first left the
       door open for a mock-acceptance handler or a route effect to spread
       `productionStamp(...)` into a row and manufacture a run. */
    const offenders = walk(SRC)
      .filter((f) => !/\.test\.jsx?$/.test(f))
      .filter((f) => {
        const src = readFileSync(f, 'utf8')
        return /producedBy\s*:/.test(src) || /productionStamp\s*\(/.test(src)
      })
      .map((f) => relative(SRC, f).split('\\').join('/'))
      .filter((rel) => !ALLOWED.has(rel))
      .sort()

    expect(
      offenders,
      `these modules write producedBy but are not production paths — a stamp written anywhere else is a production run the app did not perform:\n  ${offenders.join('\n  ')}`
    ).toEqual([])
  })

  /* Not "does this file mention the stamp anywhere" — that version passed
     while the stamp was deleted from the first-production branch and kept on
     the re-production branch, so a designer's very first Produce wrote an
     unstamped row and nothing noticed. Both produce paths now build ONE
     payload and hand the same object to whichever writer applies, so this
     asserts the thing that actually matters: every write is stamped. */
  it('every packageAssets write in a produce path carries the stamp', () => {
    for (const f of [
      'features/brand/BusinessCardProduce.jsx',
      'features/brand/EmailSignatureProduce.jsx',
    ]) {
      const src = readFileSync(join(SRC, f), 'utf8')

      /* The single payload, read by matching its braces rather than by
         guessing where it ends. */
      const start = src.indexOf('const patch = {')
      expect(start, `${f}: no single produce payload to check`).toBeGreaterThan(-1)
      let depth = 0
      let end = -1
      for (let i = src.indexOf('{', start); i < src.length; i += 1) {
        if (src[i] === '{') depth += 1
        else if (src[i] === '}') {
          depth -= 1
          if (depth === 0) { end = i; break }
        }
      }
      expect(end, `${f}: produce payload never closes`).toBeGreaterThan(start)
      const payload = src.slice(start, end + 1)

      expect(payload, `${f}: the produce payload is not stamped`).toMatch(
        /\.\.\.productionStamp\(PRODUCERS\.\w+\)/
      )
      expect(payload, `${f}: the produce payload files no bytes`).toMatch(/\bdataUrl\b/)

      /* And nothing writes packageAssets except through that payload. */
      const writes = [...src.matchAll(/(?:addPackageAsset\??\.?\(|updatePackageAsset\()([^)]*)\)/g)]
      expect(writes.length, `${f}: no packageAssets writer found`).toBeGreaterThan(0)
      for (const w of writes) {
        expect(w[1], `${f}: a packageAssets write bypasses the stamped payload — ${w[0]}`)
          .toMatch(/\bpatch\b/)
      }
    }
  })
})

describe('a failed production run writes no success', () => {
  /* There is no render harness here (vitest runs in `node`), so the produce
     paths' early returns are proved two ways instead: the stamp is not
     REACHABLE until the bytes have been validated, and a stamp that somehow
     arrived without bytes is rejected by the truth model regardless. */
  const SRC_DIR = fileURLToPath(new URL('../..', import.meta.url))

  it('neither produce path can reach the stamp before its bytes are checked', () => {
    for (const [file, mimeGuard] of [
      ['features/brand/BusinessCardProduce.jsx', 'if (!/^data:application\\/pdf/i.test(dataUrl)) {'],
      ['features/brand/EmailSignatureProduce.jsx', 'if (!/^data:image\\/png/i.test(dataUrl)) {'],
    ]) {
      const src = readFileSync(join(SRC_DIR, file), 'utf8')
      const stampAt = src.indexOf('productionStamp(')
      const okAt = src.indexOf('if (!result?.ok || !result.blob) {')
      const mimeAt = src.indexOf(mimeGuard)

      expect(stampAt, `${file}: nothing stamps its output`).toBeGreaterThan(-1)
      expect(okAt, `${file}: lost the render-failed guard`).toBeGreaterThan(-1)
      expect(mimeAt, `${file}: lost the wrong-bytes guard`).toBeGreaterThan(-1)

      /* Both guards sit upstream of the stamp, and both bail out. A render
         that failed, or bytes that came back the wrong type, therefore leave
         the project exactly as they found it — no row, no stamp, no claim. */
      expect(okAt, `${file}: stamp reachable before the render-failed guard`).toBeLessThan(stampAt)
      expect(mimeAt, `${file}: stamp reachable before the wrong-bytes guard`).toBeLessThan(stampAt)
      expect(src.slice(okAt, mimeAt), `${file}: render-failed guard does not return`).toMatch(/\breturn\b/)
      expect(src.slice(mimeAt, stampAt), `${file}: wrong-bytes guard does not return`).toMatch(/\breturn\b/)
    }
  })

  it('a stamp without bytes is not production, however it got there', () => {
    /* Defence in depth. Production is bytes AND authorship — never authorship
       on its own — so even a leaked stamp cannot report a run that failed. */
    expect(isProducedBusinessCardArtifact(producedCard({ dataUrl: '' }))).toBe(false)
    expect(
      isProducedEmailSignatureArtifact({
        ...producedCard({ dataUrl: '' }),
        deliverable: 'emailSignature',
        producedBy: PRODUCERS.emailSignature,
      })
    ).toBe(false)
  })

  it('removing the package asset removes the production claim', () => {
    useAppStore.setState(blankWorkspaceState())
    const project = useAppStore.getState().createNewProject('Harbor', '')
    const row = useAppStore.getState().addPackageAsset({
      name: 'Harbor · business card',
      dataUrl: PDF,
      group: 'application',
      item: 'businessCard',
      deliverable: 'businessCard',
      rights: 'clientOwned',
      ...productionStamp(PRODUCERS.businessCard),
    })
    const current = () =>
      useAppStore.getState().projects.find((p) => p.id === project.id)

    expect(projectHasProducedBusinessCard(current())).toBe(true)
    useAppStore.getState().removePackageAsset(row.id)

    /* packageAssets is the authority: no row, no production — and no residue
       anywhere else still claiming there was one. */
    expect(projectHasProducedBusinessCard(current())).toBe(false)
    expect(current().packageAssets).toEqual([])
    expect(current().touchpointApps || {}).toEqual({})
  })
})

describe('production stands on its own, in both directions', () => {
  const withProduced = (over = {}) => ({ packageAssets: [producedCard()], ...over })

  it('production needs no mock acceptance to be true', () => {
    /* The ladder is not a staircase that must be climbed in order. A designer
       who never pressed "This mock is good" has still produced a file, and
       the app must not withhold that. */
    expect(projectHasProducedBusinessCard(withProduced({ touchpointApps: {} }))).toBe(true)
    expect(
      projectHasProducedBusinessCard(withProduced({ touchpointApps: { businessCard: {} } }))
    ).toBe(true)
  })

  it('production needs no forensic check, and a check cannot alter it', () => {
    expect(projectHasProducedBusinessCard(withProduced({ touchpointApps: {} }))).toBe(true)
    expect(
      projectHasProducedBusinessCard(
        withProduced({
          touchpointApps: { businessCard: { check: { hexes: ['#1B4C7E'] } } },
        })
      )
    ).toBe(true)

    /* And the converse, which is the direction that actually goes wrong:
       acceptance and a colour reading together are still not a file. */
    expect(
      projectHasProducedBusinessCard({
        packageAssets: [],
        touchpointApps: {
          businessCard: { done: true, check: { hexes: ['#1B4C7E'] }, note: 'Looks right' },
        },
      })
    ).toBe(false)
  })
})
