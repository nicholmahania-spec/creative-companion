import { describe, expect, it } from 'vitest'
import { useModalFocus } from './useModalFocus'

describe('useModalFocus', () => {
  it('exports a hook function', () => {
    expect(typeof useModalFocus).toBe('function')
  })
})
