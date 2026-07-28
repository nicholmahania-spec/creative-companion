import { afterEach, describe, expect, it } from 'vitest'
import {
  handleXaiProxy,
  isOriginAllowed,
  isProductionDeploy,
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
