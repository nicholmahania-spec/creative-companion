import { describe, expect, it } from 'vitest'
import { familyFromSampleLabel } from '../../lib/brand/identityColourDraft'

describe('familyFromSampleLabel', () => {
  it('strips weight words for specimen font-family', () => {
    expect(familyFromSampleLabel('Fraunces Bold')).toBe('Fraunces')
    expect(familyFromSampleLabel('Plus Jakarta Sans Regular')).toBe(
      'Plus Jakarta Sans'
    )
  })

  it('returns empty for blank', () => {
    expect(familyFromSampleLabel('')).toBe('')
    expect(familyFromSampleLabel(null)).toBe('')
  })
})
