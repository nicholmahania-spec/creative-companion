import { describe, it, expect } from 'vitest'
import {
  isEmailSignaturePackageAsset,
  isProducedEmailSignatureArtifact,
  findProducedEmailSignature,
  projectHasProducedEmailSignature,
  emailSignatureAssetName,
} from './emailSignatureArtifact.js'
import { PRODUCERS } from './productionProvenance.js'

/* Minimal valid PNG data URL shape (header only for unit tests). */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const PDF = 'data:application/pdf;base64,JVBERi0='

describe('emailSignatureArtifact — package truth, not mock truth', () => {
  it('rejects mock-only / empty rows', () => {
    expect(isProducedEmailSignatureArtifact(null)).toBe(false)
    expect(isProducedEmailSignatureArtifact({})).toBe(false)
    expect(
      isProducedEmailSignatureArtifact({
        deliverable: 'emailSignature',
        group: 'application',
        dataUrl: '',
      })
    ).toBe(false)
    expect(
      isProducedEmailSignatureArtifact({
        deliverable: 'emailSignature',
        group: 'application',
        dataUrl: PNG,
        heldBack: 'tooLarge',
      })
    ).toBe(false)
  })

  it('accepts a real PNG package asset produced by the signature path', () => {
    const row = {
      id: '1',
      deliverable: 'emailSignature',
      group: 'application',
      dataUrl: PNG,
      rights: 'clientOwned',
      producedBy: PRODUCERS.emailSignature,
      producedAt: '2026-08-12T09:00:00.000Z',
    }
    expect(isEmailSignaturePackageAsset(row)).toBe(true)
    expect(isProducedEmailSignatureArtifact(row)).toBe(true)
    expect(findProducedEmailSignature([row])?.id).toBe('1')
    expect(projectHasProducedEmailSignature({ packageAssets: [row] })).toBe(true)
  })

  /* Same correction the business card carries: an unstamped row is the
     designer's own file, not a run this app performed. */
  it('an attributed upload is package material but not produced output', () => {
    const row = {
      id: '1',
      deliverable: 'emailSignature',
      group: 'application',
      dataUrl: PNG,
      rights: 'clientOwned',
    }
    expect(isEmailSignaturePackageAsset(row)).toBe(true)
    expect(isProducedEmailSignatureArtifact(row)).toBe(false)
    expect(projectHasProducedEmailSignature({ packageAssets: [row] })).toBe(false)
  })

  it('does not treat PDF or wrong deliverable as the email signature', () => {
    expect(
      isProducedEmailSignatureArtifact({
        group: 'application',
        dataUrl: PNG,
        deliverable: 'businessCard',
      })
    ).toBe(false)
    expect(
      isProducedEmailSignatureArtifact({
        group: 'application',
        dataUrl: PDF,
        deliverable: 'emailSignature',
      })
    ).toBe(false)
  })

  it('names the package row without claiming the mock is finished', () => {
    expect(
      emailSignatureAssetName({ orgName: 'Harbor', contactName: 'Alex' })
    ).toBe('Harbor · Alex · email signature')
    expect(emailSignatureAssetName({ orgName: 'Harbor' })).toBe(
      'Harbor · email signature'
    )
  })
})
