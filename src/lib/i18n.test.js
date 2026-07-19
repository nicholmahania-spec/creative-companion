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
    expect(pathLabel('en', 'work')).toBe('Work')
    expect(pathLabel('es', 'work')).toBe('Trabajo')
    expect(pathLabel('ja', 'pack')).toBe('パック')
    expect(pathLabel('ar', 'work')).toBe('عمل')
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
    expect(en.openPack).toMatch(/Pack/i)
    expect(en.emptyStepBody.length).toBeLessThan(80)
    expect(en.howDeskWorks).toMatch(/Board/)
  })
})
