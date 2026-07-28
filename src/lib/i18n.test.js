import { describe, expect, it } from 'vitest'
import {
  normalizeLocale,
  t,
  pathLabel,
  pathFillHint,
  tFormat,
  LOCALES,
  getMessages,
  localeDir,
  isRtl,
} from './i18n'

describe('i18n wordmark + path + catalog', () => {
  it('normalizes every unshipped locale to en', () => {
    /* Only `en` ships. A user whose stored pref is 'es' from before the other
       catalogues were cut must land on correct English, not on a missing
       catalogue. */
    expect(normalizeLocale('xx')).toBe('en')
    expect(normalizeLocale('ES')).toBe('en')
    expect(normalizeLocale('ar')).toBe('en')
    expect(normalizeLocale(undefined)).toBe('en')
  })

  it('ships exactly the locales it has catalogues for', () => {
    for (const L of LOCALES) {
      expect(normalizeLocale(L.id)).toBe(L.id)
    }
  })

  it('has product names for all locales', () => {
    for (const L of LOCALES) {
      const name = t(L.id, 'productName')
      expect(name.length).toBeGreaterThan(2)
      expect(name).not.toBe('productName')
    }
  })

  it('localizes path labels (Wheeler process names)', () => {
    expect(pathLabel('en', 'research')).toBe('Research')
    expect(pathLabel('en', 'define')).toBe('Strategy')
    expect(pathLabel('en', 'design')).toBe('Identity')
    expect(pathLabel('en', 'sketch')).toBe('Touchpoints')
    expect(pathLabel('en', 'deliver')).toBe('Assets')
    // aliases
    expect(pathLabel('en', 'board')).toBe('Research')
    expect(pathLabel('en', 'work')).toBe('Touchpoints')
    expect(pathLabel('en', 'pack')).toBe('Assets')
    expect(pathLabel('es', 'work')).toBeTruthy()
    expect(pathLabel('ja', 'pack')).toBeTruthy()
    expect(pathLabel('ar', 'work')).toBeTruthy()
  })

  it('locales expose path labels for core step ids', () => {
    for (const id of ['es', 'fr', 'de', 'pt', 'ja', 'ar']) {
      const path = getMessages(id).path || {}
      if (path.define) expect(path.define.length).toBeGreaterThan(1)
    }
    expect(pathLabel('de', 'define')).toBeTruthy()
    expect(pathLabel('es', 'define')).toBeTruthy()
    expect(pathLabel('ja', 'deliver')).toBeTruthy()
  })

  it('english tagline is stable', () => {
    expect(getMessages('en').tagline).toMatch(/ADHD/i)
  })

  it('falls back to English for missing nested keys', () => {
    // fr may not override every ui key
    expect(t('fr', 'ui.completeStep')).toBeTruthy()
    expect(t('en', 'ui.completeStep')).toMatch(/step|done|complete/i)
  })

  it('every locale has ui.completeStep via fallback', () => {
    for (const L of LOCALES) {
      const s = t(L.id, 'ui.completeStep')
      expect(String(s).length).toBeGreaterThan(2)
    }
  })

  it('reports direction for shipped locales, and defaults to ltr', () => {
    /* The RTL machinery stays — Arabic was cut as a stale catalogue, not
       because right-to-left support was wrong. An unshipped id normalizes to
       en and so reports ltr rather than throwing. */
    expect(localeDir('en')).toBe('ltr')
    expect(isRtl('en')).toBe(false)
    expect(isRtl('ar')).toBe(false)
  })

  it('pathFillHint and strip templates resolve', () => {
    expect(pathFillHint('en', 'research')).toMatch(/star|pin|ref/i)
    expect(tFormat('en', 'ui.nextGapBtn', { label: 'Research' })).toBe(
      'Next empty · Research · G'
    )
    expect(t('en', 'ui.stillThin')).toMatch(/empty|thin/i)
  })

  it('pack copy is honest about brand book PDF vs print', () => {
    const en = getMessages('en').ui
    expect(en.packSub).toMatch(/brand book PDF|PDF/i)
    expect(en.packHint).toMatch(/brand book|pages/i)
    expect(en.packHint.length).toBeLessThan(120)
    expect(en.kitHint.length).toBeLessThan(80)
    expect(en.thinPack.length).toBeLessThan(80)
    expect(en.downloadVectorPdf).toMatch(/brand book|PDF/i)
    expect(en.openPack).toMatch(/Assets/i)
    expect(en.openWork).toMatch(/Research/i)
    expect(en.openSketch).toMatch(/Touchpoints/i)
    expect(en.openReview).toMatch(/Review/i)
    expect(en.continueNext).toMatch(/Next|Continue/)
    expect(en.pathMarkPackThin).toMatch(/client pack|tagline|★|star/i)
    expect(en.pathMarkPackThin.length).toBeLessThan(60)
    expect(en.pathFullLeaveBehindThin.length).toBeLessThan(50)
    expect(en.backToIdeate).toMatch(/Ideate/i)
    expect(tFormat('en', 'ui.continueNext', { label: 'Research' })).toBe(
      'Next · Research'
    )
    expect(tFormat('en', 'ui.openStepChip', { label: 'Star a pin' })).toBe(
      'Open · Star a pin'
    )
    expect(tFormat('en', 'ui.openStepChip', { label: 'x' })).not.toMatch(
      /Jumping/i
    )
    expect(en.goToSystem).toMatch(/Identity|Design/i)
    expect(en.emptyStepBody.length).toBeLessThan(80)
    expect(en.howDeskWorks).toMatch(/Strategy/)
    expect(en.howDeskWorks).toMatch(/Research/)
    expect(en.howDeskWorks).toMatch(/Assets/)
    expect(en.howDeskWorks).toMatch(/Ideate/)
  })

  it('every shipped locale has the thin-pack and confirm chrome', () => {
    /* Iterates LOCALES rather than a hand-written locale list, so this keeps
       testing whatever ships. The version that listed es/fr/de/pt/ja/ar
       asserted Spanish and Arabic strings directly, so removing those stale
       catalogues broke a test that was really checking the catalogues existed
       at all. */
    for (const L of LOCALES) {
      const ui = getMessages(L.id).ui
      expect(ui.thinPackBanner).toBeTruthy()
      expect(ui.cancel).toBeTruthy()
      expect(ui.continuePrint || ui.continue).toBeTruthy()
    }
  })

  it('falls back to English for an unshipped locale', () => {
    expect(getMessages('es').ui.cancel).toBe(getMessages('en').ui.cancel)
  })
})
