import { describe, expect, it } from 'vitest'
import { validateBoardUrl } from './safeBoardUrl'

describe('validateBoardUrl', () => {
  it('accepts public https URLs', () => {
    const r = validateBoardUrl('https://example.com/mood')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.url).toMatch(/^https:\/\/example\.com/)
  })

  it('rejects private and local hosts', () => {
    expect(validateBoardUrl('http://127.0.0.1/x').ok).toBe(false)
    expect(validateBoardUrl('http://192.168.1.1/').ok).toBe(false)
    expect(validateBoardUrl('http://10.0.0.5/a').ok).toBe(false)
    expect(validateBoardUrl('http://localhost/secret').ok).toBe(false)
    expect(validateBoardUrl('http://[::1]/').ok).toBe(false)
  })

  it('rejects non-http schemes', () => {
    expect(validateBoardUrl('javascript:alert(1)').ok).toBe(false)
    expect(validateBoardUrl('file:///etc/passwd').ok).toBe(false)
  })
})
