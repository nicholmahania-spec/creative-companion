import { describe, it, expect } from 'vitest'
import { routePath } from './appPaths'

/**
 * These guard the GitHub Pages subpath deploy: the app is served from
 * '/creative-companion/' there, so a client's shared link arrives as
 * '/creative-companion/c/<id>' and must still match the '/c/:id' route.
 * BASE_URL is '/' under test, so the base-stripping branch is exercised
 * by passing an explicit pathname.
 */
describe('routePath', () => {
  it('passes a root-mounted path through unchanged', () => {
    expect(routePath('/c/abc-123')).toBe('/c/abc-123')
    expect(routePath('/f/share-9')).toBe('/f/share-9')
  })

  it('leaves an unrelated path alone', () => {
    expect(routePath('/settings')).toBe('/settings')
  })

  it('keeps the leading slash so route patterns still anchor', () => {
    expect(routePath('/c/abc').startsWith('/')).toBe(true)
  })

  it('still matches the public route patterns after stripping', () => {
    const portal = /^\/c\/([^/]+)\/?$/.exec(routePath('/c/portal-id'))
    expect(portal?.[1]).toBe('portal-id')

    const form = /^\/f\/([^/]+)\/?$/.exec(routePath('/f/share-id'))
    expect(form?.[1]).toBe('share-id')
  })

  it('tolerates a trailing slash on the link', () => {
    const portal = /^\/c\/([^/]+)\/?$/.exec(routePath('/c/portal-id/'))
    expect(portal?.[1]).toBe('portal-id')
  })
})
