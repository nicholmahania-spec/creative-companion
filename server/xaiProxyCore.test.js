import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  handleXaiProxy,
  isOriginAllowed,
  isProductionDeploy,
  sessionAuthConfigured,
  verifySupabaseSession,
} from './xaiProxyCore.mjs'

const prev = { ...process.env }

afterEach(() => {
  for (const k of Object.keys(process.env)) {
    if (!(k in prev)) delete process.env[k]
  }
  Object.assign(process.env, prev)
  delete process.env.XAI_API_KEY
  delete process.env.XAI_PROXY_SECRET
  delete process.env.XAI_PROXY_REQUIRE_SECRET
  delete process.env.XAI_PROXY_ORIGINS
  delete process.env.VERCEL_ENV
  delete process.env.CONTEXT
  delete process.env.VERCEL_URL
  delete process.env.URL
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_ANON_KEY
})

/**
 * Session auth replaced a shared secret the browser carried in its own bundle.
 * These lock the two properties that made the swap worth doing: an unverifiable
 * caller is refused, and the refusal happens without the browser holding any
 * long-lived credential at all.
 */
describe('xaiProxyCore session auth', () => {
  const enable = () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
  }

  it('is off unless both server-side Supabase vars are set', () => {
    expect(sessionAuthConfigured()).toBe(false)
    process.env.SUPABASE_URL = 'https://proj.supabase.co'
    expect(sessionAuthConfigured()).toBe(false)
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    expect(sessionAuthConfigured()).toBe(true)
  })

  it('accepts a token Supabase confirms', async () => {
    enable()
    const fetchImpl = vi.fn(async () => ({ status: 200 }))
    const r = await verifySupabaseSession(
      { authorization: 'Bearer good-token' },
      fetchImpl
    )
    expect(r).toEqual({ configured: true, ok: true })
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://proj.supabase.co/auth/v1/user')
    expect(opts.headers.Authorization).toBe('Bearer good-token')
  })

  it('rejects a token Supabase does not confirm', async () => {
    enable()
    const r = await verifySupabaseSession(
      { authorization: 'Bearer forged' },
      async () => ({ status: 401 })
    )
    expect(r.ok).toBe(false)
  })

  it('rejects a request carrying no token at all', async () => {
    enable()
    const r = await verifySupabaseSession({}, async () => ({ status: 200 }))
    expect(r.ok).toBe(false)
  })

  /* Fail closed. An unreachable auth service means we cannot say who this is,
     and guessing "probably fine" spends someone else's money. */
  it('fails closed when the auth service is unreachable', async () => {
    enable()
    const r = await verifySupabaseSession(
      { authorization: 'Bearer good-token' },
      async () => {
        throw new Error('network down')
      }
    )
    expect(r).toEqual({ configured: true, ok: false })
  })

  it('answers 401 to an unauthenticated proxy call once session auth is on', async () => {
    enable()
    process.env.XAI_API_KEY = 'server-key'
    const r = await handleXaiProxy({
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(r.statusCode).toBe(401)
    expect(JSON.parse(r.body).error).toMatch(/sign in/i)
  })

  /* The old shared secret must not be a way back in once real auth is on —
     otherwise the bundle-readable value still works and nothing changed. */
  it('does not accept the old proxy secret when session auth is on', async () => {
    enable()
    process.env.XAI_API_KEY = 'server-key'
    process.env.XAI_PROXY_SECRET = 'shared-secret'
    const r = await handleXaiProxy({
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
        'x-cc-proxy-key': 'shared-secret',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    })
    expect(r.statusCode).toBe(401)
  })
})

describe('xaiProxyCore', () => {
  it('OPTIONS returns 204', async () => {
    const r = await handleXaiProxy({
      method: 'OPTIONS',
      headers: { origin: 'http://localhost:5173' },
      body: '',
    })
    expect(r.statusCode).toBe(204)
  })

  it('rejects GET', async () => {
    const r = await handleXaiProxy({
      method: 'GET',
      headers: { origin: 'http://localhost:5173' },
      body: '',
    })
    expect(r.statusCode).toBe(405)
  })

  it('rejects missing messages', async () => {
    process.env.XAI_PROXY_REQUIRE_SECRET = 'false'
    delete process.env.VERCEL_ENV
    delete process.env.CONTEXT
    process.env.XAI_API_KEY = 'test-key'
    const r = await handleXaiProxy({
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      body: JSON.stringify({ model: 'grok-4.5' }),
    })
    expect(r.statusCode).toBe(400)
    expect(r.body).toMatch(/messages/)
  })

  it('requires secret in production when key present', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.XAI_API_KEY = 'test-key'
    delete process.env.XAI_PROXY_SECRET
    expect(isProductionDeploy()).toBe(true)
    const r = await handleXaiProxy({
      method: 'POST',
      headers: {
        origin: 'https://creative-companion-ten.vercel.app',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    expect(r.statusCode).toBe(401)
  })

  it('allows vercel production URL as origin when listed via VERCEL_URL', () => {
    process.env.VERCEL_URL = 'creative-companion-ten.vercel.app'
    expect(
      isOriginAllowed('https://creative-companion-ten.vercel.app')
    ).toBe(true)
  })
})
