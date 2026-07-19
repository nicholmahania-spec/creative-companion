import { describe, expect, it } from 'vitest'
import { pinFaceStyle, pinVisualKind, pinFaceCssText } from './moodPins'

describe('mood pin visuals', () => {
  it('treats data-URL and http images as image kind', () => {
    expect(pinVisualKind({ type: 'image', visual: 'data:image/png;base64,xx' })).toBe(
      'image'
    )
    expect(pinVisualKind({ type: 'image', visual: 'https://example.com/a.jpg' })).toBe(
      'image'
    )
  })

  it('paints gradients with backgroundImage, not backgroundColor', () => {
    const pin = {
      type: 'quote',
      visual: 'linear-gradient(135deg, #4F46E5, #0D9488)',
      note: 'Quiet booth',
    }
    expect(pinVisualKind(pin)).toBe('gradient')
    const style = pinFaceStyle(pin)
    expect(style.backgroundImage).toContain('linear-gradient')
    expect(style.backgroundColor).toBeTruthy()
    const css = pinFaceCssText(pin)
    expect(css).toContain('background-image:linear-gradient')
  })

  it('paints solid hex colors with backgroundColor', () => {
    const style = pinFaceStyle({ type: 'quote', visual: '#4F46E5' })
    expect(style.backgroundColor).toBe('#4F46E5')
    expect(style.backgroundImage).toBeUndefined()
  })
})
