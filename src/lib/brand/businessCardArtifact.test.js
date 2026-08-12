import { describe, it, expect } from 'vitest'
import {
  isBusinessCardPackageAsset,
  isProducedBusinessCardArtifact,
  findProducedBusinessCard,
  projectHasProducedBusinessCard,
  businessCardAssetName,
} from './businessCardArtifact.js'
import { PRODUCERS } from './productionProvenance.js'

const PDF = 'data:application/pdf;base64,JVBERi0xLjQK'
const PNG = 'data:image/png;base64,iVBORw0KGgo='

describe('businessCardArtifact — package truth, not mock truth', () => {
  it('rejects mock-only / empty rows', () => {
    expect(isProducedBusinessCardArtifact(null)).toBe(false)
    expect(isProducedBusinessCardArtifact({})).toBe(false)
    expect(
      isProducedBusinessCardArtifact({
        deliverable: 'businessCard',
        group: 'application',
        dataUrl: '',
      })
    ).toBe(false)
    expect(
      isProducedBusinessCardArtifact({
        deliverable: 'businessCard',
        group: 'application',
        dataUrl: PDF,
        heldBack: 'tooLarge',
      })
    ).toBe(false)
  })

  it('accepts a real PDF package asset produced by the card path', () => {
    const row = {
      id: '1',
      deliverable: 'businessCard',
      group: 'application',
      dataUrl: PDF,
      rights: 'clientOwned',
      producedBy: PRODUCERS.businessCard,
      producedAt: '2026-08-12T09:00:00.000Z',
    }
    expect(isBusinessCardPackageAsset(row)).toBe(true)
    expect(isProducedBusinessCardArtifact(row)).toBe(true)
    expect(findProducedBusinessCard([row])?.id).toBe('1')
    expect(projectHasProducedBusinessCard({ packageAssets: [row] })).toBe(true)
  })

  /* This case used to be the one above, minus the stamp — attribution and a
     PDF were treated as proof of a production run. They are what a designer's
     own export carries after they answer the panel's "which item is this?",
     so the app announced production of a file it never made. The row is still
     the client's business card; it is not this app's output. */
  it('an attributed upload is package material but not produced output', () => {
    const row = {
      id: '1',
      deliverable: 'businessCard',
      group: 'application',
      dataUrl: PDF,
      rights: 'clientOwned',
    }
    expect(isBusinessCardPackageAsset(row)).toBe(true)
    expect(isProducedBusinessCardArtifact(row)).toBe(false)
    expect(findProducedBusinessCard([row])).toBe(null)
    expect(projectHasProducedBusinessCard({ packageAssets: [row] })).toBe(false)
  })

  it('does not treat an unattributed file as the business card', () => {
    expect(
      isProducedBusinessCardArtifact({
        group: 'application',
        dataUrl: PDF,
        deliverable: '',
      })
    ).toBe(false)
  })

  it('names the package row without claiming the mock is finished', () => {
    expect(businessCardAssetName({ orgName: 'Harbor', contactName: 'Alex' })).toBe(
      'Harbor · Alex · business card'
    )
    expect(businessCardAssetName({ orgName: 'Harbor' })).toBe(
      'Harbor · business card'
    )
  })

  it('image dataUrl with deliverable is filed but not the PDF production path', () => {
    const row = {
      deliverable: 'businessCard',
      group: 'application',
      dataUrl: PNG,
    }
    expect(isBusinessCardPackageAsset(row)).toBe(true)
    expect(isProducedBusinessCardArtifact(row)).toBe(false)
  })
})
