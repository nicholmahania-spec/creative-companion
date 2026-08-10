import { describe, it, expect } from 'vitest'
import {
  isBusinessCardPackageAsset,
  isProducedBusinessCardArtifact,
  findProducedBusinessCard,
  projectHasProducedBusinessCard,
  businessCardAssetName,
} from './businessCardArtifact.js'

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

  it('accepts a real PDF package asset attributed as businessCard', () => {
    const row = {
      id: '1',
      deliverable: 'businessCard',
      group: 'application',
      dataUrl: PDF,
      rights: 'clientOwned',
    }
    expect(isBusinessCardPackageAsset(row)).toBe(true)
    expect(isProducedBusinessCardArtifact(row)).toBe(true)
    expect(findProducedBusinessCard([row])?.id).toBe('1')
    expect(projectHasProducedBusinessCard({ packageAssets: [row] })).toBe(true)
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
