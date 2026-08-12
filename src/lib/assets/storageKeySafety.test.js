import { describe, expect, it } from 'vitest'
import { assetStorageKey, extensionForMime, ALLOWED_MIME_TYPES } from './assetLibrary.js'

/**
 * THE STORAGE NAMESPACE IS DETERMINED BY IDENTITY, AND BY NOTHING ELSE.
 *
 * `owner/<project>/<asset-id>.<ext>` is not a formatting preference. Every
 * policy on the private `brand-assets` bucket authorises by
 * `(storage.foldername(name))[1] = auth.uid()`, so the first segment IS the
 * authorization decision. A value that can introduce a separator can introduce
 * a folder, and a key that resolves somewhere other than where it reads is the
 * whole class of bug this file exists to make unreachable.
 *
 * The fix is an allowlist on each segment, not a scrub. Scrubbing invents a key
 * nobody asked for: two distinct inputs can normalise onto one object, so one
 * asset silently overwrites another and the caller is told it succeeded.
 * Refusing is the only answer that cannot lose a file it claimed to store.
 *
 * These cases are written as a battery rather than a sample because the
 * failure mode is "somebody thought of an encoding we did not". If a new one
 * is thought of, it belongs here, and it should already pass.
 */

const OWNER = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const PROJECT = '22222222-2222-4222-8222-222222222222'
const ASSET = '11111111-1111-4111-8111-111111111111'

const key = (over = {}) =>
  assetStorageKey({
    ownerId: OWNER,
    projectId: PROJECT,
    assetId: ASSET,
    mimeType: 'image/png',
    ...over,
  })

describe('a well-formed key', () => {
  it('is owner, project, asset id, extension — in that order', () => {
    expect(key()).toBe(`${OWNER}/${PROJECT}/${ASSET}.png`)
  })

  it('puts the owner first, which is the segment the policies read', () => {
    expect(key().split('/')[0]).toBe(OWNER)
  })

  it('has exactly three segments, so no input can add a folder', () => {
    expect(key().split('/')).toHaveLength(3)
  })

  it('accepts the local ingest id shape as well as a uuid', () => {
    /* `ingestFiles` mints `a-<stamp>-<index>-<slug>`. It must keep working —
       an allowlist that rejected legitimate ids would be a different bug. */
    expect(key({ assetId: 'a-1754000000000-0-client-logo-png' })).toContain(
      'a-1754000000000-0-client-logo-png.png'
    )
  })

  it('accepts the brief-adoption fallback id shape', () => {
    expect(key({ assetId: 'brief-1754000000000-k3f9a2' })).toContain(
      'brief-1754000000000-k3f9a2.png'
    )
  })
})

describe('the original filename never reaches the key', () => {
  it('contributes no characters at all — only the mime map does', () => {
    /* A file called `../../../etc/passwd.png` is stored under its asset id
       like every other PNG. The name lives in the row, not in the path. */
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(key({ mimeType: mime })).toBe(`${OWNER}/${PROJECT}/${ASSET}.${extensionForMime(mime)}`)
    }
  })

  it('falls back to a bare extension for an unknown type rather than echoing it', () => {
    expect(key({ mimeType: 'application/x-msdownload' })).toBe(`${OWNER}/${PROJECT}/${ASSET}.bin`)
    expect(key({ mimeType: '../../evil' })).toBe(`${OWNER}/${PROJECT}/${ASSET}.bin`)
    expect(key({ mimeType: 'image/png; charset=../..' })).toBe(`${OWNER}/${PROJECT}/${ASSET}.bin`)
  })
})

describe('a segment that is not a bare identifier is refused', () => {
  /* Each hostile value is tried in EVERY position. The owner segment is the
     authorization one, but a project or asset segment that escapes still
     writes outside the namespace the row claims. */
  const HOSTILE = {
    'parent traversal': '..',
    'traversal with a name': '../other',
    'traversal deeper in': 'a/../../b',
    'trailing traversal': 'project/..',
    'current directory': '.',
    'dot-prefixed': '.hidden',
    'forward slash': 'a/b',
    'leading slash (absolute)': '/etc/passwd',
    'absolute windows path': 'C:\\\\Windows',
    backslash: 'a\\\\b',
    'double separator': 'a//b',
    'percent-encoded traversal': '%2e%2e%2f',
    'double-encoded traversal': '%252e%252e',
    'url-encoded slash': 'a%2Fb',
    'unicode letters': 'projeto-café',
    'unicode fullwidth solidus': 'a／b',
    'right-to-left override': 'a\\u202Eb',
    'null byte': 'a\\u0000b',
    newline: 'a\\nb',
    tab: 'a\\tb',
    space: 'a b',
    'leading hyphen': '-leading',
    'leading underscore': '_leading',
    empty: '',
    whitespace: '   ',
    'dot segment with extension': 'a.png',
  }

  for (const [name, value] of Object.entries(HOSTILE)) {
    it(`refuses ${name} as the owner`, () => {
      expect(key({ ownerId: value })).toBeNull()
    })
    it(`refuses ${name} as the project`, () => {
      expect(key({ projectId: value })).toBeNull()
    })
    it(`refuses ${name} as the asset id`, () => {
      expect(key({ assetId: value })).toBeNull()
    })
  }
})

describe('a missing or non-string segment is refused', () => {
  for (const value of [undefined, null, 0, false, NaN, {}, [], () => {}]) {
    it(`refuses ${String(value)} in every position`, () => {
      expect(key({ ownerId: value })).toBeNull()
      expect(key({ projectId: value })).toBeNull()
      expect(key({ assetId: value })).toBeNull()
    })
  }

  it('refuses an entirely absent argument', () => {
    expect(assetStorageKey()).toBeNull()
    expect(assetStorageKey({})).toBeNull()
  })
})

describe('refusal is total, never partial', () => {
  it('never returns a key that escapes the owner folder', () => {
    /* The property, stated once over every case above: whatever comes back is
       either null or a three-segment key whose first segment is the owner and
       which contains no traversal. There is no third outcome. */
    const values = [
      OWNER, '..', '../x', '/abs', 'a/b', 'a\\\\b', '%2e%2e', 'café', '', '   ', '.hidden',
    ]
    for (const owner of values) {
      for (const project of values) {
        const result = assetStorageKey({
          ownerId: owner,
          projectId: project,
          assetId: ASSET,
          mimeType: 'image/png',
        })
        if (result === null) continue
        const parts = result.split('/')
        expect(parts).toHaveLength(3)
        expect(parts[0]).toBe(OWNER)
        expect(parts).not.toContain('..')
        expect(parts).not.toContain('.')
        expect(result).not.toMatch(/\\\\|%2e|%2f/i)
      }
    }
  })
})
