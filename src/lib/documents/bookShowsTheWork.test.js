import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import useAppStore from '../../store/useAppStore'
import { buildIdentitySnapshot } from '../artifacts/identitySnapshot'
import { buildDeliveryPack, readDeliveryEnvelope } from '../client/brandDelivery'
import { appAssetFor, APP_ASSET_STATES } from '../book/bookAssets'
import { bookVersionRenderInputs } from './documentModel'
import { bookSectionIds } from '../book/bookDocument'

/**
 * PHASE 9 — THE BOOK SHOWS THE WORK, AND THE PROOF IS THE SHIP.
 *
 * Two defects close here, and they are one defect wearing two hats.
 *
 * The Applications page drew four coloured rectangles containing the wordmark
 * as text and printed its own disclaimer — while the designer's actual business
 * card sat in `packageAssets`, inline, rights-tagged, already inside the pack.
 * And `DeliverView` proofed the LIVE project while `DeliverToClient` published
 * the FROZEN Version, so the book the designer checked was not the book the
 * client received.
 *
 * Fixing the first without the second would have been worse than fixing
 * neither: real artwork proofed against a surface that lies is a more
 * convincing wrong answer.
 */

const ROOT = new URL('../../..', import.meta.url).pathname
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const codeOnly = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const CARD = 'data:image/png;base64,CARDBYTES'
const NEW = 'data:image/png;base64,NEWBYTES'

const s = () => useAppStore.getState()
const cur = () => s().projects.find((p) => p.id === s().currentProjectId)

function projectWithArtwork() {
  s().clearToEmpty()
  s().createNewProject('Shows the work')
  const id = cur().id
  useAppStore.setState((st) => ({
    projects: st.projects.map((p) =>
      p.id === id
        ? {
            ...p,
            logoConcepts: [{ id: 'mk1', chosen: true, image: 'data:image/png;base64,MARK' }],
            palette: ['#101010', '#202020'],
            typeHeading: 'Fraunces',
            typeBody: 'Inter',
            /* `businessCard` is a TOUCHPOINT; the brief holds SURFACES and
               `touchpointsFor` maps between them. Asking for the deliverable
               directly is the path a client uses when they order cards without
               ticking "Print" as a place the brand lives. */
            detective: { deliverablesPicked: ['businessCard'] },
            touchpointApps: {
              businessCard: { note: 'logo at 12mm', asset: { kind: 'produced', id: 'pa_1' } },
            },
            packageAssets: [
              { id: 'pa_1', name: 'Business card', dataUrl: CARD, rights: 'clientOwned' },
              { id: 'pa_2', name: 'Unused mock', dataUrl: NEW, rights: 'clientOwned' },
            ],
          }
        : p
    ),
  }))
  return id
}

function send(projectId) {
  const identity = buildIdentitySnapshot(cur())
  s().recordPublishedIdentity(identity, projectId)
  return s().recordSentBookVersion({ projectId, identitySnapshotId: identity.snapshotId })
}

describe('a frozen Version carries the artwork, not a pointer to it', () => {
  beforeEach(projectWithArtwork)

  it('copies the referenced artwork into the Version', () => {
    const rec = send(cur().id)
    expect(rec.ok, rec.error).toBe(true)
    expect(rec.version.appAssets).toHaveLength(1)
    expect(rec.version.appAssets[0].dataUrl).toBe(CARD)
  })

  it('carries only what the book references, never the whole shelf', () => {
    const rec = send(cur().id)
    expect(rec.version.appAssets.map((a) => a.id)).toEqual(['pa_1'])
    expect(JSON.stringify(rec.version.appAssets)).not.toContain('NEWBYTES')
  })

  /* THE POINT OF THE PHASE. Re-produce the card tomorrow and the book sent
     yesterday must not move. */
  it('does not move when the live artwork is replaced afterwards', () => {
    const id = cur().id
    const rec = send(id)
    const before = JSON.stringify(bookVersionRenderInputs(cur(), rec.version.documentVersionId))

    useAppStore.setState((st) => ({
      projects: st.projects.map((p) =>
        p.id === id
          ? {
              ...p,
              packageAssets: [
                { id: 'pa_1', name: 'Rewritten', dataUrl: NEW, rights: 'clientOwned' },
              ],
            }
          : p
      ),
    }))

    const after = JSON.stringify(bookVersionRenderInputs(cur(), rec.version.documentVersionId))
    expect(after).toBe(before)
    expect(after).toContain('CARDBYTES')
    expect(after).not.toContain('NEWBYTES')
  })

  it('survives the live asset being deleted entirely', () => {
    const id = cur().id
    const rec = send(id)
    useAppStore.setState((st) => ({
      projects: st.projects.map((p) => (p.id === id ? { ...p, packageAssets: [] } : p)),
    }))
    const frozen = bookVersionRenderInputs(cur(), rec.version.documentVersionId)
    expect(appAssetFor(frozen.pack, 'businessCard').state).toBe(APP_ASSET_STATES.ready)
    expect(appAssetFor(frozen.pack, 'businessCard').dataUrl).toBe(CARD)
  })

  /* A rights-held file must never enter the Version — refusing it later at
     render would mean its bytes had already crossed to the client. */
  it('never freezes artwork the package would refuse to ship', () => {
    const id = cur().id
    useAppStore.setState((st) => ({
      projects: st.projects.map((p) =>
        p.id === id
          ? {
              ...p,
              packageAssets: [
                { id: 'pa_1', name: 'Stock', dataUrl: CARD, rights: 'thirdParty' },
              ],
            }
          : p
      ),
    }))
    const rec = send(id)
    expect(rec.version.appAssets).toEqual([])
    expect(JSON.stringify(rec.version)).not.toContain('CARDBYTES')
  })
})

/**
 * A frozen pack's `detective` is empty on purpose (Phase 7), so a Version that
 * carried only bytes could not work out which surfaces it had — and printed no
 * Applications pages at all. The artwork would have been frozen into a book
 * with nowhere to put it.
 */
describe('a frozen Version knows which surfaces it had', () => {
  beforeEach(projectWithArtwork)

  it('carries the surface list, not just the bytes', () => {
    const rec = send(cur().id)
    expect(rec.version.appPlacement.touchpoints).toContain('businessCard')
    expect(rec.version.appPlacement.apps.businessCard.asset.id).toBe('pa_1')
  })

  it('still prints its Applications pages once the brief is gone', () => {
    const rec = send(cur().id)
    const frozen = bookVersionRenderInputs(cur(), rec.version.documentVersionId)
    expect(frozen.pack.detective).toEqual({})
    expect(bookSectionIds(frozen.pack)).toContain('apps')
  })

  it('records placement only for surfaces the book actually had', () => {
    const id = cur().id
    useAppStore.setState((st) => ({
      projects: st.projects.map((p) =>
        p.id === id
          ? {
              ...p,
              touchpointApps: {
                ...p.touchpointApps,
                /* Artwork parked on a surface this brief never asked for. */
                signage: { asset: { kind: 'produced', id: 'pa_2' } },
              },
            }
          : p
      ),
    }))
    const rec = send(id)
    expect(rec.version.appPlacement.apps.signage).toBeUndefined()
    expect(rec.version.appAssets.map((a) => a.id)).toEqual(['pa_1'])
  })
})

describe('the client boundary carries the work and nothing else', () => {
  it('passes only referenced, rights-cleared artwork', () => {
    const pack = {
      projectName: 'X',
      touchpoints: ['businessCard'],
      touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_1' } } },
      packageAssets: [
        { id: 'pa_1', name: 'Card', dataUrl: CARD, rights: 'clientOwned' },
        { id: 'pa_2', name: 'Unused', dataUrl: NEW, rights: 'clientOwned' },
      ],
    }
    const { pack: out } = buildDeliveryPack(pack)
    expect(out.packageAssets.map((a) => a.id)).toEqual(['pa_1'])
    expect(JSON.stringify(out), 'an unreferenced file crossed to the client').not.toContain('NEWBYTES')
  })

  it('never passes a rights-held file to the client', () => {
    const pack = {
      touchpoints: ['businessCard'],
      touchpointApps: { businessCard: { asset: { kind: 'produced', id: 'pa_1' } } },
      packageAssets: [{ id: 'pa_1', name: 'Stock', dataUrl: CARD, rights: 'doNotDistribute' }],
    }
    const { pack: out } = buildDeliveryPack(pack)
    expect(out.packageAssets).toBeUndefined()
    expect(JSON.stringify(out)).not.toContain('CARDBYTES')
  })

  it('adds nothing for a project that references no artwork', () => {
    const { pack: out } = buildDeliveryPack({ projectName: 'X', packageAssets: [] })
    expect(out.packageAssets).toBeUndefined()
  })

  /* v:1 envelopes and the bare-pack form predate all of this and must keep
     opening — a client's link from last year is not a migration event. */
  it('still reads a v:1 envelope with no artwork', () => {
    const out = readDeliveryEnvelope({ v: 1, pack: { projectName: 'Old' }, book: null })
    expect(out.pack.projectName).toBe('Old')
    expect(out.pack.packageAssets).toBeUndefined()
  })
})

/**
 * The north star, at pack level: the artwork the designer proofs and the
 * artwork the client opens must be the same bytes on the same surface. The
 * headed E2E asserts the rendered PDFs match; this asserts the inputs do,
 * which is where a divergence would actually start.
 */
describe('the proof and the ship resolve the same artwork', () => {
  beforeEach(projectWithArtwork)

  it('same surface, same bytes, from freeze through to the client', () => {
    const rec = send(cur().id)
    const frozen = bookVersionRenderInputs(cur(), rec.version.documentVersionId)
    const proofed = appAssetFor(frozen.pack, 'businessCard')
    expect(proofed.state).toBe(APP_ASSET_STATES.ready)

    const { pack: sent } = buildDeliveryPack(frozen.pack)
    const received = readDeliveryEnvelope({ v: 2, pack: sent, book: frozen.book }).pack
    const opened = appAssetFor(received, 'businessCard')

    expect(opened.state).toBe(proofed.state)
    expect(opened.dataUrl).toBe(proofed.dataUrl)
    expect(opened.name).toBe(proofed.name)
  })
})

describe('nothing is fabricated where something real exists', () => {
  beforeEach(projectWithArtwork)

  it('the PDF draws the referenced artwork and drops the proof disclaimer', () => {
    const pdf = codeOnly(read('src/lib/book/brandBookPdf.js'))
    const apps = pdf.slice(pdf.indexOf('drawAppsSection'), pdf.indexOf('const SECTION_DRAW'))
    expect(apps).toMatch(/appAssetFor/)
    expect(apps).toMatch(/addImage\(art\.dataUrl/)
    /* The disclaimer may still exist — but only behind the no-real-work gate. */
    expect(apps).toMatch(/if \(!realWork\)/)
  })

  it('the builder canvas resolves through the same function as the PDF', () => {
    const view = codeOnly(read('src/views/BrandBookBuilderView.jsx'))
    expect(view).toMatch(/appAssetFor\(project, tpId\)/)
  })

  /* A signed URL expires; a Version does not. If the frozen book fetched its
     artwork the delivered book would rot on a timer, which is the whole thing
     a Version exists to prevent. */
  it('the frozen artwork is bytes, never a URL that expires', () => {
    const src = codeOnly(read('src/lib/book/bookAssets.js'))
    expect(src).not.toMatch(/createSignedUrl|getPublicUrl|supabase|fetch\(|https?:\/\//)
    const rec = send(cur().id)
    for (const a of rec.version.appAssets) {
      expect(a.dataUrl, 'artwork left the Version as a link').toMatch(/^data:/)
    }
  })

  it('the rights rule is imported, never restated', () => {
    const assets = codeOnly(read('src/lib/book/bookAssets.js'))
    expect(assets).toMatch(/import \{ canDistribute \}/)
    expect(assets, 'a second rights table').not.toMatch(/thirdParty|doNotDistribute|designerOwned/)
  })
})

describe('the proof is the ship', () => {
  it('DeliverView previews the frozen Version, not the live pack', () => {
    const view = codeOnly(read('src/views/DeliverView.jsx'))
    /* Was `bookVersionRenderInputs` called inline here. The same three lines
       were then needed by the EXPORT path, which had none of them and shipped
       the live pack — so the resolver moved into `latestBookVersionInputs` and
       both call it. The rule this test protects is unchanged: the preview
       resolves a frozen Version. */
    expect(view).toMatch(/deliveryPackFor/)
    expect(view).toMatch(/pack=\{proof\.pack\}/)
    /* Scoped to the PREVIEW. `packSnap` legitimately still feeds
       `DeliverToClient`, whose `deliveryGaps` compares what the client holds
       against what the project has now — a diff needs both sides. */
    const preview = view.slice(
      view.indexOf('assets-preview-panel'),
      view.indexOf('</Suspense>', view.indexOf('assets-preview-panel'))
    )
    expect(preview, 'the live pack still reaches the proof').not.toMatch(/pack=\{packSnap\}/)
  })
})
