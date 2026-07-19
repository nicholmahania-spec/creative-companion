import { describe, expect, it } from 'vitest'
import { normalizeLocale, t, pathLabel, LOCALES, getMessages } from './i18n'

describe('i18n wordmark + path', () => {
  it('normalizes unknown locales to en', () => {
    expect(normalizeLocale('xx')).toBe('en')
    expect(normalizeLocale('ES')).toBe('es')
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
  })

  it('english tagline is stable', () => {
    expect(getMessages('en').tagline).toMatch(/ADHD/i)
  })
})
