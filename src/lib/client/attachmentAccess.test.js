import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClientAttachmentAccess } from './attachmentAccess'

/**
 * The security contract of the signing path, now that `client-uploads` is
 * private (P2-2).
 *
 * The property that matters is not "does it return a URL" — it is **the signer
 * is never handed a key this app has not validated**. Signing runs as the
 * caller and the `client-uploads owner read` policy is the real authority, but
 * that policy only ever sees the key we give it. Handing it an unvalidated
 * string from a client-composed document would be asking the database to
 * authorise something we never checked, and it would only refuse if the key
 * happened to fall outside a folder the designer owns.
 *
 * So every case below asserts on `sign` calls, not just on the return value.
 */

const HOST = 'https://shzkqbtoepqqdkjgupry.supabase.co'
const PORTAL = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const OBJECT = `${PORTAL}/1754870000000-123456.png`
const GOOD_URL = `${HOST}/storage/v1/object/public/client-uploads/${OBJECT}`

/** A cache stand-in that records what it was asked to sign. */
function recordingCache(url = 'https://signed.example/token') {
  const asked = []
  return {
    asked,
    get: vi.fn(async (path) => {
      asked.push(path)
      return url
    }),
    forget: vi.fn(),
    clear: vi.fn(),
  }
}

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', HOST)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('what reaches the signer', () => {
  it('signs the validated object key for a genuine attachment', async () => {
    const cache = recordingCache()
    const access = createClientAttachmentAccess({}, { cache })
    await expect(access.url({ url: GOOD_URL }, PORTAL)).resolves.toBe(
      'https://signed.example/token'
    )
    expect(cache.asked).toEqual([OBJECT])
  })

  it('prefers the database-stamped path over the stored url', async () => {
    const cache = recordingCache()
    const access = createClientAttachmentAccess({}, { cache })
    await access.url(
      { url: 'https://evil.test/steal.png', path: OBJECT },
      PORTAL
    )
    expect(cache.asked).toEqual([OBJECT])
  })

  it('never signs a key from a foreign host', async () => {
    const cache = recordingCache()
    const access = createClientAttachmentAccess({}, { cache })
    const evil = `https://evil.test/storage/v1/object/public/client-uploads/${OBJECT}`
    await expect(access.url({ url: evil }, PORTAL)).resolves.toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })

  it('never signs another project’s object when the target is known', async () => {
    const cache = recordingCache()
    const access = createClientAttachmentAccess({}, { cache })
    await expect(access.url({ url: GOOD_URL }, OTHER)).resolves.toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })

  it('never signs a key with dot segments', async () => {
    const cache = recordingCache()
    const access = createClientAttachmentAccess({}, { cache })
    await expect(
      access.url({ path: `${PORTAL}/../${OTHER}/x.png` }, PORTAL)
    ).resolves.toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })

  it('never signs junk', async () => {
    const cache = recordingCache()
    const access = createClientAttachmentAccess({}, { cache })
    for (const file of [null, {}, { url: 'javascript:alert(1)' }, { url: '' }]) {
      await expect(access.url(file, PORTAL)).resolves.toBeNull()
    }
    expect(cache.get).not.toHaveBeenCalled()
  })
})

describe('when signing itself fails', () => {
  it('returns null rather than a broken URL', async () => {
    /* The designer sees the filename instead of an empty rectangle. An
       `<img>` on a dead URL renders nothing and is indistinguishable from an
       upload that never finished — a distinction this repo has already
       decided must never blur. */
    const cache = { get: vi.fn(async () => null), forget: vi.fn(), clear: vi.fn() }
    const access = createClientAttachmentAccess({}, { cache })
    await expect(access.url({ url: GOOD_URL }, PORTAL)).resolves.toBeNull()
    expect(cache.get).toHaveBeenCalledWith(OBJECT)
  })
})

describe('with no cloud configured', () => {
  it('signs nothing, because no key can be validated', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    const cache = recordingCache()
    const access = createClientAttachmentAccess(null, { cache })
    await expect(access.url({ url: GOOD_URL }, PORTAL)).resolves.toBeNull()
    expect(cache.get).not.toHaveBeenCalled()
  })
})

describe('the real signer talks to the private bucket', () => {
  it('asks Supabase Storage to sign, and never builds a public URL', async () => {
    const createSignedUrl = vi.fn(async () => ({
      data: { signedUrl: 'https://signed.example/real' },
      error: null,
    }))
    const getPublicUrl = vi.fn()
    const client = { storage: { from: vi.fn(() => ({ createSignedUrl, getPublicUrl })) } }

    const access = createClientAttachmentAccess(client)
    await expect(access.url({ url: GOOD_URL }, PORTAL)).resolves.toBe(
      'https://signed.example/real'
    )
    expect(client.storage.from).toHaveBeenCalledWith('client-uploads')
    expect(createSignedUrl).toHaveBeenCalledWith(OBJECT, 3600)
    /* The whole point of the private bucket: nothing here may fall back to a
       permanent public URL when signing is available. */
    expect(getPublicUrl).not.toHaveBeenCalled()
  })

  it('surfaces a storage error as null', async () => {
    const client = {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: null, error: { message: 'denied' } }),
        }),
      },
    }
    const access = createClientAttachmentAccess(client)
    await expect(access.url({ url: GOOD_URL }, PORTAL)).resolves.toBeNull()
  })
})
