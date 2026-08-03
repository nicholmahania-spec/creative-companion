import { describe, expect, it } from 'vitest'
import { resolveBrandColors } from './brandCssVars'

describe('resolveBrandColors', () => {
  it('maps palette + roles to primary/accent/ink/paper', () => {
    const c = resolveBrandColors({
      palette: ['#111111', '#00AA88', '#222222', '#FEFEFE'],
      colorRoles: {
        cover: '#111111',
        accent: '#00AA88',
        text: '#222222',
        quiet: '#FEFEFE',
      },
    })
    expect(c.primary).toBe('#111111')
    expect(c.accent).toBe('#00AA88')
    expect(c.ink).toBe('#222222')
    expect(c.paper).toBe('#FEFEFE')
  })

  it('falls back when palette is empty', () => {
    const c = resolveBrandColors({})
    expect(c.primary).toMatch(/^#/)
    expect(c.paper).toMatch(/^#/)
  })
})
