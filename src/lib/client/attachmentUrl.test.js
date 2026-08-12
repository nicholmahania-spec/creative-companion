import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as attachmentUrl from './attachmentUrl'
import {
  allAttachments,
  attachmentKey,
  attachmentObjectName,
  clientUploadObjectName,
  isTrustedClientAttachment,
  trustedAttachments,
} from './attachmentUrl'

/**
 * The trust boundary for a client-supplied brief attachment.
 *
 * These are the cases the security audit (P2-1) said had to hold. Each one is
 * a thing a link holder can actually post to `submit_client_portal_form`,
 * because that RPC takes a JSON document the client composes — `${id}Files`
 * entries are not produced by the upload helper on the way in, they are
 * whatever the submitter wrote.
 *
 * The database half (folder must equal the target, object must exist in
 * storage) is asserted separately in clientAttachmentSql.test.js — SQL cannot
 * be executed here. This file covers the half that runs in the browser: what
 * may be dereferenced.
 */

const HOST = 'https://shzkqbtoepqqdkjgupry.supabase.co'
const PORTAL = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const OBJECT = `${PORTAL}/1754870000000-123456.png`
const GOOD_URL = `${HOST}/storage/v1/object/public/client-uploads/${OBJECT}`

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', HOST)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('clientUploadObjectName', () => {
  it('reads the object key out of a real client-uploads public URL', () => {
    expect(clientUploadObjectName(GOOD_URL)).toBe(OBJECT)
  })

  it('rejects an identical path served from somebody else’s host', () => {
    /* The whole reason this check cannot live in Postgres: the object name is
       byte-identical, so only something that knows OUR origin can tell these
       apart. */
    const evil = `https://evil.test/storage/v1/object/public/client-uploads/${OBJECT}`
    expect(clientUploadObjectName(evil)).toBeNull()
  })

  it('rejects a look-alike host that merely ends with ours', () => {
    const evil = `https://shzkqbtoepqqdkjgupry.supabase.co.attacker.test/storage/v1/object/public/client-uploads/${OBJECT}`
    expect(clientUploadObjectName(evil)).toBeNull()
  })

  it('rejects another bucket on our own host', () => {
    const other = `${HOST}/storage/v1/object/public/workspace-images/${OBJECT}`
    expect(clientUploadObjectName(other)).toBeNull()
  })

  it('rejects a signed-URL path shape, which is not what we serve here', () => {
    const signed = `${HOST}/storage/v1/object/sign/client-uploads/${OBJECT}`
    expect(clientUploadObjectName(signed)).toBeNull()
  })

  it('ignores query and fragment so one object has one spelling', () => {
    expect(clientUploadObjectName(`${GOOD_URL}?width=40`)).toBe(OBJECT)
    expect(clientUploadObjectName(`${GOOD_URL}#x`)).toBe(OBJECT)
  })

  it('rejects a key with an empty or dot segment', () => {
    const base = `${HOST}/storage/v1/object/public/client-uploads/`
    expect(clientUploadObjectName(`${base}${PORTAL}//x.png`)).toBeNull()
    expect(clientUploadObjectName(`${base}${PORTAL}/../${OTHER}/x.png`)).toBeNull()
    expect(clientUploadObjectName(`${base}${PORTAL}/./x.png`)).toBeNull()
  })

  it('rejects a bare folder with no file', () => {
    expect(
      clientUploadObjectName(
        `${HOST}/storage/v1/object/public/client-uploads/${PORTAL}`
      )
    ).toBeNull()
  })

  it('rejects junk that is not a URL at all', () => {
    for (const junk of ['', null, undefined, 'not a url', '/relative/path.png']) {
      expect(clientUploadObjectName(junk)).toBeNull()
    }
  })

  it('rejects javascript: and data: URLs outright', () => {
    expect(clientUploadObjectName('javascript:alert(1)')).toBeNull()
    expect(clientUploadObjectName('data:image/svg+xml;base64,AAAA')).toBeNull()
  })

  it('trusts nothing when the app has no Supabase project configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    expect(clientUploadObjectName(GOOD_URL)).toBeNull()
  })
})

describe('attachmentObjectName — target scoping', () => {
  it('accepts an upload in the target’s own folder', () => {
    expect(attachmentObjectName({ url: GOOD_URL }, PORTAL)).toBe(OBJECT)
  })

  it('refuses another project’s object', () => {
    /* The cross-tenant case. The URL is well-formed, on the right host, in the
       right bucket, and points at a real folder — it just is not this
       portal's. */
    expect(attachmentObjectName({ url: GOOD_URL }, OTHER)).toBeNull()
  })

  it('refuses a folder that is not a share or portal id at all', () => {
    const odd = `${HOST}/storage/v1/object/public/client-uploads/etc/passwd.png`
    expect(attachmentObjectName({ url: odd })).toBeNull()
  })

  it('accepts without a target, for screens that cannot know one', () => {
    expect(attachmentObjectName({ url: GOOD_URL })).toBe(OBJECT)
  })
})

describe('attachmentObjectName — path beats url', () => {
  it('uses the database-stamped path and ignores a hostile url beside it', () => {
    /* This is the shape a sanitised row has after migration 20260812120000:
       `path` carries the proof, `url` survives only as an identity key. Even
       if the stored url were rewritten to point somewhere else, nothing may
       follow it. */
    const row = {
      name: 'moodboard.png',
      url: 'https://evil.test/steal.png',
      path: OBJECT,
    }
    expect(attachmentObjectName(row, PORTAL)).toBe(OBJECT)
  })

  it('still applies target scoping to a stamped path', () => {
    const row = { path: `${OTHER}/1754870000000-1.png` }
    expect(attachmentObjectName(row, PORTAL)).toBeNull()
  })

  it('refuses a stamped path with dot segments', () => {
    const row = { path: `${PORTAL}/../${OTHER}/x.png` }
    expect(attachmentObjectName(row, PORTAL)).toBeNull()
  })
})

describe('no public-URL builder survives', () => {
  it('exports nothing that turns an entry into a fetchable URL', () => {
    /* P2-2 contract. `client-uploads` is private, so a module-level helper
       that produced `…/object/public/client-uploads/…` would return a URL that
       404s in every honest case and only works in one where the bucket has
       been quietly made public again. Reads go through attachmentAccess, which
       signs. This asserts the shape of the module, not a string in it. */
    expect(attachmentUrl.attachmentSrc).toBeUndefined()
    const exported = Object.keys(attachmentUrl).sort()
    expect(exported).toEqual([
      'CLIENT_UPLOAD_BUCKET',
      'allAttachments',
      'attachmentKey',
      'attachmentObjectName',
      'clientUploadFolder',
      'clientUploadObjectName',
      'isTrustedClientAttachment',
      'trustedAttachments',
    ])
  })

  it('still reads the raw key rather than the URL-normalised one', () => {
    /* Regression guard for a real bug in the first version of this module: it
       parsed with `new URL` and read `.pathname`, which had already collapsed
       `<portal>/../<other>` down to `<other>`. The folder check then compared
       against a folder nobody wrote, and — worse — the app and Postgres were
       reading two different keys out of one string. */
    const dotted = `${HOST}/storage/v1/object/public/client-uploads/${PORTAL}/../${OTHER}/x.png`
    expect(clientUploadObjectName(dotted)).toBeNull()
    expect(attachmentObjectName({ url: dotted })).toBeNull()
    expect(attachmentObjectName({ url: dotted }, OTHER)).toBeNull()
  })

  it('keeps an already-encoded key intact', () => {
    /* The key is stored in URL form on both sides, so `%20` must survive as
       `%20` all the way to the signer. Decoding it would produce a key that
       does not match `storage.objects.name`. */
    const encoded = `${PORTAL}/my%20photo.png`
    expect(attachmentObjectName({ path: encoded }, PORTAL)).toBe(encoded)
  })
})

describe('allAttachments', () => {
  it('flattens every Files array so one hook can resolve a whole screen', () => {
    const doc = {
      goal: 'text, not a file',
      inspirationLinksFiles: [{ name: 'a', url: GOOD_URL }],
      existingAssetsFiles: [{ name: 'b', path: `${PORTAL}/b.png` }],
      deliverablesPicked: ['logo', 'cards'],
    }
    expect(allAttachments(doc).map((f) => f.name)).toEqual(['a', 'b'])
  })

  it('ignores checklist arrays, which are option ids and not attachments', () => {
    /* The exact confusion that once rendered `<a href={undefined}><img
       src={undefined}>` for "What do you need made?" — see the note in
       ProjectOverviewShare. */
    expect(allAttachments({ deliverablesPicked: ['logo'] })).toEqual([])
    expect(allAttachments({ brandSurfacesFiles: ['not-an-object'] })).toEqual([])
  })

  it('survives junk without throwing', () => {
    expect(allAttachments(null)).toEqual([])
    expect(allAttachments('nope')).toEqual([])
  })
})

describe('trustedAttachments', () => {
  it('keeps the legitimate entries and drops the rest', () => {
    const files = [
      { name: 'ok', url: GOOD_URL },
      { name: 'foreign host', url: `https://evil.test/storage/v1/object/public/client-uploads/${OBJECT}` },
      { name: 'other project', url: `${HOST}/storage/v1/object/public/client-uploads/${OTHER}/1-2.png` },
      { name: 'nonsense', url: 'javascript:alert(1)' },
    ]
    const kept = trustedAttachments(files, PORTAL)
    expect(kept).toHaveLength(1)
    expect(kept[0].name).toBe('ok')
  })

  it('survives a non-array without throwing', () => {
    expect(trustedAttachments(null, PORTAL)).toEqual([])
    expect(trustedAttachments('nope', PORTAL)).toEqual([])
  })
})

describe('attachmentKey', () => {
  it('stays stable for an untrusted entry so it can still be listed and removed', () => {
    /* Identity must not depend on trust: a rejected attachment the designer
       can neither see nor delete is worse than one shown as rejected. */
    const bad = { name: 'x', url: 'https://evil.test/x.png' }
    expect(attachmentKey(bad)).toBe('https://evil.test/x.png')
    expect(isTrustedClientAttachment(bad, PORTAL)).toBe(false)
  })

  it('prefers the verified path when there is one', () => {
    expect(attachmentKey({ url: GOOD_URL, path: OBJECT })).toBe(OBJECT)
  })
})
