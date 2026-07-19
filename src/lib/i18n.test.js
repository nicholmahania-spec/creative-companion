import { describe, expect, it } from 'vitest'
import {
  normalizeLocale,
  t,
  pathLabel,
  LOCALES,
  getMessages,
  localeDir,
  isRtl,
} from './i18n'

describe('i18n wordmark + path + catalog', () => {
  it('normalizes unknown locales to en', () => {
    expect(normalizeLocale('xx')).toBe('en')
    expect(normalizeLocale('ES')).toBe('es')
    expect(normalizeLocale('ar')).toBe('ar')
  })

  it('has product names for all locales', () => {
    for (const L of LOCALES) {
      const name = t(L.id, 'productName')
      expect(name.length).toBeGreaterThan(2)
      expect(name).not.toBe('productName')
    }
  })

  it('localizes path labels', () => {
    expect(pathLabel('en', 'sketch')).toBe('Sketch')
    expect(pathLabel('en', 'define')).toBe('Define')
    expect(pathLabel('en', 'deliver')).toBe('Deliver')
    // legacy aliases still resolve
    expect(pathLabel('en', 'work')).toBe('Sketch')
    expect(pathLabel('es', 'work')).toBeTruthy()
    expect(pathLabel('ja', 'pack')).toBeTruthy()
    expect(pathLabel('ar', 'work')).toBeTruthy()
  })

  it('english tagline is stable', () => {
    expect(getMessages('en').tagline).toMatch(/ADHD/i)
  })

  it('falls back to English for missing nested keys', () => {
    // fr may not override every ui key
    expect(t('fr', 'ui.completeStep')).toBeTruthy()
    expect(t('en', 'ui.completeStep')).toBe('Complete step')
  })

  it('every locale has ui.completeStep via fallback', () => {
    for (const L of LOCALES) {
      const s = t(L.id, 'ui.completeStep')
      expect(String(s).length).toBeGreaterThan(2)
    }
  })

  it('marks Arabic as RTL', () => {
    expect(localeDir('ar')).toBe('rtl')
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('en')).toBe(false)
  })

  it('pack copy is honest about vector PDF vs print', () => {
    const en = getMessages('en').ui
    expect(en.packSub).toMatch(/vector PDF/i)
    expect(en.packHint).toMatch(/vector PDF/i)
    expect(en.openPack).toMatch(/Deliver/i)
    expect(en.openWork).toMatch(/Research/i)
    expect(en.openReview).toMatch(/Review/i)
    expect(en.goToSystem).toMatch(/Design/i)
    expect(en.emptyStepBody.length).toBeLessThan(80)
    expect(en.howDeskWorks).toMatch(/Define/)
    expect(en.howDeskWorks).toMatch(/Ideate/)
    expect(en.howDeskWorks).toMatch(/Deliver/)
  })

  it('locales override thin-pack and confirm chrome', () => {
    for (const id of ['es', 'fr', 'de', 'pt', 'ja', 'ar']) {
      const ui = getMessages(id).ui
      expect(ui.thinPackBanner).toBeTruthy()
      expect(ui.cancel).toBeTruthy()
      expect(ui.continuePrint || ui.continue).toBeTruthy()
      // not English raw for cancel when locale has override
      if (id === 'es') expect(ui.cancel).toBe('Cancelar')
      if (id === 'ar') expect(ui.openPack).toMatch(/تسليم/)
    }
  })
})
