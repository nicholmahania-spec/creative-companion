import { describe, it, expect } from 'vitest'
import {
  produceMetaForSurface,
  producedAssetsForSurface,
  primaryProducedAsset,
  trayHonestyLine,
} from './applicationPackageAssets.js'
import { PRODUCERS } from './productionProvenance.js'

/* Rows as a produce RUN writes them. The stamp is not decoration here: it is
   what separates the tray's "Real file" from a file the designer uploaded and
   attributed themselves. */
const cardPdf = {
  id: 'a1',
  name: 'Brand · business card',
  deliverable: 'businessCard',
  group: 'application',
  dataUrl: 'data:application/pdf;base64,AAA',
  producedBy: PRODUCERS.businessCard,
  producedAt: '2026-08-12T09:00:00.000Z',
}

const sigPng = {
  id: 'a2',
  name: 'Brand · email signature',
  deliverable: 'emailSignature',
  group: 'application',
  dataUrl: 'data:image/png;base64,AAA',
  producedBy: PRODUCERS.emailSignature,
  producedAt: '2026-08-12T09:00:00.000Z',
}

describe('applicationPackageAssets', () => {
  it('maps only producible surfaces', () => {
    expect(produceMetaForSurface('businessCard')?.deliverable).toBe(
      'businessCard'
    )
    expect(produceMetaForSurface('email')?.deliverable).toBe('emailSignature')
    expect(produceMetaForSurface('website')).toBeNull()
  })

  it('lists real packageAssets per surface without inventing rows', () => {
    const project = { packageAssets: [cardPdf, sigPng] }
    expect(producedAssetsForSurface(project, 'businessCard')).toEqual([cardPdf])
    expect(producedAssetsForSurface(project, 'email')).toEqual([sigPng])
    expect(producedAssetsForSurface(project, 'website')).toEqual([])
  })

  it('an attributed upload never fills the tray', () => {
    const upload = { ...cardPdf, producedBy: '', producedAt: '' }
    const project = { packageAssets: [upload] }
    expect(producedAssetsForSurface(project, 'businessCard')).toEqual([])
    expect(primaryProducedAsset(project, 'businessCard')).toBe(null)
  })

  it('primary produced uses existing artifact helpers', () => {
    const project = { packageAssets: [cardPdf] }
    expect(primaryProducedAsset(project, 'businessCard')?.id).toBe('a1')
    expect(primaryProducedAsset(project, 'email')).toBeNull()
  })

  it('honesty never claims package verification or ship readiness', () => {
    const filled = trayHonestyLine(true)
    const empty = trayHonestyLine(false)
    /* Deny positive claims — "not verified" is the honesty we want. */
    expect(filled).not.toMatch(/\b(is verified|package ready|ready to ship|shipped)\b/i)
    expect(filled).toMatch(/not verified package truth/i)
    expect(empty).toMatch(/Nothing produced yet/i)
  })

  it('ignores held-back and non-application rows', () => {
    const project = {
      packageAssets: [
        { ...cardPdf, heldBack: 'yes' },
        { ...cardPdf, id: 'x', group: 'source' },
      ],
    }
    expect(producedAssetsForSurface(project, 'businessCard')).toEqual([])
  })
})
