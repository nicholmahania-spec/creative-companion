import { describe, it, expect } from 'vitest'
import {
  IDENTITY_SUBSTEPS,
  resolveIdentitySubstep,
  nextIdentitySubstep,
  prevIdentitySubstep,
} from './identitySubsteps'

describe('identitySubsteps', () => {
  it('resolves known ids and deep-link aliases', () => {
    expect(resolveIdentitySubstep('colors')).toBe('colors')
    expect(resolveIdentitySubstep('voice')).toBe('essentials')
    expect(resolveIdentitySubstep('messaging')).toBe('essentials')
    expect(resolveIdentitySubstep('pins')).toBe('preview')
    expect(resolveIdentitySubstep('nope')).toBe('logo')
    expect(resolveIdentitySubstep(null)).toBe('logo')
  })

  it('walks Mark → … → Preview then null', () => {
    expect(nextIdentitySubstep('logo')?.id).toBe('essentials')
    expect(nextIdentitySubstep('logo')?.label).toBe('Words')
    expect(nextIdentitySubstep('essentials')?.label).toBe('Colour')
    expect(nextIdentitySubstep('preview')).toBe(null)
    expect(prevIdentitySubstep('logo')).toBe(null)
    expect(prevIdentitySubstep('type')?.id).toBe('colors')
  })

  it('lists five screens in path-rebuild order', () => {
    expect(IDENTITY_SUBSTEPS.map((s) => s.id)).toEqual([
      'logo',
      'essentials',
      'colors',
      'type',
      'preview',
    ])
  })
})
