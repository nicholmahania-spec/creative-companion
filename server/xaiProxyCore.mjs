/**
 * Shared xAI chat proxy core for Netlify + Vercel.
 * Client POSTs OpenAI-compatible body; server injects XAI_API_KEY.
 *
 * Guards: production secret, origin allowlist, model allowlist,
 * rate limit (best-effort in-memory), max_tokens / body caps.
 */

const XAI_URL = 'https://api.x.ai/v1/chat/completions'
const MAX_TOKENS_CAP = 512
const MAX_MESSAGES = 24
const MAX_BODY_CHARS = 48_000
const RATE_WINDOW_MS = 60_000
const RATE_MAX_DEFAULT = 20
const RATE_MAX_OPEN = 8

/** Only these models may be requested — no client free-choice spend. */
const ALLOWED_MODELS = new Set([
  'grok-4.5',
  'grok-4',
  'grok-3',
  'grok-3-mini',
  'grok-2',
  'grok-2-latest',
])

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateBuckets = new Map()

export function isProductionDeploy() {
  const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase()
  if (vercelEnv === 'production') return true
  if (String(process.env.XAI_PROXY_REQUIRE_SECRET || '').trim() === 'true') {
    return true
  }
  // Netlify
  const ctx = String(process.env.CONTEXT || '').toLowerCase()
  if (ctx === 'production') return true
  // Preview / branch deploys: require secret when API key is present
  // unless explicitly disabled.
  if (
    process.env.XAI_API_KEY &&
    String(process.env.XAI_PROXY_REQUIRE_SECRET || '').toLowerCase() !==
      'false' &&
    (ctx === 'deploy-preview' ||
      ctx === 'branch-deploy' ||
      ctx === 'production' ||
      vercelEnv === 'preview' ||
      vercelEnv === 'production')
  ) {
    return true
  }
  return false
}

function headerGet(headers, name) {
  if (!headers) return ''
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(headers)) {
    if (String(k).toLowerCase() === lower) {
      return Array.isArray(v) ? String(v[0] || '') : String(v || '')
    }
  }
  return ''
}

export function clientIpFromHeaders(headers) {
  const fwd = headerGet(headers, 'x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim() || 'unknown'
  return (
    headerGet(headers, 'x-real-ip') ||
    headerGet(headers, 'client-ip') ||
    'unknown'
  )
}

function rateLimit(ip, max) {
  const now = Date.now()
  let b = rateBuckets.get(ip)
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + RATE_WINDOW_MS }
    rateBuckets.set(ip, b)
  }
  b.count += 1
  if (rateBuckets.size > 2000) {
    for (const [k, v] of rateBuckets) {
      if (now >= v.resetAt) rateBuckets.delete(k)
    }
  }
  return b.count <= max
}

function siteUrls() {
  const urls = []
  const push = (u) => {
    if (!u) return
    const s = String(u).trim().replace(/\/$/, '')
    if (!s) return
    if (s.startsWith('http')) urls.push(s)
    else urls.push(`https://${s}`)
  }
  push(process.env.URL)
  push(process.env.DEPLOY_PRIME_URL)
  push(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  push(process.env.VERCEL_URL)
  push(process.env.VERCEL_BRANCH_URL)
  return urls
}

export function isOriginAllowed(origin) {
  if (!origin) return false
  const raw = (process.env.XAI_PROXY_ORIGINS || '').trim()
  if (!raw) {
    for (const site of siteUrls()) {
      if (origin === site || origin.startsWith(site)) return true
    }
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return true
    }
    return false
  }
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return list.some(
    (o) => origin === o || origin.startsWith(o.replace(/\/$/, ''))
  )
}

function corsHeaders(origin) {
  const allow =
    origin && isOriginAllowed(origin)
      ? origin
      : siteUrls()[0] || ''
  return {
    'Access-Control-Allow-Origin': allow || 'null',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-CC-Proxy-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function proxySecretOk(headers) {
  const secret = (process.env.XAI_PROXY_SECRET || '').trim()
  const requireSecret = isProductionDeploy() || Boolean(secret)
  if (!secret) {
    return { required: requireSecret, ok: !requireSecret }
  }
  const auth = headerGet(headers, 'authorization')
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const headerKey = headerGet(headers, 'x-cc-proxy-key')
  const ok = bearer === secret || headerKey === secret
  return { required: true, ok }
}

function pickModel(requested) {
  const m = String(requested || 'grok-4.5').trim()
  if (ALLOWED_MODELS.has(m)) return m
  return 'grok-4.5'
}

/**
 * @param {{ method: string, headers: Record<string, string|string[]|undefined>, body: string, ip?: string }} req
 * @returns {Promise<{ statusCode: number, headers: Record<string, string>, body: string }>}
 */
export async function handleXaiProxy(req) {
  const method = String(req.method || 'GET').toUpperCase()
  const headers = req.headers || {}
  const origin = headerGet(headers, 'origin')
  const cors = corsHeaders(origin)
  const jsonHeaders = { ...cors, 'Content-Type': 'application/json' }

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' }
  }
  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'POST only' }),
    }
  }

  const secretCheck = proxySecretOk(headers)
  if (secretCheck.required && !secretCheck.ok) {
    return {
      statusCode: 401,
      headers: jsonHeaders,
      body: JSON.stringify({
        error:
          secretCheck.required &&
          !(process.env.XAI_PROXY_SECRET || '').trim()
            ? 'XAI_PROXY_SECRET required in production'
            : 'Unauthorized',
      }),
    }
  }

  if (!origin) {
    if (!secretCheck.required || !secretCheck.ok) {
      return {
        statusCode: 403,
        headers: jsonHeaders,
        body: JSON.stringify({ error: 'Origin required (or proxy secret)' }),
      }
    }
  } else if (!isOriginAllowed(origin)) {
    return {
      statusCode: 403,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    }
  }

  const ip = req.ip || clientIpFromHeaders(headers)
  const max =
    secretCheck.required && secretCheck.ok ? RATE_MAX_DEFAULT : RATE_MAX_OPEN
  if (!rateLimit(ip, max)) {
    return {
      statusCode: 429,
      headers: { ...jsonHeaders, 'Retry-After': '60' },
      body: JSON.stringify({ error: 'Rate limit exceeded' }),
    }
  }

  const key = (process.env.XAI_API_KEY || '').trim()
  if (!key) {
    return {
      statusCode: 503,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'XAI_API_KEY not configured on server' }),
    }
  }

  const rawBody = typeof req.body === 'string' ? req.body : ''
  if (rawBody.length > MAX_BODY_CHARS) {
    return {
      statusCode: 413,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Body too large' }),
    }
  }

  let body
  try {
    body = JSON.parse(rawBody || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(0, MAX_MESSAGES)
    : []
  if (!messages.length) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: 'messages required' }),
    }
  }

  const maxTokens = Math.min(
    Math.max(1, Number(body.max_tokens) || 320),
    MAX_TOKENS_CAP
  )
  const model = pickModel(body.model)

  try {
    const res = await fetch(XAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: body.temperature ?? 0.55,
        max_tokens: maxTokens,
        messages,
      }),
    })
    const text = await res.text()
    return {
      statusCode: res.status,
      headers: jsonHeaders,
      body: text,
    }
  } catch (e) {
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({ error: e?.message || 'Proxy failed' }),
    }
  }
}
