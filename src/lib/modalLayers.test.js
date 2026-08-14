import { describe, it, expect, beforeEach } from 'vitest'
import {
  hasOpenModalLayer,
  isTopModalLayer,
  pushModalLayer,
  resetModalLayers,
} from './modalLayers.js'

/**
 * The registry that decides which handler acts on Escape.
 *
 * These are cheap, and one of them guards a failure with no symptom: a leaked
 * layer makes `hasOpenModalLayer()` permanently true, after which the stage
 * silently stops answering Escape for the rest of the session. Nothing throws,
 * nothing logs, and the only way to notice is to press Escape and have nothing
 * happen — which reads as a dead key, not as a bug in a registry.
 */
describe('modalLayers', () => {
  beforeEach(() => resetModalLayers())

  it('says nothing is open when nothing is open', () => {
    expect(hasOpenModalLayer()).toBe(false)
    expect(isTopModalLayer({})).toBe(false)
  })

  it('gives the top to the layer that opened last', () => {
    const outer = {}
    const inner = {}
    pushModalLayer(outer)
    expect(isTopModalLayer(outer)).toBe(true)

    pushModalLayer(inner)
    expect(isTopModalLayer(inner)).toBe(true)
    expect(isTopModalLayer(outer)).toBe(false)
  })

  it('hands the top back when the inner one closes', () => {
    const outer = {}
    const inner = {}
    pushModalLayer(outer)
    const popInner = pushModalLayer(inner)
    popInner()
    expect(isTopModalLayer(outer)).toBe(true)
    expect(hasOpenModalLayer()).toBe(true)
  })

  it('survives an out-of-order close', () => {
    /* React does not promise that two modals closing in the same commit
       unmount in reverse mount order. A `pop` would have removed the wrong
       token here and left one registered forever. */
    const outer = {}
    const inner = {}
    const popOuter = pushModalLayer(outer)
    pushModalLayer(inner)

    popOuter()
    expect(isTopModalLayer(inner)).toBe(true)
    expect(hasOpenModalLayer()).toBe(true)
  })

  it('is empty again once every layer has closed', () => {
    const popA = pushModalLayer({})
    const popB = pushModalLayer({})
    popB()
    popA()
    expect(hasOpenModalLayer()).toBe(false)
  })

  it('ignores a second pop rather than removing a stranger', () => {
    const a = {}
    const b = {}
    const popA = pushModalLayer(a)
    popA()
    popA()
    pushModalLayer(b)
    expect(isTopModalLayer(b)).toBe(true)
    expect(hasOpenModalLayer()).toBe(true)
  })

  it('keeps both entries when one token is pushed twice', () => {
    /* Two mounts of the same dialog component can share a token identity if
       a caller ever reuses one. Popping once must leave the other standing. */
    const token = {}
    const popFirst = pushModalLayer(token)
    pushModalLayer(token)
    popFirst()
    expect(hasOpenModalLayer()).toBe(true)
    expect(isTopModalLayer(token)).toBe(true)
  })
})
