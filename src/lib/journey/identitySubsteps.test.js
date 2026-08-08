import { describe, it, expect } from 'vitest'
import {
  IDENTITY_SUBSTEPS,
  resolveIdentitySubstep,
  nextIdentitySubstep,
  prevIdentitySubstep,
  isArtboardDeepLink,
} from './identitySubsteps'

/**
 * These assertions changed on purpose (2026-08-08). The old ones pinned
 * Mark → Words → Colour → Type → Preview, which encoded the defect rather
 * than a requirement: Words was ten inputs and no tools, and Preview made
 * looking at your own work a place you had to navigate to. Both are gone; the
 * artboard is on every screen and the words are edited on it.
 */
describe('identitySubsteps', () => {
  it('lists the four screens that are actually tools', () => {
    expect(IDENTITY_SUBSTEPS.map((s) => s.id)).toEqual([
      'logo',
      'colors',
      'type',
      'handover',
    ])
  })

  it('labels them in American English', () => {
    expect(IDENTITY_SUBSTEPS.map((s) => s.label)).toEqual([
      'Mark',
      'Color',
      'Type',
      'Handover',
    ])
  })

  it('resolves known ids', () => {
    expect(resolveIdentitySubstep('colors')).toBe('colors')
    expect(resolveIdentitySubstep('handover')).toBe('handover')
    expect(resolveIdentitySubstep('nope')).toBe('logo')
    expect(resolveIdentitySubstep(null)).toBe('logo')
  })

  /**
   * The whole point of keeping the map. A readiness card saying "add your
   * voice" must land somewhere real; a pointer that silently degrades to the
   * default screen teaches the user that resume cannot be trusted, which is
   * the one affordance that gets them back into work after a gap.
   */
  it('lands every retired section id on a screen that exists', () => {
    const retired = [
      'essentials',
      'words',
      'voice',
      'messaging',
      'tagline',
      'positioning',
      'pins',
      'preview',
      'imagery',
      'stationery',
      'writing',
      'print',
    ]
    const ids = IDENTITY_SUBSTEPS.map((s) => s.id)
    for (const id of retired) {
      expect(ids, `${id} resolved off the map`).toContain(
        resolveIdentitySubstep(id)
      )
    }
  })

  it('sends the word deep links to the artboard and the rest to a panel', () => {
    // The words live on the sheet now, so highlighting a tool panel for them
    // would draw attention to something that no longer contains them.
    expect(isArtboardDeepLink('voice')).toBe(true)
    expect(isArtboardDeepLink('messaging')).toBe(true)
    expect(isArtboardDeepLink('essentials')).toBe(true)
    expect(isArtboardDeepLink('preview')).toBe(true)
    expect(isArtboardDeepLink('imagery')).toBe(false)
    expect(isArtboardDeepLink('colors')).toBe(false)
    expect(isArtboardDeepLink('logo')).toBe(false)
  })

  it('walks Mark → Color → Type → Handover then null', () => {
    expect(nextIdentitySubstep('logo')?.id).toBe('colors')
    expect(nextIdentitySubstep('logo')?.label).toBe('Color')
    expect(nextIdentitySubstep('colors')?.id).toBe('type')
    expect(nextIdentitySubstep('type')?.id).toBe('handover')
    expect(nextIdentitySubstep('handover')).toBe(null)
    expect(prevIdentitySubstep('logo')).toBe(null)
    expect(prevIdentitySubstep('type')?.id).toBe('colors')
    expect(prevIdentitySubstep('handover')?.id).toBe('type')
  })
})
